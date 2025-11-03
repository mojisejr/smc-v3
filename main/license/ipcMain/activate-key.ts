import { ipcMain } from "electron";
import { licenseValidator } from "../../license/license-validator";

export const activateKeyHandler = async () => {
  ipcMain.handle("activate-key", async (event, payload) => {
    try {
      const key = payload.key;

      // Use new license validator but return boolean for frontend compatibility
      const result = await licenseValidator.activateLicense(key);
      return result.success;
    } catch (error: any) {
      console.error("License activation error:", error);
      return false;
    }
  });
};
