import { ipcMain } from "electron";
import { CU12Controller } from "..";
import { logger } from "../../logger";
import { User } from "../../../db/model/user.model";

export const reactivateAdminHandler = (cu12: CU12Controller) => {
  ipcMain.handle("reactivate-admin", async (event, payload) => {
    let userName = null;
    try {
      const user = await User.findOne({ where: { name: payload.name } });

      if (!user) {
        await logger({
          user: "system",
          message: `reactivate-admin: user not found`,
        });
        throw new Error("ไม่พบผู้ใช้งาน");
      }

      userName = user.dataValues.name;

      if (user.dataValues.role !== "ADMIN") {
        await logger({
          user: "system",
          message: `reactivate-admin: user is not admin`,
        });
        throw new Error("ไม่สามารถเปิดใช้งานระบบได้");
      }

      // Specific error handling for CU12 packet parsing exceptions
      let result;
      try {
        result = await cu12.reactive(payload.slotId);
      } catch (parsingError) {
        // Handle packet parsing errors specifically
        console.error('CU12 packet parsing error during reactivate-admin:', parsingError);
        throw new Error('CU12 communication error - please check device connection');
      }

      await logger({
        user: "system",
        message: `reactivate-admin: slot #${payload.slotId} by ${user.dataValues.name}`,
      });

      await cu12.sleep(1000);
      cu12.sendCheckState(); // Send status check to current board

      return result;
    } catch (error) {
      await logger({
        user: "system",
        message: `reactivate-admin: slot #${payload.slotId} by ${userName} error`,
      });
      cu12.win.webContents.send("reactivate-admin-error", {
        message: "ไม่สามารถเปิดใช้งานระบบได้",
      });
    }
  });
};