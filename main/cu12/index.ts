import { SerialPort } from "serialport";
import { Slot } from "../../db/model/slot.model";
import { BrowserWindow, ipcMain } from "electron";
import {
  CU12PacketUtils,
  mapKu16SlotToCu12,
  mapCu12ToKu16Slot,
  CU12Packet,
} from "./utils/packet-utils";
import { CU12Logger } from "./utils/logger";
import { SlotState } from "../interfaces/slotState";
import { logger, systemLog } from "../logger";
import { User } from "../../db/model/user.model";

export interface CU12SlotData {
  slotId: number;
  address: number;
  lock: number;
  isOpen: boolean;
  isActive: boolean;
}

export class CU12Controller {
  serialPort: SerialPort;
  private buffer: Buffer = Buffer.alloc(0);
  path: string;
  baudRate: number;
  autoOpen: boolean = true;
  availableSlot: number;
  win: BrowserWindow;
  opening = false;
  dispensing = false;
  openingSlot: { slotId: number; hn: string; timestamp: number };
  connected = false;
  waitForLockedBack = false;
  waitForDispenseLockedBack = false;

  // CU12 specific properties
  currentBoardAddress: number = 0x00; // Default to first board
  boardStatus: Map<number, boolean> = new Map(); // Map of board addresses to connection status
  slotStates: Map<number, boolean> = new Map(); // Map of slot IDs to open/closed state

  // Debouncing properties
  private lastStatusCheckTime: number = 0;
  private statusCheckDebounceDelay: number = 500; // 500ms minimum between status checks
  private statusCheckTimeout: NodeJS.Timeout | null = null;

  constructor(
    _path: string,
    _baudRate: number,
    _availableSlot: number,
    _win: BrowserWindow
  ) {
    CU12Logger.logSection("CU12 Controller Initialization");

    this.win = _win;
    this.path = _path;
    this.baudRate = _baudRate;
    this.availableSlot = _availableSlot;

    CU12Logger.logStatus("Initializing CU12 controller", {
      path: _path,
      baudRate: _baudRate,
      availableSlots: _availableSlot,
    });

    this.serialPort = new SerialPort(
      {
        path: _path,
        baudRate: _baudRate,
        autoOpen: this.autoOpen,
      },
      (error) => {
        if (error) {
          this.connected = false;
          CU12Logger.logError(error, "SerialPort connection failed");
          return;
        } else {
          this.connected = true;
          CU12Logger.logConnection("CONNECTED", _path, _baudRate);
          return;
        }
      }
    );

    // CU12 packets are binary, handle data directly without ReadlineParser
    this.serialPort.on("data", (data) => {
      this.handleIncomingData(data);
    });

    // Initialize board status maps
    this.boardStatus.set(0x00, false);
    this.boardStatus.set(0x01, false);

    // Initialize slot states (all closed initially)
    for (let i = 0; i < 15; i++) {
      this.slotStates.set(i, false);
    }

    CU12Logger.logStatus("CU12 controller initialized successfully");
  }

  getSerialPort() {
    return this.serialPort;
  }

  public static async LIST() {
    return await SerialPort.list();
  }

  open() {
    let result = false;
    this.serialPort.open((error) => {
      if (error) {
        CU12Logger.logError(error, "Port open failed");
        result = false;
        return;
      }
      CU12Logger.logStatus("Serial port opened successfully");
      result = true;
    });

    return result;
  }

  close() {
    this.serialPort.close((error) => {
      if (error) {
        CU12Logger.logError(error, "Port close failed");
        return;
      }
      CU12Logger.logConnection("DISCONNECTED", this.path, this.baudRate);
    });
  }

  isConnected() {
    return this.connected;
  }

  /**
   * Send status check command to current board
   */
  sendCheckState() {
    CU12Logger.logStatus("Sending status check", {
      boardAddress: this.currentBoardAddress.toString(16),
    });

    const cmd = CU12PacketUtils.createStatusPacket(this.currentBoardAddress);
    CU12Logger.logPacket(
      "TX",
      cmd,
      `Status check board ${this.currentBoardAddress.toString(16)}`
    );
    this.serialPort.write(cmd);
  }

  /**
   * Send status check command to both boards (with debouncing)
   */
  sendCheckStateToAllBoards() {
    const now = Date.now();
    const timeSinceLastCheck = now - this.lastStatusCheckTime;

    // Clear any existing timeout
    if (this.statusCheckTimeout) {
      clearTimeout(this.statusCheckTimeout);
      this.statusCheckTimeout = null;
    }

    // If not enough time has passed since last check, delay this one
    if (timeSinceLastCheck < this.statusCheckDebounceDelay) {
      const delayTime = this.statusCheckDebounceDelay - timeSinceLastCheck;
      CU12Logger.logStatus("Debouncing status check", {
        timeSinceLastCheck,
        debounceDelay: this.statusCheckDebounceDelay,
        actualDelay: delayTime,
      });

      this.statusCheckTimeout = setTimeout(() => {
        this.executeStatusCheck();
      }, delayTime);
      return;
    }

    // Execute immediately if enough time has passed
    this.executeStatusCheck();
  }

