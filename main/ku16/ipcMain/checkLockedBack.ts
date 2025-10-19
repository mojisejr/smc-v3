import { ipcMain } from "electron";
import { KU16 } from "..";
import { ILockController } from "../../interfaces/lock-controller";
import { CheckLockedBack } from "../../interfaces/unlock";

export const checkLockedBackHandler = (ku16: ILockController) => {
  ipcMain.handle("check-locked-back", async (event, payload: CheckLockedBack) => {
    ku16.sendCheckState();
  });
};