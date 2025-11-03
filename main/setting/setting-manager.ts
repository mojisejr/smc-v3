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
        isActive: dbLicense.getDataValue('is_active'),
        expiresAt: dbLicense.getDataValue('expires_at'),
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
   * This method implements force reset migration to new license system
   */
  async syncWithLicenseSystem(): Promise<void> {
    try {
      // Get current settings
      const settings = await this.getSetting();

      // Force reset approach: clear legacy activated_key if it exists
      if (settings.activated_key) {
        console.log("Clearing legacy activated_key for force reset migration...");
        await this.clearLegacyLicense();
      }

      console.log("License system sync completed - using new PEM license system exclusively");

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
   * Force reset approach: uses new PEM license system exclusively
   */
  async initializeLicenseSystem(): Promise<boolean> {
    try {
      console.log("Initializing license system (PEM + AES-256-GCM)...");

      // Force reset: clear legacy data and use new system exclusively
      await this.syncWithLicenseSystem();

      // Validate license using new PEM system
      const validation = await licenseValidator.validateLicense();

      if (validation.isValid) {
        console.log("License system initialized successfully - Valid PEM license");
        return true;
      } else {
        console.warn("License system initialized but no valid PEM license:", validation.error);
        console.log("Please activate a new PEM license key to continue using the system");
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