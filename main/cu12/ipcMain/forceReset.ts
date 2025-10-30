import { ipcMain } from "electron";
import { CU12Controller } from "..";
import { User } from "../../../db/model/user.model";
import { logDispensing, logger } from "../../logger";

export const forceResetHandler = (cu12: CU12Controller) => {
  ipcMain.handle("force-reset", async (event, payload) => {
    let userId = null;
    let userName = null;
    try {
      const user = await User.findOne({
        where: {
          passkey: payload.passkey,
        },
      });

      if (!user) {
        await logger({
          user: "system",
          message: `force-reset: user not found`,
        });
        throw new Error("รหัสผ่านไม่ถูกต้อง");
      }

      userName = user.dataValues.name;
      userId = user.dataValues.id;

      await cu12.resetSlot(payload.slotId);
      await logger({
        user: "system",
        message: `force-reset: slot #${payload.slotId} by ${userName}`,
      });
      await logDispensing({
        userId: userId,
        hn: payload.hn,
        slotId: payload.slotId,
        process: "force-reset",
        message: payload.reason,
      });
      await cu12.sleep(1000);
      cu12.sendCheckState();
    } catch (error) {
      cu12.win.webContents.send("force-reset-error", {
        message: "ล้างช่องไม่สำเร็จกรุณาลองใหม่อีกครั้ง",
      });
      await logger({
        user: "system",
        message: `force-reset: slot #${payload.slotId} by ${userName} error`,
      });
      await logDispensing({
        userId: userId,
        hn: payload.hn,
        slotId: payload.slotId,
        process: "force-reset-error",
        message: "ล้างช่องไม่สำเร็จ",
      });
    }
  });
};