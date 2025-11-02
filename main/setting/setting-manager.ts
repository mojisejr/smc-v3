import { Setting } from "../../db/model/setting.model";
import { License } from "../../db/model/license.model";
import { ISetting } from "../interfaces/setting";
import { licenseValidator } from "../license/license-validator";

export interface SettingManager {
  getSetting(): Promise<ISetting>;
  updateSetting(setting: Partial<ISetting>): Promise<Setting>;
  getLicenseStatus(): Promise<{
    isActive: boolean;
    expiresAt?: Date;
    hasValidLicense?: boolean;
    message: string;
  }>;
  syncWithLicenseSystem(): Promise<void>;
}

export class AppSettingManager implements SettingManager {
  /**
   * Get application settings
   * @returns Promise<ISetting> Application settings
   */
  async getSetting(): Promise<ISetting> {
    const settings = await Setting.findOne({ where: { id: 1 } });

    if (!settings) {
      throw new Error("Settings not found in database");
    }

    return settings.dataValues as ISetting;
  }

  /**
   * Update application settings
   * @param setting Partial settings to update
   * @returns Promise<Setting> Updated setting instance
   */
  async updateSetting(setting: Partial<ISetting>): Promise<Setting> {
    const settingInstance = await Setting.findOne({ where: { id: 1 } });

    if (!settingInstance) {
      throw new Error("Settings not found in database");
    }

    await settingInstance.update(setting, { where: { id: 1 } });
    return settingInstance;
  }

  /**
   * Get license status combined with validation
   * @returns Promise with license status information
   */
  async getLicenseStatus(): Promise<{
    isActive: boolean;
    expiresAt?: Date;
    hasValidLicense?: boolean;
    message: string;
  }> {
    try {
      // Check database license status
      const dbLicense = await License.findOne({
        where: { is_active: true }
      });

      if (!dbLicense) {
        return {
          isActive: false,
          message: "No active license found in database"
        };
      }

      // Validate license with real-time MAC checking
      const validationResult = await licenseValidator.validateLicense();

      return {
        isActive: dbLicense.is_active,
        expiresAt: dbLicense.expires_at,
        hasValidLicense: validationResult.isValid,
        message: validationResult.isValid ?
          "License is valid and active" :
          validationResult.error || "License validation failed"
      };

    } catch (error: any) {
      return {
        isActive: false,
        message: `Failed to get license status: ${error.message}`
      };
    }
  }

  /**
   * Sync settings with license system
   * This method ensures consistency between settings and license system
   */
  async syncWithLicenseSystem(): Promise<void> {
    try {
      // Get current settings
      const settings = await this.getSetting();

      // Get license information
      const licenseStatus = await this.getLicenseStatus();

      // If there's a legacy activated_key in settings but no modern license record,
      // migrate it (if it exists)
      if (settings.activated_key && !licenseStatus.isActive) {
        console.log("Detected legacy license key, attempting migration...");

        // Try to activate using the legacy key
        try {
          const result = await licenseValidator.activateLicense(settings.activated_key);
          if (result.success) {
            console.log("Legacy license key migrated successfully");
          } else {
            console.warn("Legacy license key migration failed:", result.message);
          }
        } catch (error: any) {
          console.error("License migration error:", error.message);
        }
      }

      console.log("License system sync completed");

    } catch (error: any) {
      console.error("License system sync failed:", error);
      throw error;
    }
  }

  /**
   * Clear legacy license information
   * This removes the old activated_key from settings after successful migration
   */
  async clearLegacyLicense(): Promise<void> {
    try {
      await this.updateSetting({ activated_key: null });
      console.log("Legacy license key cleared from settings");
    } catch (error: any) {
      console.error("Failed to clear legacy license:", error);
      throw error;
    }
  }

  /**
   * Initialize and validate license system on startup
   * This should be called during application startup
   */
  async initializeLicenseSystem(): Promise<boolean> {
    try {
      console.log("Initializing license system...");

      // Sync with license system
      await this.syncWithLicenseSystem();

      // Validate license
      const validation = await licenseValidator.validateLicense();

      if (validation.isValid) {
        console.log("License system initialized successfully - Valid license");
        return true;
      } else {
        console.warn("License system initialized but no valid license:", validation.error);
        return false;
      }

    } catch (error: any) {
      console.error("License system initialization failed:", error);
      return false;
    }
  }
}

// Export singleton instance
export const settingManager = new AppSettingManager();