import { ipcMain } from "electron";
import { CU12Controller } from "..";
import { logDispensing, logger } from "../../logger";
import { User } from "../../../db/model/user.model";
export const dispenseContinueHandler = (cu12: CU12Controller) => {
  ipcMain.handle("dispense-continue", async (event, payload) => {
    let userId = null;
    let userName = null;
    try {
      const user = await User.findOne({ where: { passkey: payload.passkey } });
      userId = user.dataValues.id;

      if (!user) {
        await logger({
          user: "system",
          message: `dispense-continue: user not found`,
        });
        throw new Error("ไม่พบผู้ใช้งาน");
      }

      userName = user.dataValues.name;

      await logDispensing({
        userId: userId,
        hn: payload.hn,
        slotId: payload.slotId,
        process: "dispense-continue",
        message: "จ่ายยาสำเร็จยังมียาอยู่ในช่อง",
      });

      await cu12.sleep(1000);
      cu12.sendCheckState();
    } catch (error) {
      cu12.win.webContents.send("dispense-error", {
        message: "ไม่สามารถจ่ายยาได้กรุณาตรวจสอบรหัสผู้ใช้งานอีกครั้ง",
      });

      await logger({
        user: "system",
        message: `dispense-continue: slot #${payload.slotId} by ${userName} error`,
      });

      await logDispensing({
        userId: userId,
        hn: payload.hn,
        slotId: payload.slotId,
        process: "dispense-error",
        message: "จ่ายยาล้มเหลว",
      });
    }
  });
};