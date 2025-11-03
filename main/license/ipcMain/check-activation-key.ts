import { ipcMain } from "electron";
import { licenseValidator } from "../../license/license-validator";

export const checkActivationKeyHandler = async () => {
  ipcMain.handle("check-activation-key", async () => {
    try {
      // Use new license validator but return boolean for frontend compatibility
      const result = await licenseValidator.validateLicense();
      return result.isValid;
    } catch (error: any) {
      console.error("License validation error:", error);
      return false;
    }
  });
};
