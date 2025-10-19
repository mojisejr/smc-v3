import { ipcMain } from "electron";
import { KU16 } from "..";
import { ILockController } from "../../interfaces/lock-controller";

export const getPortListHandler = (ku16: ILockController) => {
  ipcMain.handle("get-port-list", async (event, payload) => {
    return await KU16.LIST();
  });
};
