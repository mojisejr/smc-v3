/**
 * Lock Controller Interface
 * Defines common interface for both KU16 and CU12Adapter
 */

import { BrowserWindow } from "electron";
import { SerialPort } from "serialport";

export interface ILockController {
  // Connection management
  getSerialPort(): SerialPort;
  open(): boolean | Promise<boolean>;
  close(): void;
  connected: boolean;
  isConnected(): boolean;
  receive(): void;

  // Window access for handlers
  win: BrowserWindow;

  // Slot operations
  sendUnlock(inputSlot: {
    slotId: number;
    hn: string;
    timestamp: number;
  }): Promise<void>;

  sendCheckState(): void | Promise<void>;

  dispense(inputSlot: {
    slotId: number;
    hn: string;
    timestamp: number;
    passkey: string;
  }): Promise<void>;

  resetSlot(slotId: number): Promise<void>;
  deactivate(slotId: number): Promise<void>;
  reactive(slotId: number): Promise<any>;
  deactiveAllSlots(): Promise<any>;
  reactiveAllSlots(): Promise<any>;

  // Utility
  sleep(ms: number): Promise<any>;
}