import { ipcMain } from "electron";
import { CU12Controller } from "..";
import { User } from "../../../db/model/user.model";
import { logger } from "../../logger";

export const deactivateAdminHandler = (cu12: CU12Controller) => {
  ipcMain.handle("deactivate-admin", async (event, payload) => {
    try {
      const user = await User.findOne({
        where: {
          name: payload.name,
        },
      });

      if (user.dataValues.role !== "ADMIN") {
        await logger({
          user: "system",
          message: `deactivate-admin: user is not admin`,
        });
        throw new Error("ไม่สามารถปิดช่องได้");
      }

      const result = await cu12.deactivate(payload.slotId);
      await cu12.sleep(1000);
      cu12.sendCheckState();

      await logger({
        user: "system",
        message: `deactivate-admin: slot #${payload.slotId} by ${payload.name}`,
      });

      return {
        success: true,
        slotId: payload.slotId,
        message: "Admin deactivated slot successfully"
      };
    } catch (error) {
      cu12.win.webContents.send("deactivate-admin-error", {
        message: "ไม่สามารถปิดช่องได้",
      });

      await logger({
        user: "system",
        message: `deactivate-admin: slot #${payload.slotId} by ${payload.name} error`,
      });

      return {
        success: false,
        slotId: payload.slotId,
        message: "ไม่สามารถปิดช่องได้",
        error: error.message
      };
    }
  });
};