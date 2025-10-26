import { ipcMain } from "electron";
import { CU12Controller } from "..";
import { logDispensing, logger } from "../../logger";
import { User } from "../../../db/model/user.model";

export const unlockHandler = (cu12: CU12Controller) => {
  ipcMain.handle("unlock", async (event, payload) => {
    let userId = null;
    let userName = null;
    try {
      const user = await User.findOne({ where: { passkey: payload.passkey } });
      userId = user.dataValues.id;

      if (!user) {
        await logger({
          user: "system",
          message: `unlock: user not found`,
        });

        throw new Error("ไม่พบผู้ใช้งาน");
      }

      userName = user.dataValues.name;

      await cu12.sendUnlock(payload);
      await logger({
        user: "system",
        message: `unlock: slot #${payload.slotId} by ${user.dataValues.name}`,
      });
      await logDispensing({
        userId: userId,
        hn: payload.hn,
        slotId: payload.slotId,
        process: "unlock",
        message: "ปลดล็อคสำเร็จ",
      });
      await cu12.sleep(1000);
      cu12.sendCheckState(); // Send status check to current board
    } catch (error) {
      cu12.win.webContents.send("unlock-error", {
        message: "ปลดล็อกไม่สำเร็จกรุณาตรวจสอบรหัสผู้ใช้งานอีกครั้ง",
      });
      await logger({
        user: "system",
        message: `unlock: slot #${payload.slotId} by ${userName} error`,
      });
      await logDispensing({
        userId: userId,
        hn: payload.hn,
        slotId: payload.slotId,
        process: "unlock-error",
        message: "ปลดล็อคล้มเหลว",
      });
    }
  });
};