  /**
   * Execute the actual status check to both boards
   */
  private executeStatusCheck() {
    this.lastStatusCheckTime = Date.now();

    CU12Logger.logStatus("Sending status check to all boards");

    // Check board 0x00
    const cmd1 = CU12PacketUtils.createStatusPacket(0x00);
    CU12Logger.logPacket("TX", cmd1, "Status check board 0x00");
    this.serialPort.write(cmd1);

    // Wait a bit then check board 0x01
    setTimeout(() => {
      const cmd2 = CU12PacketUtils.createStatusPacket(0x01);
      CU12Logger.logPacket("TX", cmd2, "Status check board 0x01");
      this.serialPort.write(cmd2);
    }, 100);
  }

  /**
   * Parse status response from CU12
   */
  async receivedCheckState(packet: CU12Packet) {
    CU12Logger.logStatus("Received status response", {
      boardAddress: packet.address.toString(16),
      command: CU12PacketUtils.getCommandName(packet.command),
      hasStatusData: !!packet.statusData,
      statusDataLength: packet.statusData?.length || 0,
    });

    // Update board status
    this.boardStatus.set(packet.address, true);

    // Process status data if available
    if (packet.statusData && packet.statusData.length >= 2) {
      try {
        // Parse 2-byte status data to extract 12-lock bitfield
        const lockStates = CU12PacketUtils.parseStatusData(packet.statusData);
        const ku16Slots = CU12PacketUtils.convertCul12StatesToKu16Slots(
          packet.address,
          lockStates
        );

        CU12Logger.logStatus("Parsed CU12 status data", {
          boardAddress: packet.address.toString(16),
          statusData: packet.statusData
            .map((b) => "0x" + b.toString(16).padStart(2, "0"))
            .join(" "),
          lockStates: lockStates
            .map(
              (locked, i) => `Lock ${i + 1}: ${locked ? "LOCKED" : "UNLOCKED"}`
            )
            .join(", "),
          ku16Slots: ku16Slots.map((slot) => `Slot ${slot + 1}`).join(", "),
        });

        // Update slot states based on parsed status data
        ku16Slots.forEach((ku16Slot, lockIndex) => {
          const isLocked = lockStates[lockIndex];
          this.slotStates.set(ku16Slot, !isLocked); // Store as "open" state (inverse of locked)
        });

        // Log the parsed status data
        const statusLog = CU12PacketUtils.formatStatusDataForLog(
          packet.statusData
        );
        systemLog(
          `check_state_received: board ${packet.address.toString(
            16
          )} ${statusLog}`
        );
        await logger({
          user: "system",
          message: `check_state_received: board ${packet.address.toString(
            16
          )} ${statusLog}`,
        });
      } catch (error) {
        CU12Logger.logError(
          error as Error,
          "Failed to parse CU12 status data",
          {
            boardAddress: packet.address.toString(16),
            statusData: packet.statusData,
          }
        );
      }
    } else {
      // Fallback for responses without status data
      systemLog(
        `check_state_received: board ${packet.address.toString(
          16
        )} data [${Array.from([packet.lockNum, packet.ask])
          .map((b) => b.toString(16))
          .join(" ")}] (no status data)`
      );
      await logger({
        user: "system",
        message: `check_state_received: board ${packet.address.toString(
          16
        )} data [${Array.from([packet.lockNum, packet.ask])
          .map((b) => b.toString(16))
          .join(" ")}] (no status data)`,
      });
    }

    // Convert CU12 slot data to KU16-compatible format
    const slotData = await this.convertCU12DataToKU16Format();

    this.win.webContents.send("init-res", slotData);
  }

  /**
   * Convert CU12 slot states to KU16-compatible format
   * Maps 12 real CU12 hardware slots + 3 disabled mock slots (13-15)
   */
  private async convertCU12DataToKU16Format(): Promise<SlotState[]> {
    const slotFromDb = await Slot.findAll();
    const slotArr: SlotState[] = [];

    // CU12 hardware provides 12 real slots (slots 1-12)
    // KU16 expects 15 slots total, so slots 13-15 are mock/disabled
    for (let i = 0; i < Math.min(15, this.availableSlot); i++) {
      const dbSlot = slotFromDb[i];
      const isOpen = this.slotStates.get(i) || false;

      // Determine if this is a real hardware slot or mock slot
      const isRealHardwareSlot = i < 12; // Slots 0-11 are real (displayed as 1-12)
      const isMockSlot = i >= 12; // Slots 12-14 are mock (displayed as 13-15)

      let isActive = false;

      if (isMockSlot) {
        // Mock slots (13-15) are always disabled
        isActive = false;
      } else {
        // Real hardware slots (1-12) use database and hardware state
        // If no database record exists, assume slot is active (not disabled by user)
        const dbIsActive = dbSlot?.dataValues?.isActive ?? true;
        isActive = dbIsActive && !isOpen;
      }

      slotArr.push({
        slotId: i + 1, // Display as slots 1-15
        hn: isRealHardwareSlot ? dbSlot?.dataValues?.hn || null : null,
        occupied: isRealHardwareSlot
          ? dbSlot?.dataValues?.occupied || false
          : false,
        timestamp: isRealHardwareSlot
          ? dbSlot?.dataValues?.timestamp || null
          : null,
        opening: isRealHardwareSlot
          ? dbSlot?.dataValues?.opening || false
          : false,
        isActive: isActive,
      });
    }

    return slotArr;
  }

