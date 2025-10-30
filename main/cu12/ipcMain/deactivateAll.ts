import { ipcMain } from "electron";
import { CU12Controller } from "..";
import { User } from "../../../db/model/user.model";
import { logger } from "../../logger";

export const deactiveAllHandler = (cu12: CU12Controller) => {
  ipcMain.handle("deactivate-all", async (event, payload) => {
    try {
      const user = await User.findOne({ where: { name: payload.name } });

      if (user.dataValues.role !== "ADMIN") {
        await logger({
          user: "system",
          message: `deactivate-all: user is not admin`,
        });
        throw new Error("ไม่สามารถยกเลิกการใช้งานระบบได้");
      }

      const result = await cu12.deactiveAllSlots();
      await cu12.sleep(1000);
      cu12.sendCheckState();

      await logger({
        user: "system",
        message: `deactivate-all: all slots deactivated by ${payload.name}`,
      });

      return result;
    } catch (error) {
      console.log(error);
      cu12.win.webContents.send("deactivate-all-error", {
        message: "ไม่สามารถยกเลิกการใช้งานระบบได้",
      });

      await logger({
        user: "system",
        message: `deactivate-all: all slots deactivated by ${payload.name} error`,
      });
    }
  });
};