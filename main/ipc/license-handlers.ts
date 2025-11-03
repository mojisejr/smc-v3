import { ipcMain } from "electron";
import { licenseValidator, LicenseActivationResult, LicenseValidationResult } from "../license/license-validator";
import { esp32Communicator } from "../esp32/esp32-communicator";
import { License } from "../../db/model/license.model";

/**
 * Register license activation IPC handler
 * Handles license key activation with real-time MAC validation
 */
export function registerLicenseActivationHandler(): void {
  ipcMain.handle("license:activate", async (event, payload: { key: string }) => {
    try {
      if (!payload || !payload.key) {
        return {
          success: false,
          message: "License key is required"
        };
      }

      const result: LicenseActivationResult = await licenseValidator.activateLicense(payload.key.trim());

      return result;

    } catch (error: any) {
      console.error("License activation handler error:", error);
      return {
        success: false,
        message: `License activation failed: ${error.message}`
      };
    }
  });
}

/**
 * Register license validation IPC handler
 * Handles license validation for startup and periodic checks
 */
export function registerLicenseValidationHandler(): void {
  ipcMain.handle("license:validate", async () => {
    try {
      const result: LicenseValidationResult = await licenseValidator.validateLicense();

      return result;

    } catch (error: any) {
      console.error("License validation handler error:", error);
      return {
        isValid: false,
        error: `License validation failed: ${error.message}`
      };
    }
  });
}

/**
 * Register license deactivation IPC handler
 * Handles license deactivation for license management
 */
export function registerLicenseDeactivationHandler(): void {
  ipcMain.handle("license:deactivate", async () => {
    try {
      const success = await licenseValidator.deactivateLicense();

      return {
        success,
        message: success ? "License deactivated successfully" : "No active license found"
      };

    } catch (error: any) {
      console.error("License deactivation handler error:", error);
      return {
        success: false,
        message: `License deactivation failed: ${error.message}`
      };
    }
  });
}

/**
 * Register ESP32 device info IPC handler
 * Retrieves device information for license binding validation
 */
export function registerESP32InfoHandler(): void {
  ipcMain.handle("esp32:get-info", async () => {
    try {
      const deviceInfo = await esp32Communicator.getDeviceInfo();

      return {
        success: true,
        deviceInfo
      };

    } catch (error: any) {
      console.error("ESP32 info handler error:", error);
      return {
        success: false,
        error: `Failed to get ESP32 device info: ${error.message}`
      };
    }
  });
}

/**
 * Register ESP32 connection test IPC handler
 * Tests connectivity to ESP32 device
 */
export function registerESP32TestConnectionHandler(): void {
  ipcMain.handle("esp32:test-connection", async () => {
    try {
      const testResult = await esp32Communicator.testConnection();

      return testResult;

    } catch (error: any) {
      console.error("ESP32 test connection handler error:", error);
      return {
        success: false,
        error: `Connection test failed: ${error.message}`
      };
    }
  });
}

/**
 * Register license status IPC handler
 * Returns current license status without full validation
 */
export function registerLicenseStatusHandler(): void {
  ipcMain.handle("license:status", async () => {
    try {
      const license = await License.findOne({
        where: { is_active: true }
      });

      if (!license) {
        return {
          isActive: false,
          message: "No active license"
        };
      }

      return {
        isActive: true,
        expiresAt: license.getDataValue('expires_at'),
        createdAt: license.getDataValue('created_at'),
        updatedAt: license.getDataValue('updated_at'),
        message: "License is active"
      };

    } catch (error: any) {
      console.error("License status handler error:", error);
      return {
        isActive: false,
        error: `Failed to get license status: ${error.message}`
      };
    }
  });
}

/**
 * Register all license-related IPC handlers
 * Convenience function to register all license handlers at once
 */
export function registerAllLicenseHandlers(): void {
  registerLicenseActivationHandler();
  registerLicenseValidationHandler();
  registerLicenseDeactivationHandler();
  registerESP32InfoHandler();
  registerESP32TestConnectionHandler();
  registerLicenseStatusHandler();

  console.log("License IPC handlers registered successfully");
}