  /**
   * Send unlock command to CU12
   */
  async sendUnlock(inputSlot: {
    slotId: number;
    hn: string;
    timestamp: number;
  }) {
    if (!this.isConnected() || this.waitForLockedBack) {
      CU12Logger.logStatus(
        "Cannot unlock: not connected or waiting for lock back"
      );
      return;
    }

    await logger({
      user: "system",
      message: `sendUnlock: slot #${inputSlot.slotId}`,
    });

    try {
      // Validate slot is within available range
      if (inputSlot.slotId > this.availableSlot) {
        const error = new Error(
          `Slot ${inputSlot.slotId} exceeds availableSlot (${this.availableSlot})`
        );
        CU12Logger.logError(error, "Slot validation failed");
        throw error;
      }

      // Validate slot is active (not disabled)
      const dbSlot = await Slot.findOne({
        where: { slotId: inputSlot.slotId },
      });
      if (!dbSlot?.dataValues?.isActive) {
        const error = new Error(`Slot ${inputSlot.slotId} is disabled`);
        CU12Logger.logError(error, "Slot validation failed");
        throw error;
      }

      // Map KU16 slot to CU12 address and lock
      // UI uses 1-based slot IDs, but mapping functions expect 0-based
      const slotZeroBased = inputSlot.slotId - 1;
      const cu12Slot = mapKu16SlotToCu12(slotZeroBased);

      CU12Logger.logStatus("Unlocking slot", {
        ku16Slot: inputSlot.slotId,
        ku16SlotZeroBased: slotZeroBased,
        cu12Address: cu12Slot.address.toString(16),
        cu12Lock: cu12Slot.lock,
      });

      const cmd = CU12PacketUtils.createUnlockPacket(
        cu12Slot.address,
        cu12Slot.lock
      );
      CU12Logger.logPacket(
        "TX",
        cmd,
        `Unlock slot ${inputSlot.slotId} (board ${cu12Slot.address.toString(
          16
        )}, lock ${cu12Slot.lock})`
      );

      this.serialPort.write(cmd);
      this.opening = true;
      this.openingSlot = inputSlot;

      CU12Logger.logSlotState(
        inputSlot.slotId,
        "closed",
        "opening",
        "sendUnlock"
      );
    } catch (error) {
      CU12Logger.logError(
        error as Error,
        "Failed to send unlock command",
        inputSlot
      );
    }
  }

  /**
   * Handle unlock response from CU12
   */
  async receivedUnlockState(packet: CU12Packet) {
    CU12Logger.logStatus("Received unlock response", {
      boardAddress: packet.address.toString(16),
      lockNum: packet.lockNum,
      command: CU12PacketUtils.getCommandName(packet.command),
    });

    try {
      // Convert CU12 address/lock back to KU16 slot (returns 0-based)
      const ku16Slot = mapCu12ToKu16Slot(packet.address, packet.lockNum);

      // Check if this matches our opening slot (openingSlot.slotId is 1-based)
      if (ku16Slot + 1 !== this.openingSlot?.slotId) {
        CU12Logger.logStatus("Unlock response for different slot", {
          expectedSlot: this.openingSlot?.slotId,
          receivedSlot: ku16Slot + 1,
        });
        return;
      }

      systemLog(
        `unlocked_received: unlock state for slot #${this.openingSlot.slotId}`
      );
      await logger({
        user: "system",
        message: `unlocked_received: unlock state for slot #${this.openingSlot.slotId}`,
      });

      // CRITICAL: Update currentBoardAddress for all subsequent status checks
      // Ensure status checks go to the correct board for the opening slot
      const slotZeroBased = this.openingSlot.slotId - 1;
      const cu12Slot = mapKu16SlotToCu12(slotZeroBased);
      this.currentBoardAddress = cu12Slot.address; // Set board 0x00 (slots 1-12) or 0x01 (slots 13-15)

      CU12Logger.logStatus("Updated currentBoardAddress for opening slot", {
        slotId: this.openingSlot.slotId,
        boardAddress: this.currentBoardAddress.toString(16),
      });

      this.waitForLockedBack = true;

      // Update slot state (using 0-based index for slotStates map)
      this.slotStates.set(ku16Slot, true);

      await Slot.update(
        { ...this.openingSlot, opening: true, occupied: false },
        { where: { slotId: this.openingSlot.slotId } }
      );

      CU12Logger.logSlotState(
        ku16Slot,
        "locked",
        "unlocked",
        "unlock response"
      );

      this.win.webContents.send("unlocking", {
        ...this.openingSlot,
        unlocking: true,
      });
    } catch (error) {
      CU12Logger.logError(
        error as Error,
        "Failed to process unlock response",
        packet
      );
    }
  }

