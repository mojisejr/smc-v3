import { ipcMain } from "electron";
import { CU12Controller } from "..";
import { logger } from "../../logger";

export const checkLockedBackHandler = (cu12: CU12Controller) => {
  ipcMain.handle("check-locked-back", async (event, payload) => {
    try {
      const slotId = payload.slotId;
      await logger({
        user: "system",
        message: `checkLockedBack: checking slot #${slotId}`,
      });

      // Send status check to update current slot states
      cu12.sendCheckStateToAllBoards();

      // Emit init-res event to trigger frontend slot state refresh
      try {
        const slotData = await cu12.getCurrentSlotStates();
        cu12.win.webContents.send("init-res", slotData);
        await logger({
          user: "system",
          message: `checkLockedBack: emitted init-res event for slot #${slotId}`,
        });
      } catch (emitError) {
        await logger({
          user: "system",
          message: `checkLockedBack: failed to emit init-res event - ${emitError.message}`,
        });
      }

      return {
        success: true,
        slotId: slotId,
        message: "Slot lock back check initiated",
      };
    } catch (error) {
      await logger({
        user: "system",
        message: `checkLockedBack: error checking slot #${payload.slotId} - ${error.message}`,
      });

      return {
        success: false,
        slotId: payload.slotId,
        message: "Slot lock back check failed",
        error: error.message,
      };
    }
  });
};
