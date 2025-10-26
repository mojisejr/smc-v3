import { SerialPort, ReadlineParser } from "serialport";
import { Slot } from "../../db/model/slot.model";
import { BrowserWindow, ipcMain } from "electron";
import { CU12PacketUtils, mapKu16SlotToCu12, mapCu12ToKu16Slot, CU12Packet } from "./utils/packet-utils";
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
  parser: ReadlineParser;
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

  constructor(
    _path: string,
    _baudRate: number,
    _availableSlot: number,
    _win: BrowserWindow
  ) {
    CU12Logger.logSection('CU12 Controller Initialization');

    this.win = _win;
    this.path = _path;
    this.baudRate = _baudRate;
    this.availableSlot = _availableSlot;

    CU12Logger.logStatus('Initializing CU12 controller', {
      path: _path,
      baudRate: _baudRate,
      availableSlots: _availableSlot
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
          CU12Logger.logError(error, 'SerialPort connection failed');
          return;
        } else {
          this.connected = true;
          CU12Logger.logConnection('CONNECTED', _path, _baudRate);
          return;
        }
      }
    );

    this.parser = this.serialPort.pipe(
      new ReadlineParser({
        delimiter: [0x02], // STX delimiter for CU12 packets
        encoding: 'binary'
      })
    );

    // Initialize board status maps
    this.boardStatus.set(0x00, false);
    this.boardStatus.set(0x01, false);

    // Initialize slot states (all closed initially)
    for (let i = 0; i < 15; i++) {
      this.slotStates.set(i, false);
    }

    CU12Logger.logStatus('CU12 controller initialized successfully');
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
        CU12Logger.logError(error, 'Port open failed');
        result = false;
        return;
      }
      CU12Logger.logStatus('Serial port opened successfully');
      result = true;
    });

    return result;
  }

  close() {
    this.serialPort.close((error) => {
      if (error) {
        CU12Logger.logError(error, 'Port close failed');
        return;
      }
      CU12Logger.logConnection('DISCONNECTED', this.path, this.baudRate);
    });
  }

  isConnected() {
    return this.connected;
  }

  /**
   * Send status check command to current board
   */
  sendCheckState() {
    CU12Logger.logStatus('Sending status check', {
      boardAddress: this.currentBoardAddress.toString(16)
    });

    const cmd = CU12PacketUtils.createStatusPacket(this.currentBoardAddress);
    CU12Logger.logPacket('TX', cmd, `Status check board ${this.currentBoardAddress.toString(16)}`);
    this.serialPort.write(cmd);
  }

  /**
   * Send status check command to both boards
   */
  sendCheckStateToAllBoards() {
    CU12Logger.logStatus('Sending status check to all boards');

    // Check board 0x00
    const cmd1 = CU12PacketUtils.createStatusPacket(0x00);
    CU12Logger.logPacket('TX', cmd1, 'Status check board 0x00');
    this.serialPort.write(cmd1);

    // Wait a bit then check board 0x01
    setTimeout(() => {
      const cmd2 = CU12PacketUtils.createStatusPacket(0x01);
      CU12Logger.logPacket('TX', cmd2, 'Status check board 0x01');
      this.serialPort.write(cmd2);
    }, 100);
  }

  /**
   * Parse status response from CU12
   */
  async receivedCheckState(packet: CU12Packet) {
    CU12Logger.logStatus('Received status response', {
      boardAddress: packet.address.toString(16),
      command: CU12PacketUtils.getCommandName(packet.command),
      hasStatusData: !!packet.statusData,
      statusDataLength: packet.statusData?.length || 0
    });

    // Update board status
    this.boardStatus.set(packet.address, true);

    // Process status data if available
    if (packet.statusData && packet.statusData.length >= 2) {
      try {
        // Parse 2-byte status data to extract 12-lock bitfield
        const lockStates = CU12PacketUtils.parseStatusData(packet.statusData);
        const ku16Slots = CU12PacketUtils.convertCul12StatesToKu16Slots(packet.address, lockStates);

        CU12Logger.logStatus('Parsed CU12 status data', {
          boardAddress: packet.address.toString(16),
          statusData: packet.statusData.map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '),
          lockStates: lockStates.map((locked, i) => `Lock ${i + 1}: ${locked ? 'LOCKED' : 'UNLOCKED'}`).join(', '),
          ku16Slots: ku16Slots.map(slot => `Slot ${slot + 1}`).join(', ')
        });

        // Update slot states based on parsed status data
        ku16Slots.forEach((ku16Slot, lockIndex) => {
          const isLocked = lockStates[lockIndex];
          this.slotStates.set(ku16Slot, !isLocked); // Store as "open" state (inverse of locked)
        });

        // Log the parsed status data
        const statusLog = CU12PacketUtils.formatStatusDataForLog(packet.statusData);
        systemLog(`check_state_received: board ${packet.address.toString(16)} ${statusLog}`);
        await logger({
          user: "system",
          message: `check_state_received: board ${packet.address.toString(16)} ${statusLog}`,
        });

      } catch (error) {
        CU12Logger.logError(error as Error, 'Failed to parse CU12 status data', {
          boardAddress: packet.address.toString(16),
          statusData: packet.statusData
        });
      }
    } else {
      // Fallback for responses without status data
      systemLog(`check_state_received: board ${packet.address.toString(16)} data [${Array.from([packet.lockNum, packet.ask]).map(b => b.toString(16)).join(' ')}] (no status data)`);
      await logger({
        user: "system",
        message: `check_state_received: board ${packet.address.toString(16)} data [${Array.from([packet.lockNum, packet.ask]).map(b => b.toString(16)).join(' ')}] (no status data)`,
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
        hn: isRealHardwareSlot ? (dbSlot?.dataValues?.hn || null) : null,
        occupied: isRealHardwareSlot ? (dbSlot?.dataValues?.occupied || false) : false,
        timestamp: isRealHardwareSlot ? (dbSlot?.dataValues?.timestamp || null) : null,
        opening: isRealHardwareSlot ? (dbSlot?.dataValues?.opening || false) : false,
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
      CU12Logger.logStatus('Cannot unlock: not connected or waiting for lock back');
      return;
    }

    await logger({
      user: "system",
      message: `sendUnlock: slot #${inputSlot.slotId}`,
    });

    try {
      // Map KU16 slot to CU12 address and lock
      const cu12Slot = mapKu16SlotToCu12(inputSlot.slotId);

      CU12Logger.logStatus('Unlocking slot', {
        ku16Slot: inputSlot.slotId,
        cu12Address: cu12Slot.address.toString(16),
        cu12Lock: cu12Slot.lock
      });

      const cmd = CU12PacketUtils.createUnlockPacket(cu12Slot.address, cu12Slot.lock);
      CU12Logger.logPacket('TX', cmd, `Unlock slot ${inputSlot.slotId} (board ${cu12Slot.address.toString(16)}, lock ${cu12Slot.lock})`);

      this.serialPort.write(cmd);
      this.opening = true;
      this.openingSlot = inputSlot;

      CU12Logger.logSlotState(inputSlot.slotId, 'closed', 'opening', 'sendUnlock');
    } catch (error) {
      CU12Logger.logError(error as Error, 'Failed to send unlock command', inputSlot);
    }
  }

  /**
   * Handle unlock response from CU12
   */
  async receivedUnlockState(packet: CU12Packet) {
    CU12Logger.logStatus('Received unlock response', {
      boardAddress: packet.address.toString(16),
      lockNum: packet.lockNum,
      command: CU12PacketUtils.getCommandName(packet.command)
    });

    try {
      // Convert CU12 address/lock back to KU16 slot
      const ku16Slot = mapCu12ToKu16Slot(packet.address, packet.lockNum);

      // Check if this matches our opening slot
      if (ku16Slot !== this.openingSlot?.slotId) {
        CU12Logger.logStatus('Unlock response for different slot', {
          expectedSlot: this.openingSlot?.slotId,
          receivedSlot: ku16Slot
        });
        return;
      }

      systemLog(`unlocked_received: unlock state for slot #${ku16Slot}`);
      await logger({
        user: "system",
        message: `unlocked_received: unlock state for slot #${ku16Slot}`,
      });

      this.waitForLockedBack = true;

      // Update slot state
      this.slotStates.set(ku16Slot, true);

      await Slot.update(
        { ...this.openingSlot, opening: true, occupied: false },
        { where: { slotId: this.openingSlot.slotId } }
      );

      CU12Logger.logSlotState(ku16Slot, 'locked', 'unlocked', 'unlock response');

      this.win.webContents.send("unlocking", {
        ...this.openingSlot,
        unlocking: true,
      });
    } catch (error) {
      CU12Logger.logError(error as Error, 'Failed to process unlock response', packet);
    }
  }

  /**
   * Handle locked back response from CU12
   */
  async receivedLockedBackState(packet: CU12Packet) {
    CU12Logger.logStatus('Received locked back response', {
      boardAddress: packet.address.toString(16),
      lockNum: packet.lockNum
    });

    try {
      // Convert CU12 address/lock back to KU16 slot
      const ku16Slot = mapCu12ToKu16Slot(packet.address, packet.lockNum);

      console.log("this.openingSlot: ", this.openingSlot);
      console.log("receivedLockedBackSlot: ", ku16Slot);

      if (ku16Slot === this.openingSlot?.slotId) {
        CU12Logger.logStatus('Slot still opening', {
          slotId: ku16Slot
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

      // Check if this slot is now locked (closed)
      if (this.slotStates.get(ku16Slot)) {
        CU12Logger.logStatus('Slot locked back', {
          slotId: ku16Slot
        });
        systemLog(`locked_back_received: slot #${this.openingSlot.slotId} locked back`);
        await logger({
          user: "system",
          message: `locked_back_received: slot #${this.openingSlot.slotId} locked back`,
        });

        this.waitForLockedBack = false;
        this.opening = false;
        this.dispensing = false;

        // Update slot state
        this.slotStates.set(ku16Slot, false);

        await Slot.update(
          { ...this.openingSlot, opening: false, occupied: true },
          { where: { slotId: this.openingSlot.slotId } }
        );

        CU12Logger.logSlotState(this.openingSlot.slotId, 'open', 'closed', 'locked back');

        this.win.webContents.send("unlocking", {
          ...this.openingSlot,
          unlocking: false,
        });
      } else {
        CU12Logger.logStatus('Locked back for slot that was not open', {
          slotId: ku16Slot
        });
      }
    } catch (error) {
      CU12Logger.logError(error as Error, 'Failed to process locked back response', packet);
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
      CU12Logger.logStatus('Dispense failed: user not found', {
        passkey: inputSlot.passkey
      });
      throw new Error("ไม่พบผู้ใช้งาน");
    }

    if (!this.isConnected() || this.waitForDispenseLockedBack) {
      await logger({
        user: "system",
        message: `dispense: not connected or waiting for dispense locked back`,
      });
      CU12Logger.logStatus('Cannot dispense: not connected or waiting', {
        slotId: inputSlot.slotId
      });
      return;
    }

    const slot = (await Slot.findOne({ where: { slotId: inputSlot.slotId } }))?.dataValues;

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
      CU12Logger.logStatus('Cannot dispense: slot not occupied', {
        slotId: inputSlot.slotId,
        occupied: slot?.occupied,
        hn: slot?.hn
      });
      return;
    }

    CU12Logger.logStatus('Starting dispensing', {
      slotId: inputSlot.slotId,
      userName: user.dataValues.name
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

    CU12Logger.logStatus('Dispensing response received', {
      slotId: ku16Slot,
      boardAddress: packet.address.toString(16),
      lockNum: packet.lockNum
    });

    systemLog(`dispensed_received: dispense state for slot #${ku16Slot}`);
    await logger({
      user: "system",
      message: `dispensed_received: dispense state for slot #${ku16Slot}`,
    });

    if (ku16Slot !== this.openingSlot?.slotId) {
      CU12Logger.logStatus('Dispensing response for different slot', {
        expectedSlot: this.openingSlot?.slotId,
        receivedSlot: ku16Slot
      });
      return;
    }

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
   */
  async receivedDispenseLockedBackState(packet: CU12Packet) {
    const ku16Slot = mapCu12ToKu16Slot(packet.address, packet.lockNum);

    if (ku16Slot === this.openingSlot?.slotId) {
      CU12Logger.logStatus('Dispensing still in progress', {
        slotId: ku16Slot
      });
      systemLog("dispense_locked_back_received: still opening");
      this.win.webContents.send("dispensing", {
        ...this.openingSlot,
        dispensing: true,
        reset: false,
      });
      return;
    }

    // Check if slot is now locked
    if (!this.slotStates.get(ku16Slot)) {
      CU12Logger.logStatus('Dispensing completed - slot locked back', {
        slotId: ku16Slot
      });
      systemLog(`dispense_locked_back_received: slot #${this.openingSlot.slotId} locked back`);
      await logger({
        user: "system",
        message: `dispense_locked_back_received: slot #${this.openingSlot.slotId} locked back`,
      });

      this.waitForDispenseLockedBack = false;
      this.opening = false;
      this.dispensing = false;

      this.win.webContents.send("dispensing", {
        ...this.openingSlot,
        dispensing: false,
        reset: true,
      });
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

    CU12Logger.logSlotState(slotId, 'unknown', 'reset', 'resetSlot');
    this.slotStates.set(slotId, false);

    await logger({
      user: "system",
      message: `resetSlot: slot #${slotId}`,
    });
  }

  /**
   * Deactivate slot
   */
  async deactivate(slotId: number) {
    await Slot.update(
      { isActive: false, hn: null, occupied: false, opening: false },
      { where: { slotId: slotId } }
    );

    CU12Logger.logStatus('Deactivating slot', { slotId });
    this.slotStates.set(slotId, false);

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
    CU12Logger.logStatus('Reactivating slot', { slotId });
    return await Slot.update(
      { isActive: true, hn: null, occupied: false, opening: false },
      { where: { slotId: slotId } }
    );
  }

  /**
   * Deactivate all slots
   */
  async deactiveAllSlots() {
    CU12Logger.logStatus('Deactivating all slots');
    return await Slot.update(
      { isActive: false },
      { where: { isActive: true } }
    );
  }

  /**
   * Reactivate all slots
   */
  async reactiveAllSlots() {
    CU12Logger.logStatus('Reactivating all slots');
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
      // CU12 packet structure: [STX, ADDR, LOCKNUM, CMD, ASK, DATALEN, ETX, SUM, STATUS0, STATUS1]
      // Minimum packet size is 10 bytes (without additional data)
      if (data.length < 10) {
        CU12Logger.logStatus('Packet too short for CU12 format', {
          length: data.length,
          data: Array.from(data).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ')
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
      const status0 = data[8];
      const status1 = data[9];

      // Validate STX (Start of Text)
      if (stx !== 0x02) {
        CU12Logger.logStatus('Invalid STX byte', {
          expected: '0x02',
          received: '0x' + stx.toString(16)
        });
        return null;
      }

      // Validate ETX (End of Text)
      if (etx !== 0x03) {
        CU12Logger.logStatus('Invalid ETX byte', {
          expected: '0x03',
          received: '0x' + etx.toString(16)
        });
        return null;
      }

      // Validate checksum (simple XOR checksum for CU12)
      const expectedChecksum = this.calculateCU12Checksum(data.slice(0, 7));
      if (checksum !== expectedChecksum) {
        CU12Logger.logStatus('Checksum mismatch', {
          expected: '0x' + expectedChecksum.toString(16),
          received: '0x' + checksum.toString(16)
        });
        return null;
      }

      // Parse status data if available (after the basic 10 bytes)
      let statusData: Buffer | undefined;
      if (data.length > 10) {
        statusData = data.slice(8, 8 + dataLen);
      }

      return {
        stx,
        address,
        lockNum,
        command,
        ask,
        dataLen,
        etx,
        checksum,
        statusData,
        status0,
        status1
      };
    } catch (error) {
      CU12Logger.logError(error as Error, 'Error parsing CU12 packet', {
        data: Array.from(data).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ')
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
   * Main data receiver for CU12 packets with enhanced parsing
   */
  receive() {
    CU12Logger.logStatus('Starting CU12 packet receiver with ReadlineParser');

    this.parser.on("data", async (data: Buffer) => {
      try {
        CU12Logger.logPacket('RX', data, 'Raw packet received');

        // Use enhanced flexible packet parsing
        const packet = this.parseCU12PacketFlexible(data);
        if (!packet) {
          CU12Logger.logStatus('Invalid CU12 packet received', {
            data: Array.from(data).map(b => b.toString(16)).join(' ')
          });
          return;
        }

        const commandName = CU12PacketUtils.getCommandName(packet.command);
        CU12Logger.logPacket('RX', packet, `Parsed CU12 packet: ${commandName}`);

        // Handle different packet types based on current state
        if (this.opening && !this.dispensing && !this.waitForLockedBack) {
          // Opening but not dispensing and not wait for lock
          CU12Logger.logStatus('Processing unlock response');
          await this.receivedUnlockState(packet);
        } else if (this.opening && this.waitForLockedBack) {
          // Opening and wait for locked back
          CU12Logger.logStatus('Processing locked back response');
          await this.receivedLockedBackState(packet);
          await this.receivedCheckState(packet); // Also update status
        } else if (this.opening && this.dispensing && !this.waitForDispenseLockedBack) {
          // Opening and dispensing but not wait for lock
          CU12Logger.logStatus('Processing dispensing response');
          await this.receivedDispenseState(packet);
        } else if (this.opening && this.dispensing && this.waitForDispenseLockedBack) {
          // Opening, dispensing, and wait for lock
          CU12Logger.logStatus('Processing dispensing locked back response');
          await this.receivedDispenseLockedBackState(packet);
          await this.receivedCheckState(packet); // Also update status
        } else {
          // Regular status check
          CU12Logger.logStatus('Processing status check response');
          await this.receivedCheckState(packet);
        }
      } catch (error) {
        CU12Logger.logError(error as Error, 'Error processing CU12 packet', {
          data: Array.from(data).map(b => b.toString(16)).join(' ')
        });
      }
    });
  }
}