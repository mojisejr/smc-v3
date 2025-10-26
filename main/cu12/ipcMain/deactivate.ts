import { ipcMain } from "electron";
import { CU12Controller } from "..";
import { logger } from "../../logger";

export const deactiveHandler = (cu12: CU12Controller) => {
  ipcMain.handle("deactivate", async (event, payload) => {
    try {
      const slotId = payload.slotId;

      await cu12.deactivate(slotId);
      await logger({
        user: "system",
        message: `deactivate: slot #${slotId} deactivated successfully`,
      });

      return {
        success: true,
        slotId: slotId,
        message: "Slot deactivated successfully"
      };
    } catch (error) {
      await logger({
        user: "system",
        message: `deactivate: error deactivating slot #${payload.slotId} - ${error.message}`,
      });

      return {
        success: false,
        slotId: payload.slotId,
        message: "Slot deactivation failed",
        error: error.message
      };
    }
  });
};