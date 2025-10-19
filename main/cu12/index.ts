/**
 * CU12 Adapter Class
 * Provides KU16-compatible interface for CU12 protocol hardware
 *
 * Adapts the CU12 implementation from new-modules/ku.module.ts
 * to maintain exact same API as existing KU16 class
 */

import { SerialPort } from "serialport";
import { BrowserWindow } from "electron";
import { Slot } from "../../db/model/slot.model";
import { User } from "../../db/model/user.model";
import { SlotState } from "../interfaces/slotState";
import { ILockController } from "../interfaces/lock-controller";
import { logger, systemLog } from "../logger";
import { KerrongCU12, createController } from "../../new-modules/ku.module";

// Type definitions for compatibility
interface OpeningSlot {
  slotId: number;
  hn: string;
  timestamp: number;
  passkey?: string;
}

/**
 * CU12 Adapter - KU16-compatible interface for CU12 hardware
 *
 * Key differences handled internally:
 * - KU16: 16 locks, fixed 5-byte packets, RS485 only
 * - CU12: 12 locks, variable 8-48 byte packets, RS485+TCP
 * - Protocol translation: 0x30→0x80, slot mapping 1-16→1-12
 */
export class CU12Adapter implements ILockController {
  private cu12: KerrongCU12; // CU12 implementation
  public win: BrowserWindow;
  private path: string;
  private baudRate: number;
  private availableSlot: number;
  public connected = false;
  private opening = false;
  private dispensing = false;
  private openingSlot: OpeningSlot | null = null;
  private waitForLockedBack = false;
  private waitForDispenseLockedBack = false;

  constructor(
    _path: string,
    _baudRate: number,
    _availableSlot: number,
    _win: BrowserWindow
  ) {
    console.log("CU12_ADAPTER: Constructor called with:", {
      path: _path,
      baudRate: _baudRate,
      availableSlot: _availableSlot
    });

    this.win = _win;
    this.path = _path;
    this.baudRate = _baudRate;
    this.availableSlot = Math.min(_availableSlot, 12); // CU12 max 12 locks

    console.log("CU12_ADAPTER: About to initialize KerrongCU12...");

    // Initialize CU12 with RS485 configuration
    this.cu12 = new KerrongCU12({
      model: "CU12",
      address: 0x00,
      connection: {
        type: "rs485",
        path: _path,
        baudRate: _baudRate as 9600 | 19200 | 57600 | 115200,
        timeout: 5000,
        autoReconnect: true,
        reconnectInterval: 3000,
      },
    });

    console.log("CU12_ADAPTER: KerrongCU12 initialized, setting up handlers...");
    this.setupEventHandlers();
    console.log("CU12_ADAPTER: Constructor completed");
  }

  /**
   * Setup event handlers for CU12 responses
   */
  private setupEventHandlers(): void {
    this.cu12.on("connected", () => {
      this.connected = true;
      systemLog("CU12_ADAPTER: Connected to CU12 device");
      logger({ user: "system", message: "CU12_ADAPTER: Connected to CU12 device" });
    });

    this.cu12.on("disconnected", () => {
      this.connected = false;
      systemLog("CU12_ADAPTER: Disconnected from CU12 device");
      logger({ user: "system", message: "CU12_ADAPTER: Disconnected from CU12 device" });
    });

    this.cu12.on("error", (error: Error) => {
      systemLog(`CU12_ADAPTER: Error - ${error.message}`);
      logger({ user: "system", message: `CU12_ADAPTER: Error - ${error.message}` });
    });

    this.cu12.on("reconnecting", () => {
      systemLog("CU12_ADAPTER: Reconnecting to CU12 device");
    });
  }

  /**
   * Get the underlying SerialPort instance (for compatibility)
   */
  getSerialPort(): SerialPort {
    // CU12 uses internal connection management
    // Return mock SerialPort for compatibility
    return new SerialPort({
      path: this.path,
      baudRate: this.baudRate,
      autoOpen: false, // Don't actually open, just for compatibility
    });
  }

  /**
   * Static method to list available ports
   */
  public static async LIST(): Promise<any[]> {
    return SerialPort.list();
  }

