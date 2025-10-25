import { ipcMain } from "electron";
import { CU12Controller } from "..";
import { logger } from "../../logger";

export const resetHandler = (cu12: CU12Controller) => {
  ipcMain.handle("reset", async (event, payload) => {
    try {
      const slotId = payload.slotId;

      await cu12.resetSlot(slotId);
      await logger({
        user: "system",
        message: `reset: slot #${slotId} reset successfully`,
      });

      return {
        success: true,
        slotId: slotId,
        message: "Slot reset successfully"
      };
    } catch (error) {
      await logger({
        user: "system",
        message: `reset: error resetting slot #${payload.slotId} - ${error.message}`,
      });

      return {
        success: false,
        slotId: payload.slotId,
        message: "Slot reset failed",
        error: error.message
      };
    }
  });
};