  /**
   * Handle locked back response from CU12
   */
  async receivedLockedBackState(packet: CU12Packet) {
    CU12Logger.logStatus("Received locked back response", {
      boardAddress: packet.address.toString(16),
      lockNum: packet.lockNum,
      command: CU12PacketUtils.getCommandName(packet.command),
      hasStatusData: !!packet.statusData,
      statusDataLength: packet.statusData?.length || 0,
    });

    try {
      // ONLY check the specific opening slot for lock-back detection
      if (!this.openingSlot) {
        CU12Logger.logStatus("No opening slot to check for lock-back");
        return;
      }

      // Validate slot is active
      const dbSlot = await Slot.findOne({
        where: { slotId: this.openingSlot.slotId },
      });
      if (!dbSlot?.dataValues?.isActive) {
        CU12Logger.logStatus("Opening slot is disabled, ignoring lock-back");
        return;
      }

      // Validate slot is within available range
      if (this.openingSlot.slotId > this.availableSlot) {
        CU12Logger.logStatus(
          "Opening slot exceeds availableSlot, ignoring lock-back"
        );
        return;
      }

      CU12Logger.logStatus("Checking lock-back for opening slot", {
        slotId: this.openingSlot.slotId,
        hn: this.openingSlot.hn,
        timestamp: this.openingSlot.timestamp,
      });

      // Parse status data to check ONLY the opening slot's lock state
      if (packet.statusData && packet.statusData.length >= 2) {
        const lockStates = CU12PacketUtils.parseStatusData(packet.statusData);
        const openingSlotIndexZeroBased = this.openingSlot.slotId - 1;

        // Check if the opening slot index is valid for the current board
        // Board 0x00 covers slots 0-11 (KU16 slots 1-12)
        // Board 0x01 covers slots 12-14 (KU16 slots 13-15)
        const slotOnThisBoard =
          (packet.address === 0x00 && openingSlotIndexZeroBased <= 11) ||
          (packet.address === 0x01 && openingSlotIndexZeroBased >= 12 && openingSlotIndexZeroBased <= 14);

        if (!slotOnThisBoard) {
          // This status response is for a different board, not the one with our opening slot
          CU12Logger.logStatus("Status response is for different board", {
            packetBoard: packet.address.toString(16),
            openingSlotId: this.openingSlot.slotId,
          });
          return;
        }

        // Get the lock index for this board (0-11 for board 0x00, 0-2 for board 0x01)
        const lockIndexOnBoard =
          packet.address === 0x00
            ? openingSlotIndexZeroBased
            : openingSlotIndexZeroBased - 12;

        const isOpeningSlotLocked = lockStates[lockIndexOnBoard] === true;

        CU12Logger.logStatus("Checking opening slot lock-back status", {
          openingSlotId1Based: this.openingSlot.slotId,
          openingSlotIndex0Based: openingSlotIndexZeroBased,
          board: packet.address.toString(16),
          lockIndexOnBoard: lockIndexOnBoard,
          isLocked: isOpeningSlotLocked,
        });

        if (!isOpeningSlotLocked) {
          // Slot is still unlocked (open)
          CU12Logger.logStatus("Slot still opening", {
            slotId: this.openingSlot.slotId,
          });
          systemLog("locked_back_received: still opening");
          await logger({
            user: "system",
            message: "locked_back_received: still opening",
          });
          this.win.webContents.send("unlocking", {
            ...this.openingSlot,
            unlocking: true,
          });
          return;
        }

        // Slot is now locked back!
        CU12Logger.logStatus("Slot locked back", {
          slotId: this.openingSlot.slotId,
        });
        systemLog(
          `locked_back_received: slot #${this.openingSlot.slotId} locked back`
        );
        await logger({
          user: "system",
          message: `locked_back_received: slot #${this.openingSlot.slotId} locked back`,
        });

        this.waitForLockedBack = false;
        this.opening = false;
        this.dispensing = false;

        // Update slot state (using 0-based index)
        this.slotStates.set(openingSlotIndexZeroBased, false);

        await Slot.update(
          { ...this.openingSlot, opening: false, occupied: true },
          { where: { slotId: this.openingSlot.slotId } }
        );

        CU12Logger.logSlotState(
          this.openingSlot.slotId,
          "open",
          "closed",
          "locked back"
        );

        this.win.webContents.send("unlocking", {
          ...this.openingSlot,
          unlocking: false,
        });
      } else {
        // No status data available, cannot determine lock-back state
        CU12Logger.logStatus(
          "Cannot determine lock-back without status data",
          {
            slotId: this.openingSlot.slotId,
          }
        );
      }
    } catch (error) {
      CU12Logger.logError(
        error as Error,
        "Failed to process locked back response",
        packet
      );
    }
  }