  /**
   * Open connection to CU12 device
   */
  async open(): Promise<boolean> {
    try {
      await this.cu12.connect();
      return true;
    } catch (error) {
      console.error("CU12_ADAPTER: Port open error:", error);
      return false;
    }
  }

  /**
   * Close connection to CU12 device
   */
  close(): void {
    this.cu12.disconnect();
  }

  /**
   * Check connection status
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Send status check command (KU16 0x30 → CU12 0x80)
   */
  async sendCheckState(): Promise<void> {
    if (!this.connected) return;

    try {
      systemLog("CU12_ADAPTER: Sending status check (0x30 → 0x80)");
      await logger({ user: "system", message: "CU12_ADAPTER: Sending status check command" });

      // CU12 uses 0x80 for status (equivalent to KU16 0x30)
      const response = await this.cu12.sendCommand(0x80);
      await this.handleStatusResponse(response);
    } catch (error) {
      systemLog(`CU12_ADAPTER: Status check failed - ${error}`);
      await logger({ user: "system", message: `CU12_ADAPTER: Status check failed - ${error}` });
    }
  }

  /**
   * Handle status response and emit to frontend
   */
  private async handleStatusResponse(response: any): Promise<void> {
    try {
      const slotData = await this.slotBinParser(response);
      this.win.webContents.send("init-res", slotData);

      systemLog(`CU12_ADAPTER: Status response sent to frontend`);
      await logger({ user: "system", message: "CU12_ADAPTER: Status response sent to frontend" });
    } catch (error) {
      systemLog(`CU12_ADAPTER: Status response handling failed - ${error}`);
    }
  }

  /**
   * Send unlock command for specific slot
   * Maps KU16 slotId (1-16) to CU12 slotId (1-12)
   */
  async sendUnlock(inputSlot: OpeningSlot): Promise<void> {
    if (!this.connected || this.waitForLockedBack) return;

    // Map KU16 slot (1-16) to CU12 slot (1-12)
    const cu12SlotId = this.mapKU16SlotToCU12(inputSlot.slotId);
    if (cu12SlotId === -1) {
      systemLog(`CU12_ADAPTER: Invalid slot mapping - KU16:${inputSlot.slotId} → CU12:invalid`);
      return;
    }

    await logger({
      user: "system",
      message: `CU12_ADAPTER: sendUnlock - KU16:${inputSlot.slotId} → CU12:${cu12SlotId}`,
    });

    try {
      // CU12 unlock command
      await this.cu12.unlock(cu12SlotId);
      this.opening = true;
      this.openingSlot = inputSlot;
      this.waitForLockedBack = true;

      // Update database and emit event
      await Slot.update(
        { ...inputSlot, opening: true, occupied: false },
        { where: { slotId: inputSlot.slotId } }
      );

      this.win.webContents.send("unlocking", {
        ...inputSlot,
        unlocking: true,
      });

      systemLog(`CU12_ADAPTER: Unlock sent for slot ${cu12SlotId}`);
    } catch (error) {
      systemLog(`CU12_ADAPTER: Unlock failed - ${error}`);
    }
  }

  /**
   * Dispense medication from specific slot
   */
  async dispense(inputSlot: OpeningSlot): Promise<void> {
    const user = await User.findOne({ where: { passkey: inputSlot.passkey } });

    if (!user) {
      await logger({
        user: "system",
        message: "CU12_ADAPTER: dispense - user not found",
      });
      throw new Error("ไม่พบผู้ใช้งาน");
    }

    if (!this.connected || this.waitForDispenseLockedBack) {
      await logger({
        user: "system",
        message: "CU12_ADAPTER: dispense - not connected or waiting for dispense locked back",
      });
      return;
    }

    const slot = (await Slot.findOne({ where: { slotId: inputSlot.slotId } }))?.dataValues;

    if (!slot.occupied || !slot.hn) {
      await logger({
        user: "system",
        message: "CU12_ADAPTER: dispense - slot not occupied or hn is empty",
      });
      return;
    }

    // Map KU16 slot to CU12 slot
    const cu12SlotId = this.mapKU16SlotToCU12(inputSlot.slotId);
    if (cu12SlotId === -1) return;

    try {
      await this.cu12.unlock(cu12SlotId);
      this.opening = true;
      this.dispensing = true;
      this.openingSlot = inputSlot;
      this.waitForDispenseLockedBack = true;

      await logger({
        user: "system",
        message: `CU12_ADAPTER: dispense - slot ${cu12SlotId}`,
      });

      systemLog(`CU12_ADAPTER: Dispense sent for slot ${cu12SlotId}`);
    } catch (error) {
      systemLog(`CU12_ADAPTER: Dispense failed - ${error}`);
    }
  }

