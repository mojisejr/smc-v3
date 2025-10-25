import { ipcMain } from "electron";
import { CU12Controller } from "..";
import { logger } from "../../logger";

export const initHandler = (cu12: CU12Controller, mainWindow: any) => {
  ipcMain.handle("init", async (event, payload) => {
    try {
      cu12.sendCheckStateToAllBoards(); // Send status check to both CU12 boards

      await logger({
        user: "system",
        message: `init: CU12 initialization completed`,
      });

    } catch (error) {
      await logger({
        user: "system",
        message: `init: CU12 initialization failed - ${error.message}`,
      });

      // Send error to renderer
      mainWindow.webContents.send("init-error", {
        message: "CU12 initialization failed",
        error: error.message
      });
    }
  });
};