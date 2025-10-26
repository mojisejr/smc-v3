/**
 * CU12 Packet Utilities
 *
 * CU12 Protocol: [STX, ADDR, LOCKNUM, CMD, ASK, DATALEN, ETX, SUM, STATUS0, STATUS1]
 * STX: 0x02, ETX: 0x03
 * ADDR: Board address (0x00 or 0x01)
 * LOCKNUM: Lock number 0-11
 * CMD: 0x80 (Status) or 0x81 (Unlock)
 * ASK: 0x00
 * DATALEN: 0x00 (no data for basic commands), 0x02 (for status responses with 2-byte lock data)
 * STATUS DATA: 2 bytes representing 12-lock bitfield (only for status responses) - comes AFTER checksum
 *   - First byte: Locks 1-8 (bit 0 = Lock 1, bit 7 = Lock 8)
 *   - Second byte: Locks 9-12 (bit 0 = Lock 9, bit 3 = Lock 12)
 *   - Bit = 1 means LOCKED (closed), Bit = 0 means UNLOCKED (open)
 * SUM: Sum of all bytes modulo 256 (calculated on STX..ETX only, not including status bytes)
 */

export interface CU12Packet {
  stx: number;        // 0x02
  address: number;    // 0x00 or 0x01 (board address)
  lockNum: number;    // Lock number 0-11
  command: number;    // 0x80 (Status) or 0x81 (Unlock)
  ask: number;        // 0x00
  dataLen: number;    // 0x00 (no data for basic commands), 0x02 for status responses with lock data
  etx: number;        // 0x03
  checksum: number;   // Sum modulo 256
  statusData?: number[]; // Optional status data bytes (for status responses)
}

export class CU12PacketUtils {
  private static readonly STX = 0x02;
  private static readonly ETX = 0x03;
  private static readonly ASK = 0x00;
  private static readonly DATA_LEN = 0x00;

  /**
   * Create CU12 status check packet for specific board
   */
  static createStatusPacket(address: number): Buffer {
    return this.createPacket(address, 0, 0x80);
  }

  /**
   * Create CU12 unlock packet for specific board and lock
   */
  static createUnlockPacket(address: number, lockNum: number): Buffer {
    return this.createPacket(address, lockNum, 0x81);
  }

  /**
   * Create CU12 packet with given parameters
   */
  private static createPacket(address: number, lockNum: number, command: number): Buffer {
    const packet = [
      this.STX,
      address,
      lockNum,
      command,
      this.ASK,
      this.DATA_LEN,
      this.ETX
    ];

    // Calculate checksum as sum of all bytes modulo 256 (correct CU12 protocol)
    const checksum = packet.reduce((sum, byte) => sum + byte, 0) & 0xFF;
    packet.push(checksum);

    return Buffer.from(packet);
  }

  /**
   * Parse CU12 response packet
   * CU12 status responses are always 10 bytes: [STX, ADDR, LOCKNUM, CMD, ASK, DATALEN, ETX, SUM, STATUS0, STATUS1]
   */
  static parseResponse(data: Buffer): CU12Packet | null {
    if (data.length < 8 || data[0] !== this.STX) {
      return null;
    }

    // For CU12, basic packets are 8 bytes, status responses are 10 bytes
    const isStatusResponse = data.length >= 10 && data[3] === 0x80;

    // ETX is always at position 6 for CU12 protocol
    const etxPosition = 6;

    if (etxPosition >= data.length || data[etxPosition] !== this.ETX) {
      return null;
    }

    const packet: CU12Packet = {
      stx: data[0],
      address: data[1],
      lockNum: data[2],
      command: data[3],
      ask: data[4],
      dataLen: data[5],
      etx: data[etxPosition],
      checksum: data[etxPosition + 1]
    };

    // Extract status data if present (for status responses) - comes AFTER checksum
    if (isStatusResponse && data.length >= 10) {
      const statusDataStart = 8; // After checksum (position 7)
      const statusDataEnd = statusDataStart + 2; // CU12 status responses always have 2 bytes

      if (statusDataEnd <= data.length) {
        packet.statusData = Array.from(data.slice(statusDataStart, statusDataEnd));
      }
    }

    // Verify checksum using sum modulo 256 (calculated on STX..ETX only, not including status bytes)
    const packetBytes = [
      packet.stx,
      packet.address,
      packet.lockNum,
      packet.command,
      packet.ask,
      packet.dataLen,
      packet.etx
    ];

    const expectedChecksum = packetBytes.reduce((sum, byte) => sum + byte, 0) & 0xFF;

    if (packet.checksum !== expectedChecksum) {
      return null;
    }

    return packet;
  }

