import { ipcMain } from "electron";
import { CU12Controller } from "..";

export const getPortListHandler = (cu12: CU12Controller) => {
  ipcMain.handle("getPortList", async (event) => {
    try {
      const ports = await CU12Controller.LIST();
      return ports;
    } catch (error) {
      console.error("Error getting port list:", error);
      return [];
    }
  });
};