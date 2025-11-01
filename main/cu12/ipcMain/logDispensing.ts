import { ipcMain } from "electron";
import { CU12Controller } from "../index";
import { getDispensingLogs } from "../../logger";

export const logDispensingHanlder = (cu12: CU12Controller) => {
  ipcMain.handle("get_dispensing_logs", async () => {
    const data = await getDispensingLogs();
    const logs = data.map((log) => {
      return {
        ...log.dataValues,
        user:
          log.dataValues.User == null
            ? null
            : log.dataValues.User.dataValues.name,
      };
    });
    return logs;
  });
};
