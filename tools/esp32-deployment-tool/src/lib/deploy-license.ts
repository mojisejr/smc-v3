import fs from "fs";
import path from "path";
import os from "os";
import { generateLicense } from "./license";
import { getPrivateKey } from "./keyloader";
import { ExportData } from "./export";
import { CSVExporter, CSVExportResult } from "./csv-export";

/**
 * License file generation result
 */
export interface LicenseGenerationResult {
  success: boolean;
  licenseFilePath?: string;
  licenseFileName?: string;
  licenseToken?: string;
  csvResult?: CSVExportResult;
  error?: string;
}

/**
 * Generate and export license file with CSV update
 *
 * This function:
 * 1. Validates input (MAC address required)
 * 2. Generates license token using existing generateLicense()
 * 3. Writes license file to export directory
 * 4. Updates CSV with license status and file path
 *
 * @param data - Export data containing customer and device information
 * @returns License generation result with file path and CSV status
 */
export async function generateAndExportLicense(
  data: ExportData
): Promise<LicenseGenerationResult> {
  try {
    console.log("info: Starting license generation process...");

    // Validate MAC address
    const macAddress = data.esp32.macAddress;
    if (!macAddress || macAddress.trim() === "") {
      return {
        success: false,
        error: "MAC address is required for license generation",
      };
    }

    // Validate MAC address format (basic check)
    const macPattern = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
    if (!macPattern.test(macAddress)) {
      return {
        success: false,
        error: `Invalid MAC address format: ${macAddress}. Expected format: XX:XX:XX:XX:XX:XX`,
      };
    }

    // Check if private key is available
    try {
      getPrivateKey();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: `License private key not available: ${errorMessage}`,
      };
    }

    // Determine expiry date
    let expiryDate: string;
    if (data.customer.noExpiry) {
      // No expiry - set to 100 years in the future
      const farFuture = new Date();
      farFuture.setFullYear(farFuture.getFullYear() + 100);
      expiryDate = farFuture.toISOString();
    } else {
      // Use customer-specified expiry or default to 1 year
      if (data.customer.expiryDate) {
        const parsedDate = new Date(data.customer.expiryDate);
        expiryDate = parsedDate.toISOString();
      } else {
        const oneYear = new Date();
        oneYear.setFullYear(oneYear.getFullYear() + 1);
        expiryDate = oneYear.toISOString();
      }
    }

    console.log(
      `info: Generating license for MAC: ${macAddress}, Expiry: ${expiryDate}`
    );

    // Generate license token
    const licenseToken = await generateLicense({
      mac: macAddress,
      expiry: expiryDate,
      customer: `${data.customer.organization}:${data.customer.customerId}`,
    });

    console.log(
      `info: License token generated (length: ${licenseToken.length})`
    );

    // Create filename: license_YYYY-MM-DD_MACPART.pem
    const today = new Date().toISOString().split("T")[0];
    const macPart = macAddress.replace(/:/g, "").substring(0, 6).toLowerCase();
    const licenseFileName = `license_${today}_${macPart}.pem`;

    // Container-aware path selection (same as JSON/CSV exporters)
    const isContainer = !!process.env.DOCKER_CONTAINER;
    let exportPath: string;

    if (isContainer) {
      exportPath = path.join(process.cwd(), "exports");
      console.log("info: Using container export path for license:", exportPath);
    } else {
      exportPath = path.join(os.homedir(), "Desktop", "esp32-exports");
      console.log(
        "info: Using local Desktop export path for license:",
        exportPath
      );
    }

    // Ensure export directory exists
    await fs.promises.mkdir(exportPath, { recursive: true });

    const licenseFilePath = path.join(exportPath, licenseFileName);

    // Write license file
    await fs.promises.writeFile(licenseFilePath, licenseToken, {
      encoding: "utf8",
    });

    console.log(`info: License file written: ${licenseFilePath}`);

    // Update CSV with license information
    const csvData = {
      timestamp: data.deployment.timestamp,
      organization: data.customer.organization,
      customer_id: data.customer.customerId,
      application_name: data.customer.applicationName,
      wifi_ssid: data.wifi.ssid,
      wifi_password: data.wifi.password,
      mac_address: macAddress,
      ip_address: data.esp32.ipAddress,
      expiry_date: data.customer.noExpiry
        ? ""
        : data.customer.expiryDate ||
          new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
      license_status: "completed" as const,
      license_file: licenseFileName,
      notes: data.customer.noExpiry ? "No expiry (permanent license)" : "",
    };

    // Export to CSV using the formatDataAsCSVRow method
    const csvRow = CSVExporter.formatDataAsCSVRow(csvData);

    // Get CSV file path
    const csvFileName = `esp32-deployments-${today}.csv`;
    const csvFilePath = path.join(exportPath, csvFileName);

    // Check if CSV file exists
    const csvExists = await fs.promises
      .access(csvFilePath)
      .then(() => true)
      .catch(() => false);

    let csvContent: string;
    let rowsTotal = 1;

    if (!csvExists) {
      // New file: add header
      const csvHeader =
        "timestamp,organization,customer_id,application_name,wifi_ssid,wifi_password,mac_address,ip_address,expiry_date,license_status,license_file,notes";
      csvContent = csvHeader + "\n" + csvRow + "\n";
      console.log("info: Creating new CSV file with license data");
    } else {
      // Existing file: append
      csvContent = csvRow + "\n";

      // Count existing rows
      try {
        const existingContent = await fs.promises.readFile(csvFilePath, "utf8");
        const existingRows = existingContent
          .split("\n")
          .filter((line) => line.trim() !== "");
        rowsTotal = existingRows.length;
        console.log(
          `info: Appending to existing CSV file (${
            existingRows.length - 1
          } data rows + header)`
        );
      } catch {
        console.log("warn: Could not count existing CSV rows");
      }
    }

    // Write CSV file
    await fs.promises.writeFile(csvFilePath, csvContent, {
      flag: csvExists ? "a" : "w",
      encoding: "utf8",
    });

    const csvResult: CSVExportResult = {
      success: true,
      filePath: csvFilePath,
      filename: csvFileName,
      isNewFile: !csvExists,
      rowsTotal,
    };

    console.log("info: License generation and export completed successfully");

    return {
      success: true,
      licenseFilePath,
      licenseFileName,
      licenseToken,
      csvResult,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("error: License generation failed:", errorMessage);

    return {
      success: false,
      error: errorMessage,
    };
  }
}

// Re-export maskLicenseToken from license-utils for convenience
export { maskLicenseToken } from './license-utils';