  /**
   * Get command name from command byte
   */
  static getCommandName(command: number): string {
    switch (command) {
      case 0x80:
        return "STATUS";
      case 0x81:
        return "UNLOCK";
      default:
        return "UNKNOWN";
    }
  }

  /**
   * Parse CU12 2-byte status data to extract 12-lock bitfield
   * Returns array of 12 boolean values (true = locked, false = unlocked)
   */
  static parseStatusData(statusBytes: number[]): boolean[] {
    if (statusBytes.length !== 2) {
      throw new Error(`Invalid status data length: ${statusBytes.length}. Expected 2 bytes.`);
    }

    const lockStates: boolean[] = [];

    // Parse first byte (locks 0-7)
    const byte1 = statusBytes[0];
    for (let i = 0; i < 8; i++) {
      // Extract bit i (0 = LSB = Lock 1)
      const bit = (byte1 >> i) & 0x01;
      lockStates.push(bit === 1); // true = locked, false = unlocked
    }

    // Parse second byte (locks 8-11, only use 4 bits)
    const byte2 = statusBytes[1];
    for (let i = 0; i < 4; i++) {
      // Extract bit i (0 = LSB = Lock 9)
      const bit = (byte2 >> i) & 0x01;
      lockStates.push(bit === 1); // true = locked, false = unlocked
    }

    return lockStates;
  }

  /**
   * Convert CU12 lock states to KU16 slot states
   * CU12 Board 0x00 → KU16 slots 1-12
   * CU12 Board 0x01 → KU16 slots 13-15 (only first 3 locks used)
   */
  static convertCul12StatesToKu16Slots(boardAddress: number, lockStates: boolean[]): number[] {
    const ku16Slots: number[] = [];

    if (boardAddress === 0x00) {
      // Board 0x00: Locks 0-11 → KU16 slots 1-12
      for (let i = 0; i < Math.min(lockStates.length, 12); i++) {
        ku16Slots.push(i); // KU16 slot 0-11 (displayed as 1-12)
      }
    } else if (boardAddress === 0x01) {
      // Board 0x01: Locks 0-2 → KU16 slots 13-15
      for (let i = 0; i < Math.min(lockStates.length, 3); i++) {
        ku16Slots.push(i + 12); // KU16 slot 12-14 (displayed as 13-15)
      }
    }

    return ku16Slots;
  }

  /**
   * Format status data for logging
   */
  static formatStatusDataForLog(statusData: number[]): string {
    if (!statusData || statusData.length === 0) {
      return "No status data";
    }

    const lockStates = this.parseStatusData(statusData);
    const lockInfo = lockStates.map((locked, index) =>
      `Lock ${index + 1}: ${locked ? 'LOCKED' : 'UNLOCKED'}`
    ).join(', ');

    return `Status bytes: [${statusData.map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ')}] → ${lockInfo}`;
  }

  /**
   * Format packet for logging
   */
  static formatPacketForLog(packet: CU12Packet | Buffer, direction: 'TX' | 'RX'): string {
    if (Buffer.isBuffer(packet)) {
      const parsed = this.parseResponse(packet);
      if (!parsed) {
        return `${direction}: [${Array.from(packet).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ')}] (INVALID)`;
      }
      packet = parsed;
    }

    const packetObj = packet as CU12Packet;
    return `${direction}: [STX, 0x${packetObj.address.toString(16).padStart(2, '0')}, 0x${packetObj.lockNum.toString(16).padStart(2, '0')}, 0x${packetObj.command.toString(16).padStart(2, '0')}, 0x${packetObj.ask.toString(16).padStart(2, '0')}, 0x${packetObj.dataLen.toString(16).padStart(2, '0')}, ETX, 0x${packetObj.checksum.toString(16).padStart(2, '0')}] (${this.getCommandName(packetObj.command)})`;
  }
}

/**
 * KU16 to CU12 slot mapping
 * KU16 Channel 0-11 → CU12 Address 0x00, Lock 0-11
 * KU16 Channel 12-14 → CU12 Address 0x01, Lock 0-2
 */
export function mapKu16SlotToCu12(slotId: number): { address: number; lock: number } {
  if (slotId < 0 || slotId > 14) {
    throw new Error(`Invalid KU16 slot ID: ${slotId}. Must be 0-14.`);
  }

  if (slotId <= 11) {
    return { address: 0x00, lock: slotId };
  } else {
    return { address: 0x01, lock: slotId - 12 };
  }
}

/**
 * CU12 to KU16 slot mapping (reverse mapping)
 */
export function mapCu12ToKu16Slot(address: number, lock: number): number {
  if (address === 0x00) {
    return lock;
  } else if (address === 0x01) {
    return lock + 12;
  } else {
    throw new Error(`Invalid CU12 address: ${address}. Must be 0x00 or 0x01.`);
  }
}