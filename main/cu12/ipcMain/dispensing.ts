import { ipcMain } from "electron";
import { CU12Controller } from "..";
import { logDispensing, logger } from "../../logger";

export const dispenseHandler = (cu12: CU12Controller) => {
  ipcMain.handle("dispense", async (event, payload) => {
    try {
      await cu12.dispense(payload);
      await logger({
        user: "system",
        message: `dispense: slot #${payload.slotId} initiated`,
      });
    } catch (error) {
      cu12.win.webContents.send("dispense-error", {
        message: "การจ่ายยาไม่สำเร็จ: " + error.message,
      });
      await logger({
        user: "system",
        message: `dispense: slot #${payload.slotId} error - ${error.message}`,
      });
      await logDispensing({
        userId: null,
        hn: payload.hn,
        slotId: payload.slotId,
        process: "dispense-error",
        message: "จ่ายยาล้มเหลว",
      });
    }
  });
};