  /**
   * Handle dispensing (same as unlock for CU12)
   */
  async dispense(inputSlot: {
    slotId: number;
    hn: string;
    timestamp: number;
    passkey: string;
  }) {
    const user = await User.findOne({ where: { passkey: inputSlot.passkey } });

    if (!user) {
      await logger({
        user: "system",
        message: `dispense: user not found`,
      });
      CU12Logger.logStatus("Dispense failed: user not found", {
        passkey: inputSlot.passkey,
      });
      throw new Error("ไม่พบผู้ใช้งาน");
    }

    if (!this.isConnected() || this.waitForDispenseLockedBack) {
      await logger({
        user: "system",
        message: `dispense: not connected or waiting for dispense locked back`,
      });
      CU12Logger.logStatus("Cannot dispense: not connected or waiting", {
        slotId: inputSlot.slotId,
      });
      return;
    }

    const slot = (await Slot.findOne({ where: { slotId: inputSlot.slotId } }))
      ?.dataValues;

    if (
      !slot.occupied ||
      slot.hn == "" ||
      slot.hn == null ||
      slot.hn == undefined
    ) {
      await logger({
        user: "system",
        message: `dispense: slot not occupied or hn is empty`,
      });
      CU12Logger.logStatus("Cannot dispense: slot not occupied", {
        slotId: inputSlot.slotId,
        occupied: slot?.occupied,
        hn: slot?.hn,
      });
      return;
    }

    // Validate slot is within available range
    if (inputSlot.slotId > this.availableSlot) {
      const error = new Error(
        `Slot ${inputSlot.slotId} exceeds availableSlot (${this.availableSlot})`
      );
      await logger({
        user: user.dataValues.name,
        message: `dispense: slot validation failed - ${error.message}`,
      });
      CU12Logger.logError(error, "Slot validation failed");
      throw error;
    }

    // Validate slot is active (not disabled)
    if (!slot.isActive) {
      const error = new Error(`Slot ${inputSlot.slotId} is disabled`);
      await logger({
        user: user.dataValues.name,
        message: `dispense: slot validation failed - ${error.message}`,
      });
      CU12Logger.logError(error, "Slot validation failed");
      throw error;
    }

    CU12Logger.logStatus("Starting dispensing", {
      slotId: inputSlot.slotId,
      userName: user.dataValues.name,
    });

    // Use same unlock command for CU12
    await this.sendUnlock(inputSlot);
    this.dispensing = true;
  }

  /**
   * Handle dispensing response (same as unlock for CU12)
   */
  async receivedDispenseState(packet: CU12Packet) {
    const ku16Slot = mapCu12ToKu16Slot(packet.address, packet.lockNum);

    CU12Logger.logStatus("Dispensing response received", {
      slotId: ku16Slot,
      boardAddress: packet.address.toString(16),
      lockNum: packet.lockNum,
    });

    systemLog(`dispensed_received: dispense state for slot #${ku16Slot}`);
    await logger({
      user: "system",
      message: `dispensed_received: dispense state for slot #${ku16Slot}`,
    });

    if (ku16Slot + 1 !== this.openingSlot?.slotId) {
      CU12Logger.logStatus("Dispensing response for different slot", {
        expectedSlot: this.openingSlot?.slotId,
        receivedSlot: ku16Slot + 1,
      });
      return;
    }

    // CRITICAL: Update currentBoardAddress for dispense lock-back checks
    // Ensure all future status checks for this dispensing go to correct board
    const slotZeroBased = this.openingSlot.slotId - 1;
    const cu12Slot = mapKu16SlotToCu12(slotZeroBased);
    this.currentBoardAddress = cu12Slot.address;

    CU12Logger.logStatus("Updated currentBoardAddress for dispensing slot", {
      slotId: this.openingSlot.slotId,
      boardAddress: this.currentBoardAddress.toString(16),
    });

    this.waitForDispenseLockedBack = true;
    await Slot.update(
      { ...this.openingSlot, opening: true },
      { where: { slotId: this.openingSlot.slotId } }
    );

    this.win.webContents.send("dispensing", {
      ...this.openingSlot,
      dispensing: true,
    });
  }

