import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";
import { join } from "path";
import { mkdtempSync, rmSync, readFileSync, existsSync } from "fs";
import { tmpdir } from "os";
import {
  generateAndExportLicense,
  LicenseGenerationResult,
} from "../deploy-license";
import { maskLicenseToken } from "../license-utils";
import { clearCache } from "../keyloader";
import { ExportData } from "../export";

describe("Deploy License - License Generation and Export", () => {
  const fixturesPath = join(__dirname, "fixtures");
  const testPrivateKeyPath = join(fixturesPath, "test_private.pem");

  let originalEnv: {
    LIC_PRIVATE_KEY_PATH?: string;
    DOCKER_CONTAINER?: string;
  };
  let testExportDir: string;

  beforeEach(() => {
    // Save original env
    originalEnv = {
      LIC_PRIVATE_KEY_PATH: process.env.LIC_PRIVATE_KEY_PATH,
      DOCKER_CONTAINER: process.env.DOCKER_CONTAINER,
    };

    // Set test key path
    process.env.LIC_PRIVATE_KEY_PATH = testPrivateKeyPath;
    delete process.env.DOCKER_CONTAINER; // Test in non-container mode

    // Create temporary export directory
    testExportDir = mkdtempSync(join(tmpdir(), "license-test-"));

    // Mock Desktop path for tests
    jest.spyOn(require("os"), "homedir").mockReturnValue(testExportDir);

    // Clear cache
    clearCache();
  });

  afterEach(() => {
    // Restore original env
    if (originalEnv.LIC_PRIVATE_KEY_PATH) {
      process.env.LIC_PRIVATE_KEY_PATH = originalEnv.LIC_PRIVATE_KEY_PATH;
    } else {
      delete process.env.LIC_PRIVATE_KEY_PATH;
    }

    if (originalEnv.DOCKER_CONTAINER) {
      process.env.DOCKER_CONTAINER = originalEnv.DOCKER_CONTAINER;
    } else {
      delete process.env.DOCKER_CONTAINER;
    }

    // Clean up test directory
    if (testExportDir && existsSync(testExportDir)) {
      rmSync(testExportDir, { recursive: true, force: true });
    }

    // Restore mocks
    jest.restoreAllMocks();
    clearCache();
  });

  describe("generateAndExportLicense - Happy Path", () => {
    it("should successfully generate license and export files", async () => {
      const testData: ExportData = {
        customer: {
          organization: "TEST_ORG",
          customerId: "CUST001",
          applicationName: "Test App",
          expiryDate: "2026-12-31",
          noExpiry: false,
        },
        wifi: {
          ssid: "TEST_WIFI",
          password: "password123",
        },
        esp32: {
          macAddress: "d0:cf:13:16:21:28",
          ipAddress: "192.168.4.1",
        },
        deployment: {
          timestamp: new Date().toISOString(),
          toolVersion: "1.0.0",
        },
      };

      const result = await generateAndExportLicense(testData);

      // Check result success
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();

      // Check license token
      expect(result.licenseToken).toBeDefined();
      expect(typeof result.licenseToken).toBe("string");
      expect(result.licenseToken!.split(".")).toHaveLength(2);

      // Check license file
      expect(result.licenseFileName).toBeDefined();
      expect(result.licenseFileName).toMatch(
        /^license_\d{4}-\d{2}-\d{2}_[a-f0-9]{6}\.pem$/
      );
      expect(result.licenseFilePath).toBeDefined();

      // Check CSV result
      expect(result.csvResult).toBeDefined();
      expect(result.csvResult!.success).toBe(true);
      expect(result.csvResult!.filename).toMatch(
        /^esp32-deployments-\d{4}-\d{2}-\d{2}\.csv$/
      );

      // Verify license file exists and contains token
      if (result.licenseFilePath && existsSync(result.licenseFilePath)) {
        const fileContent = readFileSync(result.licenseFilePath, "utf8");
        expect(fileContent).toBe(result.licenseToken);
      }
    });

    it("should handle permanent license (noExpiry=true)", async () => {
      const testData: ExportData = {
        customer: {
          organization: "TEST_ORG",
          customerId: "CUST002",
          applicationName: "Permanent App",
          expiryDate: "",
          noExpiry: true,
        },
        wifi: {
          ssid: "TEST_WIFI",
          password: "password123",
        },
        esp32: {
          macAddress: "aa:bb:cc:dd:ee:ff",
          ipAddress: "192.168.4.1",
        },
        deployment: {
          timestamp: new Date().toISOString(),
          toolVersion: "1.0.0",
        },
      };

      const result = await generateAndExportLicense(testData);

      expect(result.success).toBe(true);
      expect(result.licenseToken).toBeDefined();
      expect(result.csvResult).toBeDefined();

      // Verify CSV contains permanent license note
      if (result.csvResult?.filePath && existsSync(result.csvResult.filePath)) {
        const csvContent = readFileSync(result.csvResult.filePath, "utf8");
        expect(csvContent).toContain("No expiry (permanent license)");
      }
    });
  });

  describe("generateAndExportLicense - Error Cases", () => {
    it("should fail when MAC address is missing", async () => {
      const testData: ExportData = {
        customer: {
          organization: "TEST_ORG",
          customerId: "CUST003",
          applicationName: "Test App",
          expiryDate: "2026-12-31",
          noExpiry: false,
        },
        wifi: {
          ssid: "TEST_WIFI",
          password: "password123",
        },
        esp32: {
          macAddress: "", // Empty MAC
          ipAddress: "192.168.4.1",
        },
        deployment: {
          timestamp: new Date().toISOString(),
          toolVersion: "1.0.0",
        },
      };

      const result = await generateAndExportLicense(testData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("MAC address is required");
    });

    it("should fail when MAC address format is invalid", async () => {
      const testData: ExportData = {
        customer: {
          organization: "TEST_ORG",
          customerId: "CUST004",
          applicationName: "Test App",
          expiryDate: "2026-12-31",
          noExpiry: false,
        },
        wifi: {
          ssid: "TEST_WIFI",
          password: "password123",
        },
        esp32: {
          macAddress: "invalid-mac-format",
          ipAddress: "192.168.4.1",
        },
        deployment: {
          timestamp: new Date().toISOString(),
          toolVersion: "1.0.0",
        },
      };

      const result = await generateAndExportLicense(testData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid MAC address format");
    });

    it("should fail when private key is not available", async () => {
      // Remove private key path
      delete process.env.LIC_PRIVATE_KEY_PATH;
      clearCache();

      const testData: ExportData = {
        customer: {
          organization: "TEST_ORG",
          customerId: "CUST005",
          applicationName: "Test App",
          expiryDate: "2026-12-31",
          noExpiry: false,
        },
        wifi: {
          ssid: "TEST_WIFI",
          password: "password123",
        },
        esp32: {
          macAddress: "d0:cf:13:16:21:28",
          ipAddress: "192.168.4.1",
        },
        deployment: {
          timestamp: new Date().toISOString(),
          toolVersion: "1.0.0",
        },
      };

      const result = await generateAndExportLicense(testData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("License private key not available");
      expect(result.error).toContain("LIC_PRIVATE_KEY_PATH");
    });

    it("should handle invalid private key path", async () => {
      // Set invalid path
      process.env.LIC_PRIVATE_KEY_PATH = "/invalid/path/to/key.pem";
      clearCache();

      const testData: ExportData = {
        customer: {
          organization: "TEST_ORG",
          customerId: "CUST006",
          applicationName: "Test App",
          expiryDate: "2026-12-31",
          noExpiry: false,
        },
        wifi: {
          ssid: "TEST_WIFI",
          password: "password123",
        },
        esp32: {
          macAddress: "d0:cf:13:16:21:28",
          ipAddress: "192.168.4.1",
        },
        deployment: {
          timestamp: new Date().toISOString(),
          toolVersion: "1.0.0",
        },
      };

      const result = await generateAndExportLicense(testData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("License private key not available");
    });
  });

  describe("maskLicenseToken", () => {
    it("should mask long tokens correctly", () => {
      const token =
        "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0";
      const masked = maskLicenseToken(token);

      // Should show first 4 chars
      expect(masked).toContain("eyJh");
      // Should show last 4 chars
      expect(masked).toContain("lIn0");
      // Should contain asterisks for masking
      expect(masked).toContain("*");
      // Masked version should be shorter due to fixed middle length
      expect(masked.length).toBeLessThanOrEqual(token.length);
    });

    it("should handle short tokens", () => {
      const shortToken = "abc";
      const masked = maskLicenseToken(shortToken);

      expect(masked).toBe("****");
    });

    it("should handle empty tokens", () => {
      const masked = maskLicenseToken("");
      expect(masked).toBe("****");
    });

    it("should handle medium length tokens", () => {
      const token = "abcdefghijk"; // 11 chars
      const masked = maskLicenseToken(token);

      expect(masked).toContain("abcd");
      expect(masked).toContain("ijk");
      expect(masked).toContain("*");
    });
  });

  describe("CSV Export Integration", () => {
    it("should create new CSV file with header on first export", async () => {
      const testData: ExportData = {
        customer: {
          organization: "TEST_ORG",
          customerId: "CUST007",
          applicationName: "Test App",
          expiryDate: "2026-12-31",
          noExpiry: false,
        },
        wifi: {
          ssid: "TEST_WIFI",
          password: "password123",
        },
        esp32: {
          macAddress: "11:22:33:44:55:66",
          ipAddress: "192.168.4.1",
        },
        deployment: {
          timestamp: new Date().toISOString(),
          toolVersion: "1.0.0",
        },
      };

      const result = await generateAndExportLicense(testData);

      expect(result.success).toBe(true);
      expect(result.csvResult).toBeDefined();

      // Check CSV file
      if (result.csvResult?.filePath && existsSync(result.csvResult.filePath)) {
        const csvContent = readFileSync(result.csvResult.filePath, "utf8");
        const lines = csvContent.split("\n").filter((l) => l.trim());

        // Should have header + 1 data row
        expect(lines.length).toBeGreaterThanOrEqual(2);
        expect(lines[0]).toContain("timestamp");
        expect(lines[0]).toContain("license_status");
        expect(lines[0]).toContain("license_file");

        // Data row should contain completed status
        expect(csvContent).toContain("completed");
        expect(csvContent).toContain(result.licenseFileName || "");
      }
    });
  });
});