  /**
   * Map KU16 slot number (1-16) to CU12 slot number (1-12)
   * CU12 only supports 12 locks, so slots 13-16 map to -1 (invalid)
   */
  private mapKU16SlotToCU12(ku16SlotId: number): number {
    if (ku16SlotId < 1 || ku16SlotId > 16) return -1;
    if (ku16SlotId > 12) return -1; // CU12 only has 12 locks
    return ku16SlotId;
  }

  /**
   * Parse slot binary data for compatibility with KU16 format
   */
  private async slotBinParser(response: any): Promise<SlotState[]> {
    if (!response.status) return [];

    const slotFromDb = await Slot.findAll();
    const slotArr: SlotState[] = [];

    // CU12 provides status for 12 locks max
    const maxSlots = Math.min(this.availableSlot, 12);

    for (let i = 0; i < maxSlots; i++) {
      const byteIndex = i < 8 ? 0 : 1;
      const bitIndex = i % 8;

      const hookByte = byteIndex === 0 ? response.status.hookStatus1 : response.status.hookStatus2;
      const irByte = byteIndex === 0 ? response.status.infraredStatus1 : response.status.infraredStatus2;

      const isLocked = (hookByte & (1 << bitIndex)) !== 0;
      const hasItem = (irByte & (1 << bitIndex)) !== 0;

      slotArr.push({
        slotId: slotFromDb[i]?.dataValues.slotId ?? i + 1,
        hn: slotFromDb[i]?.dataValues.hn ?? null,
        occupied: slotFromDb[i]?.dataValues.occupied ?? hasItem,
        timestamp: slotFromDb[i]?.dataValues.timestamp ?? null,
        opening: slotFromDb[i]?.dataValues.opening ?? false,
        isActive: slotFromDb[i]?.dataValues.isActive ?? !isLocked,
      });
    }

    return slotArr;
  }

  /**
   * Reset slot to default state
   */
  async resetSlot(slotId: number): Promise<void> {
    await Slot.update(
      { hn: null, occupied: false, opening: false },
      { where: { slotId: slotId } }
    );
    await logger({
      user: "system",
      message: `CU12_ADAPTER: resetSlot - slot #${slotId}`,
    });
  }

  /**
   * Deactivate specific slot
   */
  async deactivate(slotId: number): Promise<void> {
    await Slot.update(
      { isActive: false, hn: null, occupied: false, opening: false },
      { where: { slotId: slotId } }
    );

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

    await logger({
      user: "system",
      message: `CU12_ADAPTER: deactivate - slot #${slotId}`,
    });
  }

  /**
   * Reactivate specific slot
   */
  async reactive(slotId: number): Promise<any> {
    return await Slot.update(
      { isActive: true, hn: null, occupied: false, opening: false },
      { where: { slotId: slotId } }
    );
  }

  /**
   * Deactivate all slots
   */
  async deactiveAllSlots(): Promise<any> {
    return await Slot.update(
      { isActive: false },
      { where: { isActive: true } }
    );
  }

  /**
   * Reactivate all slots
   */
  async reactiveAllSlots(): Promise<any> {
    return await Slot.update(
      { isActive: true },
      { where: { isActive: false } }
    );
  }

  /**
   * Start receiving data from CU12 device
   * Setup continuous monitoring
   */
  receive(): void {
    systemLog("CU12_ADAPTER: Starting receive monitoring");

    // CU12 handles responses internally, we just need to poll status
    // This could be enhanced with proper event-driven approach
    const pollStatus = async () => {
      if (this.connected) {
        await this.sendCheckState();
      }
      // Poll every 2 seconds (configurable)
      setTimeout(pollStatus, 2000);
    };

    pollStatus();
  }

  /**
   * Utility sleep function
   */
  sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default CU12Adapter;