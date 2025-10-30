import { ipcMain } from "electron";
import { CU12Controller } from "..";
import { User } from "../../../db/model/user.model";
import { logger } from "../../logger";

export const reactiveAllHandler = (cu12: CU12Controller) => {
  ipcMain.handle("reactivate-all", async (event, payload) => {
    try {
      const user = await User.findOne({ where: { name: payload.name } });

      if (user.dataValues.role !== "ADMIN") {
        await logger({
          user: "system",
          message: `reactivate-all: user is not admin`,
        });
        throw new Error("ไม่สามารถเปิดใช้งานระบบได้");
      }

      const result = await cu12.reactiveAllSlots();
      await cu12.sleep(1000);
      cu12.sendCheckState();

      await logger({
        user: "system",
        message: `reactivate-all: all slots reactivated by ${payload.name}`,
      });

      return result;
    } catch (error) {
      console.log(error);
      cu12.win.webContents.send("reactivate-all-error", {
        message: "ไม่สามารถเปิดใช้งานระบบได้",
      });

      await logger({
        user: "system",
        message: `reactivate-all: all slots reactivated by ${payload.name} error`,
      });
    }
  });
};