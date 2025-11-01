import { ipcMain } from "electron";
import { CU12Controller } from "../index";
import { getLogs } from "../../logger";

export const LoggingHandler = (cu12: CU12Controller) => {
  ipcMain.handle("get_logs", async () => {
    const data = await getLogs();
    const logs = data.map((log) => log.dataValues);
    cu12.win.webContents.send("retrive_logs", logs);
  });
};