  /**
   * Handle dispensing locked back response
   * REFACTORED: Use hardware statusData instead of corrupted global state
   */
  async receivedDispenseLockedBackState(packet: CU12Packet) {
    CU12Logger.logStatus("Received dispense locked back response", {
      boardAddress: packet.address.toString(16),
      lockNum: packet.lockNum,
      hasStatusData: !!packet.statusData,
      statusDataLength: packet.statusData?.length || 0,
    });

    try {
      // Guard: Check opening slot exists
      if (!this.openingSlot) {
        CU12Logger.logStatus("No opening slot for dispense lock-back check");
        return;
      }

      // Validate slot is active
      const dbSlot = await Slot.findOne({
        where: { slotId: this.openingSlot.slotId },
      });
      if (!dbSlot?.dataValues?.isActive) {
        CU12Logger.logStatus("Dispensing slot is disabled");
        return;
      }

      // Validate slot is within available range
      if (this.openingSlot.slotId > this.availableSlot) {
        CU12Logger.logStatus("Dispensing slot exceeds availableSlot");
        return;
      }

      // Validate packet is from correct board
      const slotIndex = this.openingSlot.slotId - 1;
      const correctBoard =
        (packet.address === 0x00 && slotIndex <= 11) ||
        (packet.address === 0x01 && slotIndex >= 12 && slotIndex <= 14);
      if (!correctBoard) {
        CU12Logger.logStatus(
          "Status response from wrong board for dispensing",
          {
            packetBoard: packet.address.toString(16),
            expectedSlotId: this.openingSlot.slotId,
          }
        );
        return;
      }

      // Parse statusData from hardware (real state, not corrupted global)
      if (!packet.statusData || packet.statusData.length < 2) {
        CU12Logger.logStatus("Missing statusData for lock-back verification");
        return;
      }

      // Parse the 2 status bytes to get lock states
      const lockStates = CU12PacketUtils.parseStatusData(packet.statusData);

      // Calculate which bit represents our opening slot on this board
      // Board 0x00: slots 1-12 → indices 0-11
      // Board 0x01: slots 13-15 → indices 0-2 (mapped from global 12-14)
      let lockIndexOnBoard;
      if (packet.address === 0x00) {
        lockIndexOnBoard = this.openingSlot.slotId - 1; // 0-11
      } else {
        lockIndexOnBoard = this.openingSlot.slotId - 13; // 0-2 for slots 13-15
      }

      // Check if THIS slot is locked (bit = 1 means locked)
      const isLocked = lockStates[lockIndexOnBoard] === true;

      CU12Logger.logStatus("Dispense lock-back state check", {
        slotId: this.openingSlot.slotId,
        board: packet.address.toString(16),
        lockIndexOnBoard: lockIndexOnBoard,
        isLocked: isLocked,
      });

      if (!isLocked) {
        // Slot is STILL OPEN - keep modal, show error
        CU12Logger.logStatus(
          "Dispensing slot still unlocked - waiting for user to lock",
          {
            slotId: this.openingSlot.slotId,
            lockState: isLocked,
          }
        );

        systemLog("dispense_locked_back_received: still opening");

        await logger({
          user: "system",
          message: `[CU12-NOT-LOCKED] dispensing slot still open - retry needed - slot #${this.openingSlot.slotId}`,
        });

        // Send error event to UI (keep modal visible)
        this.win.webContents.send("dispensing", {
          ...this.openingSlot,
          dispensing: true,
          reset: false,
          locked: false, // Indicate not locked
          error: "Please lock medication back",
        });

        // Keep flags: waitForDispenseLockedBack = true (still waiting)
        return;
      }

      // Slot IS LOCKED BACK - proceed with completion
      CU12Logger.logStatus("Dispensing completed - slot locked back", {
        slotId: this.openingSlot.slotId,
        lockState: isLocked,
      });

      systemLog(
        `dispense_locked_back_received: slot #${this.openingSlot.slotId} locked back`
      );
      await logger({
        user: "system",
        message: `[CU12-LOCK-BACK] dispensing completed - slot locked back - slot #${this.openingSlot.slotId}`,
      });

      // Reset all flags
      this.waitForDispenseLockedBack = false;
      this.opening = false;
      this.dispensing = false;

      // Send completion events to UI
      this.win.webContents.send("dispensing", {
        ...this.openingSlot,
        dispensing: false,
        reset: true,
      });

      // Send dispensing-reset event to trigger ClearOrContinue modal
      this.win.webContents.send("dispensing-reset", {
        slotId: this.openingSlot.slotId,
        hn: this.openingSlot.hn,
      });
    } catch (error) {
      CU12Logger.logError(
        error as Error,
        "Failed to process dispense locked back response",
        packet
      );
    }
  }

  /**
   * Reset slot state
   */
  async resetSlot(slotId: number) {
    await Slot.update(
      { hn: null, occupied: false, opening: false },
      { where: { slotId: slotId } }
    );

    CU12Logger.logSlotState(slotId, "unknown", "reset", "resetSlot");
    // Fix: slotStates uses 0-based index, slotId is 1-based
    this.slotStates.set(slotId - 1, false);

    await logger({
      user: "system",
      message: `resetSlot: slot #${slotId}`,
    });

    // Send updated slot data to frontend to refresh UI
    const updatedSlotData = await this.convertCU12DataToKU16Format();
    this.win.webContents.send("init-res", updatedSlotData);
  }

  /**
   * Deactivate slot
   */
  async deactivate(slotId: number) {
    await Slot.update(
      { isActive: false, hn: null, occupied: false, opening: false },
      { where: { slotId: slotId } }
    );

    CU12Logger.logStatus("Deactivating slot", { slotId });
    this.slotStates.set(slotId - 1, false);

    await logger({
      user: "system",
      message: `deactivate: slot #${slotId}`,
    });

    this.dispensing = false;
    this.opening = false;
    this.win.webContents.send("unlocking", {
      ...this.openingSlot,
      unlocking: false,
    });
    this.win.webContents.send("dispensing", {
      slot: slotId,
      dispensing: false,
      unlocking: false,
      reset: false,
    });
  }

  /**
   * Reactivate slot
   */
  async reactive(slotId: number) {
    CU12Logger.logStatus("Reactivating slot", { slotId });
    return await Slot.update(
      { isActive: true, hn: null, occupied: false, opening: false },
      { where: { slotId: slotId } }
    );
  }

  /**
   * Deactivate all slots
   */
  async deactiveAllSlots() {
    CU12Logger.logStatus("Deactivating all slots");
    return await Slot.update(
      { isActive: false },
      { where: { isActive: true } }
    );
  }

  /**
   * Reactivate all slots
   */
  async reactiveAllSlots() {
    CU12Logger.logStatus("Reactivating all slots");
    return await Slot.update(
      { isActive: true },
      { where: { isActive: false } }
    );
  }

