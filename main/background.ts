import { BrowserWindow, app, dialog } from "electron";
import serve from "electron-serve";
import { createWindow } from "./helpers";

// Import database and KU16 related modules
import { sequelize } from "../db/sequelize";
import { KU16 } from "./ku16";
import { CU12Adapter } from "./cu12";
import { ISetting } from "./interfaces/setting";
import { ILockController } from "./interfaces/lock-controller";

/**
 * Factory function to create lock controller based on protocol type
 * Returns KU16 or CU12 adapter with same interface
 */
function createLockController(settings: ISetting, mainWindow: any): ILockController {
  console.log("FACTORY: Protocol type is:", settings.protocol_type);

  if (settings.protocol_type === "CU12") {
    console.log("FACTORY: Creating CU12 adapter with settings:", {
      connection_type: settings.cu12_connection_type,
      port: settings.cu12_connection_type === "tcp" ? "tcp" : settings.ku_port,
      baudrate: settings.cu12_connection_type === "tcp" ? settings.cu12_baudrate || 19200 : settings.ku_baudrate,
      slots: Math.min(settings.available_slots, 12),
      address: settings.cu12_address || 1
    });

    const cu12Adapter = new CU12Adapter(
      settings.cu12_connection_type === "tcp" ? "tcp" : settings.ku_port,
      settings.cu12_connection_type === "tcp" ? settings.cu12_baudrate || 19200 : settings.ku_baudrate,
      Math.min(settings.available_slots, 12), // CU12 max 12 locks
      settings.cu12_address || 1, // Pass database address with fallback to 1
      mainWindow
    );

    console.log("FACTORY: CU12 adapter created successfully");
    return cu12Adapter;
  } else {
    console.log("FACTORY: Creating KU16 controller (auto-connects in constructor)");
    const ku16Controller = new KU16(
      settings.ku_port,
      settings.ku_baudrate,
      settings.available_slots,
      mainWindow
    );
    console.log("FACTORY: KU16 controller created successfully");
    return ku16Controller;
  }
}

// Import IPC handlers for various functionalities
import { initHandler } from "./ku16/ipcMain/init";
import { unlockHandler } from "./ku16/ipcMain/unlock";
import { dispenseHandler } from "./ku16/ipcMain/dispensing";
import { dispensingResetHanlder } from "./ku16/ipcMain/reset";
import {
  exportLogsHandler,
  logDispensingHanlder,
  LoggingHandler,
} from "./logger";
import { forceResetHanlder } from "./ku16/ipcMain/forceReset";
import { reactiveAllHanlder } from "./ku16/ipcMain/reactiveAll";
import { deactiveHanlder } from "./ku16/ipcMain/deactivate";

// Import authentication related modules
import { loginRequestHandler } from "./auth/ipcMain/login";
import { Authentication } from "./auth";
import { logoutRequestHandler } from "./auth/ipcMain/logout";

