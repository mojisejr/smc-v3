import { ipcMain } from "electron";
import { CU12Controller } from "../index";
import { exportLogs } from "../../logger";

export const exportLogsHandler = (cu12: CU12Controller) => {
  ipcMain.handle("export_logs", async () => {
    const filename = await exportLogs();
    return filename.csvPath;
  });
};