  sleep(ms: number) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  /**
   * Enhanced packet parsing for CU12 with flexible length handling
   */
  private parseCU12PacketFlexible(data: Buffer): CU12Packet | null {
    try {
      // CU12 packet structure:
      // 8-byte packets: [STX, ADDR, LOCKNUM, CMD, ASK, DATALEN, ETX, SUM] (unlock responses)
      // 10-byte packets: [STX, ADDR, LOCKNUM, CMD, ASK, DATALEN, ETX, SUM, STATUS0, STATUS1] (status responses)
      // Minimum packet size is 8 bytes
      // Apply minimum length validation - must have at least 8 bytes for basic CU12 packet
      if (data.length < 8) {
        CU12Logger.logStatus("Packet too short for CU12 format", {
          length: data.length,
          data: Array.from(data)
            .map((b) => "0x" + b.toString(16).padStart(2, "0"))
            .join(" "),
        });
        return null;
      }

      // Extract basic packet components
      const stx = data[0];
      const address = data[1];
      const lockNum = data[2];
      const command = data[3];
      const ask = data[4];
      const dataLen = data[5];
      const etx = data[6];
      const checksum = data[7];
      const status0 = data.length >= 10 ? data[8] : undefined;
      const status1 = data.length >= 10 ? data[9] : undefined;

      // Validate STX (Start of Text)
      if (stx !== 0x02) {
        CU12Logger.logStatus("Invalid STX byte", {
          expected: "0x02",
          received: "0x" + stx.toString(16),
        });
        return null;
      }

      // Validate ETX (End of Text)
      if (etx !== 0x03) {
        CU12Logger.logStatus("Invalid ETX byte", {
          expected: "0x03",
          received: "0x" + etx.toString(16),
        });
        return null;
      }

      // Validate checksum using our fixed CU12PacketUtils method
      // This handles both basic responses (7 bytes) and status responses (9 bytes including status data)
      const parsedPacket = CU12PacketUtils.parseResponse(data);
      if (!parsedPacket) {
        CU12Logger.logStatus("Checksum mismatch or packet validation failed", {
          expected: "Valid CU12 packet with correct checksum",
          received: "Invalid packet or checksum mismatch",
        });
        return null;
      }

      // Return the already validated packet from our fixed method
      return parsedPacket;
    } catch (error) {
      CU12Logger.logError(error as Error, "Error parsing CU12 packet", {
        data: Array.from(data)
          .map((b) => "0x" + b.toString(16).padStart(2, "0"))
          .join(" "),
      });
      return null;
    }
  }

  /**
   * Calculate CU12 checksum (XOR of first 7 bytes)
   */
  private calculateCU12Checksum(data: Buffer): number {
    let checksum = 0;
    for (let i = 0; i < Math.min(7, data.length); i++) {
      checksum ^= data[i];
    }
    return checksum;
  }

  /**
   * Handle incoming binary data with proper buffer accumulation for CU12 packets
   */
  private handleIncomingData(chunk: Buffer) {
    try {
      // Accumulate data in buffer
      this.buffer = Buffer.concat([this.buffer, chunk]);

      CU12Logger.logStatus("Received data chunk", {
        chunkLength: chunk.length,
        bufferLength: this.buffer.length,
        chunkHex: this.bufferToHex(chunk),
      });

      // Process complete packets from buffer
      while (this.buffer.length >= 8) {
        // Minimum CU12 packet size
        const packet = this.extractCompletePacket();
        if (packet) {
          this.processParsedPacket(packet);
        } else {
          break; // No complete packet available
        }
      }
    } catch (error) {
      CU12Logger.logError(error as Error, "Error handling incoming data");
    }
  }

  /**
   * Convert buffer to hex string for debugging
   */
  private bufferToHex(buffer: Buffer): string {
    return Array.from(buffer)
      .map((b) => "0x" + b.toString(16).padStart(2, "0"))
      .join(" ");
  }

