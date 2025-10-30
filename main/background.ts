import { BrowserWindow, app, dialog } from "electron";
import serve from "electron-serve";
import { createWindow } from "./helpers";

// Import database and CU12 related modules
import { sequelize } from "../db/sequelize";
import { CU12Controller } from "./cu12";

// Import IPC handlers for various functionalities
import { initHandler } from "./cu12/ipcMain/init";
import { unlockHandler } from "./cu12/ipcMain/unlock";
import { dispenseHandler } from "./cu12/ipcMain/dispensing";
import { resetHandler } from "./cu12/ipcMain/reset";
import {
  exportLogsHandler,
  logDispensingHanlder,
  LoggingHandler,
} from "./logger";
import { deactiveHandler } from "./cu12/ipcMain/deactivate";
// Note: Some handlers like forceReset, reactiveAll, deactiveAll, etc. are basic handlers that can work with CU12
// We'll use the existing ones for now and can migrate them if needed

// Import authentication related modules
import { loginRequestHandler } from "./auth/ipcMain/login";
import { Authentication } from "./auth";
import { logoutRequestHandler } from "./auth/ipcMain/logout";

// Import settings related modules
import { getSetting } from "./setting/getSetting";
import { getSettingHandler } from "./setting/ipcMain/getSetting";
import { updateSettingHandler } from "./setting/ipcMain/updateSetting";
import { checkLockedBackHandler } from "./cu12/ipcMain/checkLockedBack";
import { dispenseContinueHandler } from "./cu12/ipcMain/dispensing-continue";
import { getPortListHandler } from "./cu12/ipcMain/getPortList";
import { getUserHandler } from "./auth/ipcMain/getUser";
import { getAllSlotsHandler } from "./setting/ipcMain/getAllSlots";
import { deactiveAllHandler } from "./cu12/ipcMain/deactivateAll";
import { reactiveAllHandler } from "./cu12/ipcMain/reactiveAll";
import { deactivateAdminHandler } from "./cu12/ipcMain/deactivate-admin";
import { reactivateAdminHandler } from "./cu12/ipcMain/reactivate-admin";
import { createNewUserHandler } from "./user/createNewUser";
import { deleteUserHandler } from "./user/deleteUser";
import {
  setSelectedIndicatorPortHandler,
  setSelectedPortHandler,
} from "./setting/ipcMain/setSelectedPort";
import { checkActivationKeyHandler } from "./license/ipcMain/check-activation-key";
import { activateKeyHandler } from "./license/ipcMain/activate-key";
import { IndicatorDevice } from "./indicator";
/**
 * Indicates whether the application is running in production mode.
 *
 * This boolean value is determined by checking the `NODE_ENV` environment variable.
 * If `NODE_ENV` is set to "production", `isProd` will be `true`; otherwise, it will be `false`.
 */
const isProd: boolean = process.env.NODE_ENV === "production";
let mainWindow: BrowserWindow;

// Configure electron-serve for production mode
if (isProd) {
  serve({ directory: "app" });
} else {
  app.setPath("userData", `${app.getPath("userData")} (development)`);
}

(async () => {
  await app.whenReady();

  // Create main application window with specific dimensions and properties
  mainWindow = createWindow("main", {
    fullscreen: false,
    width: 1280,
    height: 768,
    minWidth: 1280,
    minHeight: 768,
    maxWidth: 1920,
    maxHeight: 1080,
    closable: true,
    autoHideMenuBar: true,
  });

  let dbConnection = false;

  // Initialize database connection
  const sql = await sequelize.sync();

  // Get application settings
  const settings = await getSetting();

  if (settings && sql) {
    dbConnection = true;
  }

  // Initialize Indicator device with settings

  const indicator = new IndicatorDevice(
    settings.indi_port,
    settings.indi_baudrate,
    mainWindow
  );

  // Initialize CU12 device with settings (reuse existing KU16 settings for compatibility)
  const cu12 = new CU12Controller(
    settings.ku_port,
    settings.ku_baudrate,
    settings.available_slots,
    mainWindow
  );

  // Initialize authentication system
  const auth = new Authentication();

  // Start receiving data from CU12 device (now handled automatically in constructor)
  // cu12.receive(); // Removed - now using handleIncomingData directly
  indicator.receive();

  //Activation key check
  activateKeyHandler();
  checkActivationKeyHandler();

  // Register all IPC handlers for various functionalities
  // Settings related handlers
  getPortListHandler(cu12);
  getSettingHandler(mainWindow);
  getUserHandler(mainWindow);
  // updateSettingHandler expects KU12 but we can use CU12 for compatibility
  updateSettingHandler(mainWindow, cu12 as any);
  getAllSlotsHandler();
  createNewUserHandler();
  deleteUserHandler();
  setSelectedPortHandler();
  setSelectedIndicatorPortHandler();

  // Authentication related handlers
  loginRequestHandler(mainWindow, auth);
  logoutRequestHandler(auth);

  // CU12 device operation handlers
  initHandler(cu12, mainWindow);
  unlockHandler(cu12);
  checkLockedBackHandler(cu12);
  dispenseHandler(cu12);
  resetHandler(cu12);
  // Keep existing handlers that work with CU12
  dispenseContinueHandler(cu12);
  // forceResetHanlder(cu12); // Keep existing for now
  deactiveHandler(cu12);
  // Note: These handlers expect KU16 type - comment out for now, will migrate if needed
  deactiveAllHandler(cu12);
  reactiveAllHandler(cu12);
  reactivateAdminHandler(cu12);
  deactivateAdminHandler(cu12);

  // Logging related handlers - expecting KU12 type, comment out for now
  // logDispensingHanlder(cu12);
  // LoggingHandler(cu12);
  // exportLogsHandler(cu12);

  // Load the application UI based on environment
  if (isProd) {
    await mainWindow.loadURL("app://./home.html");
  } else {
    const port = process.argv[2];
    await mainWindow.loadURL(`http://localhost:${port}/home`);
    // mainWindow.webContents.openDevTools();
  }
})();

// Quit application when all windows are closed
app.on("window-all-closed", () => {
  app.quit();
});