// Import settings related modules
import { getSetting } from "./setting/getSetting";
import { getSettingHandler } from "./setting/ipcMain/getSetting";
import { updateSettingHandler } from "./setting/ipcMain/updateSetting";
import { checkLockedBackHandler } from "./ku16/ipcMain/checkLockedBack";
import { dispenseContinueHandler } from "./ku16/ipcMain/dispensing-continue";
import { getPortListHandler } from "./ku16/ipcMain/getPortList";
import { getUserHandler } from "./auth/ipcMain/getUser";
import { getAllSlotsHandler } from "./setting/ipcMain/getAllSlots";
import { deactiveAllHandler } from "./ku16/ipcMain/deactivateAll";
import { reactivateAdminHandler } from "./ku16/ipcMain/reactivate-admin";
import { deactivateAdminHandler } from "./ku16/ipcMain/deactivate-admin";
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

  console.log("DEBUG: Settings loaded:", {
    protocol_type: settings.protocol_type,
    cu12_address: settings.cu12_address,
    cu12_connection_type: settings.cu12_connection_type,
    ku_port: settings.ku_port,
    available_slots: settings.available_slots
  });

  if (settings && sql) {
    dbConnection = true;
  }

  // Initialize Indicator device with settings

  const indicator = new IndicatorDevice(
    settings.indi_port,
    settings.indi_baudrate,
    mainWindow
  );

  // Initialize lock controller using factory pattern with comprehensive error handling
  console.log("DEBUG: About to create lock controller...");

  let ku16: ILockController;
  try {
    ku16 = createLockController(settings, mainWindow);
    console.log("DEBUG: Lock controller created:", ku16.constructor.name);

    // Establish connection for CU12 protocol (KU16 auto-connects)
    if (settings.protocol_type === "CU12") {
      console.log("CU12: Establishing connection to", settings.cu12_connection_type, "device...");
      try {
        const connectionResult = await ku16.open();
        if (connectionResult) {
          console.log("CU12: Connection established successfully");
        } else {
          console.error("CU12: Connection failed - device not responding");
          // Send user-friendly error to frontend
          mainWindow.webContents.send("init-failed-on-connection-error", {
            title: "ไม่สามารถเชื่อมต่อกับอุปกรณ์ CU12 ได้",
            message: "อุปกรณ์ CU12 ไม่ตอบสนอง กรุณาตรวจสอบการเชื่อมต่อและลองใหม่",
            suggestion: "ตรวจสอบว่าสาย RS485 เชื่อมต่อถูกต้องและอุปกรณ์เปิดอยู่",
            path: "/error/connection-error"
          });
        }
      } catch (connectionError) {
        console.error("CU12: Connection error:", connectionError.message);

        // Handle specific connection error types
        let errorDetails = {
          title: "ข้อผิดพลาดการเชื่อมต่อ CU12",
          message: `เกิดข้อผิดพลาดขณะเชื่อมต่อ: ${connectionError.message}`,
          suggestion: "กรุณาตรวจสอบพอร์ต COM20 และการตั้งค่าอุปกรณ์",
          path: "/error/connection-error"
        };

        // Specific handling for port access errors
        if (connectionError.message.includes("Access denied") ||
            connectionError.message.includes("not found") ||
            connectionError.message.includes("ENOENT") ||
            connectionError.message.includes("Error: Unknown system error")) {
          errorDetails = {
            title: "ไม่พบพอร์ต COM20 หรือไม่สามารถเข้าถึงได้",
            message: "ไม่สามารถเชื่อมต่อกับพอร์ต COM20 ได้ อาจเป็นเพราะพอร์ตถูกใช้งานอยู่หรือไม่มีอยู่จริง",
            suggestion: "1. ตรวจสอบว่าอุปกรณ์ CU12 เชื่อมต่อกับพอร์ต COM20\n2. ตรวจสอบว่าไม่มีโปรแกรมอื่นใช้พอร์ตนี้อยู่\n3. ลองเปิด-ปิดอุปกรณ์และเชื่อมต่อใหม่",
            path: "/error/port-error"
          };
        }

        // Send user-friendly error to frontend
        mainWindow.webContents.send("init-failed-on-connection-error", errorDetails);
      }
    } else {
      console.log("BACKGROUND: KU16 protocol detected - using auto-connection (skipping manual open())");
    }

    // Add verification logging to confirm KU16 connection state (for both protocols)
    console.log(`BACKGROUND: Controller created - Type: ${ku16.constructor.name}, Connected: ${ku16.isConnected()}`);

    // Add protocol identification logging for both protocols
    if (settings.protocol_type === "CU12") {
      console.log("BACKGROUND: CU12 protocol detected - connection handled manually");
    } else {
      console.log("BACKGROUND: KU16 protocol detected - using auto-connection");
    }

    // TESTING VALIDATION LOGS
    console.log("=== TESTING VALIDATION ===");
    console.log("Protocol Type:", settings.protocol_type);
    console.log("Controller Type:", ku16.constructor.name);
    console.log("Connection State:", ku16.isConnected());
    console.log("Port Available:", settings.protocol_type === "CU12" ?
      (settings.cu12_connection_type === "tcp" ? settings.cu12_host : settings.ku_port) :
      settings.ku_port);
    console.log("Baud Rate:", settings.protocol_type === "CU12" ?
      (settings.cu12_connection_type === "tcp" ? settings.cu12_baudrate : settings.ku_baudrate) :
      settings.ku_baudrate);
    console.log("Device Address:", settings.protocol_type === "CU12" ? settings.cu12_address : "N/A");
    console.log("Available Slots:", settings.available_slots);
    console.log("========================");
  } catch (factoryError) {
    console.error("BACKGROUND: Factory creation failed:", factoryError.message);

    // Handle factory creation errors
    let factoryErrorDetails = {
      title: "ข้อผิดพลาดในการสร้าง Controller",
      message: `ไม่สามารถสร้าง Lock Controller ได้: ${factoryError.message}`,
      suggestion: "กรุณาตรวจสอบการตั้งค่าโปรโตคอลและพอร์ตการเชื่อมต่อ",
      path: "/error/factory-error"
    };

    // Send factory error to frontend
    mainWindow.webContents.send("init-failed-on-connection-error", factoryErrorDetails);

    // Create a fallback controller to prevent app crash
    console.warn("BACKGROUND: Creating fallback controller due to factory error");
    try {
      ku16 = createLockController({
        ...settings,
        protocol_type: "KU16" // Fallback to KU16 protocol
      }, mainWindow);

      console.log("BACKGROUND: Fallback controller created successfully");
    } catch (fallbackError) {
      console.error("BACKGROUND: Fallback controller creation failed:", fallbackError.message);

      // Send critical error to frontend
      mainWindow.webContents.send("init-failed-on-connection-error", {
        title: "ข้อผิดพลาดร้ายแรง",
        message: "ไม่สามารถสร้าง Controller ได้ทั้งหมด โปรแกรมอาจทำงานไม่ถูกต้อง",
        suggestion: "กรุณาติดต่อผู้ดูแลระบบและรีสตาร์ทโปรแกรม",
        path: "/error/critical-error"
      });

      // Create a minimal fallback to prevent complete failure
      ku16 = createLockController(settings, mainWindow);
    }
  }

  // Initialize authentication system
  const auth = new Authentication();

  // Start receiving data from KU16 device
  ku16.receive();
  indicator.receive();

  //Activation key check
  activateKeyHandler();
  checkActivationKeyHandler();

  // Register all IPC handlers for various functionalities
  // Settings related handlers
  getPortListHandler(ku16);
  getSettingHandler(mainWindow);
  getUserHandler(mainWindow);
  updateSettingHandler(mainWindow, ku16);
  getAllSlotsHandler();
  createNewUserHandler();
  deleteUserHandler();
  setSelectedPortHandler();
  setSelectedIndicatorPortHandler();

  // Authentication related handlers
  loginRequestHandler(mainWindow, auth);
  logoutRequestHandler(auth);

  // KU16 device operation handlers
  initHandler(ku16, mainWindow);
  unlockHandler(ku16);
  checkLockedBackHandler(ku16);
  dispenseHandler(ku16);
  dispensingResetHanlder(ku16);
  dispenseContinueHandler(ku16);
  forceResetHanlder(ku16);
  deactiveHanlder(ku16);
  deactiveAllHandler(ku16);
  reactiveAllHanlder(ku16);
  reactivateAdminHandler(ku16);
  deactivateAdminHandler(ku16);

  // Logging related handlers
  logDispensingHanlder(ku16);
  LoggingHandler(ku16);
  exportLogsHandler(ku16);

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