  /**
   * Extract a complete CU12 packet from buffer
   */
  private extractCompletePacket(): Buffer | null {
    try {
      // Find STX (0x02) - packet start marker
      let stxIndex = -1;
      for (let i = 0; i < this.buffer.length; i++) {
        if (this.buffer[i] === 0x02) {
          stxIndex = i;
          break;
        }
      }

      if (stxIndex === -1) {
        // No STX found, clear buffer
        this.buffer = Buffer.alloc(0);
        return null;
      }

      // Remove data before STX
      if (stxIndex > 0) {
        CU12Logger.logStatus("Removing invalid data before STX", {
          removedBytes: stxIndex,
          removedData: Array.from(this.buffer.slice(0, stxIndex))
            .map((b) => "0x" + b.toString(16).padStart(2, "0"))
            .join(" "),
        });
        this.buffer = this.buffer.slice(stxIndex);
      }

      // Check minimum packet length: STX + ADDR + LOCKNUM + CMD + ASK + DATALEN + ETX + SUM = 8 bytes
      if (this.buffer.length < 8) {
        return null; // Incomplete packet
      }

      // Validate that this looks like a real CU12 packet by checking ETX position
      // ETX should be at position 6 for CU12 packets
      const etxPosition = 6;
      if (this.buffer[etxPosition] !== 0x03) {
        // This STX doesn't lead to a valid packet, skip it and try the next STX
        CU12Logger.logStatus(
          "Invalid ETX at expected position, skipping this STX",
          {
            stxIndex: 0,
            expectedEtx: "0x03",
            actualEtx: "0x" + this.buffer[etxPosition].toString(16),
            bufferStart: Array.from(
              this.buffer.slice(0, Math.min(10, this.buffer.length))
            )
              .map((b) => "0x" + b.toString(16).padStart(2, "0"))
              .join(" "),
          }
        );
        this.buffer = this.buffer.slice(1); // Remove this invalid STX and try again
        return null;
      }

      // Additional validation: check for valid CU12 command and response structure
      const command = this.buffer[3];
      const ask = this.buffer[4];
      const dataLen = this.buffer[5];

      // Validate command is in expected range (0x80-0x8F)
      if (command < 0x80 || command > 0x8f) {
        CU12Logger.logStatus("Invalid command byte, skipping STX", {
          command: "0x" + command.toString(16),
          expectedRange: "0x80-0x8F",
        });
        this.buffer = this.buffer.slice(1);
        return null;
      }

      // Validate ASK field (0x00 for sent commands, 0x10-0x14 for responses)
      if (ask !== 0x00 && (ask < 0x10 || ask > 0x14)) {
        CU12Logger.logStatus("Invalid ASK byte, skipping STX", {
          ask: "0x" + ask.toString(16),
          expectedValues: "0x00 (sent) or 0x10-0x14 (responses)",
        });
        this.buffer = this.buffer.slice(1);
        return null;
      }

      // Get DATALEN field to determine total packet size
      const totalPacketSize = 8 + dataLen; // 8 basic bytes + data bytes

      // Validate DATALEN is reasonable (0-42 bytes per CU12 spec)
      if (dataLen > 0x2a) {
        CU12Logger.logStatus("Invalid DATALEN, skipping STX", {
          dataLen: dataLen,
          maxAllowed: 0x2a,
        });
        this.buffer = this.buffer.slice(1);
        return null;
      }

      // Check if we have complete packet
      if (this.buffer.length < totalPacketSize) {
        return null; // Incomplete packet
      }

      // Extract complete packet
      const packetData = this.buffer.slice(0, totalPacketSize);
      this.buffer = this.buffer.slice(totalPacketSize); // Remove processed packet

      return packetData;
    } catch (error) {
      CU12Logger.logError(error as Error, "Error extracting packet");
      // Clear buffer on error to prevent stuck state
      this.buffer = Buffer.alloc(0);
      return null;
    }
  }

  /**
   * Process a parsed CU12 packet
   */
  private async processParsedPacket(packetData: Buffer) {
    try {
      CU12Logger.logPacket("RX", packetData, "Complete CU12 packet received");

      // Parse packet using existing method
      const packet = this.parseCU12PacketFlexible(packetData);
      if (!packet) {
        CU12Logger.logStatus("Invalid CU12 packet received", {
          data: Array.from(packetData)
            .map((b) => b.toString(16))
            .join(" "),
        });
        return;
      }

      const commandName = CU12PacketUtils.getCommandName(packet.command);
      CU12Logger.logPacket("RX", packet, `Parsed CU12 packet: ${commandName}`);

      // Detect STATUS responses (command 0x80 with statusData)
      const isStatusResponse = packet.command === 0x80 && !!packet.statusData;

      // Handle different packet types based on current state
      if (this.opening && !this.dispensing && !this.waitForLockedBack) {
        // Opening but not dispensing and not wait for lock
        CU12Logger.logStatus("Processing unlock response");
        await this.receivedUnlockState(packet);
      } else if (this.opening && this.waitForLockedBack) {
        // Opening and wait for locked back
        // For STATUS responses, parse status FIRST to update slotStates
        if (isStatusResponse) {
          CU12Logger.logStatus(
            "Processing status check response (before locked-back logic)"
          );
          await this.receivedCheckState(packet);
        }
        CU12Logger.logStatus("Processing locked back response");
        await this.receivedLockedBackState(packet);
        // If not a status response, still update status after
        if (!isStatusResponse) {
          await this.receivedCheckState(packet);
        }
      } else if (
        this.opening &&
        this.dispensing &&
        !this.waitForDispenseLockedBack
      ) {
        // Opening and dispensing but not wait for lock
        CU12Logger.logStatus("Processing dispensing response");
        await this.receivedDispenseState(packet);
      } else if (
        this.opening &&
        this.dispensing &&
        this.waitForDispenseLockedBack
      ) {
        // Opening, dispensing, and wait for lock
        // For STATUS responses, parse status FIRST
        if (isStatusResponse) {
          CU12Logger.logStatus(
            "Processing status check response (before dispense locked-back logic)"
          );
          await this.receivedCheckState(packet);
        }
        CU12Logger.logStatus("Processing dispensing locked back response");
        await this.receivedDispenseLockedBackState(packet);
        // If not a status response, still update status after
        if (!isStatusResponse) {
          await this.receivedCheckState(packet);
        }
      } else {
        // Regular status check
        CU12Logger.logStatus("Processing status check response");
        await this.receivedCheckState(packet);
      }
    } catch (error) {
      CU12Logger.logError(error as Error, "Error processing CU12 packet", {
        data: Array.from(packetData)
          .map((b) => b.toString(16))
          .join(" "),
      });
    }
  }
}
