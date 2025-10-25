/**
 * CU12 Packet Utilities
 *
 * CU12 Protocol: [STX, ADDR, LOCKNUM, CMD, ASK, DATALEN, ETX, SUM]
 * STX: 0x02, ETX: 0x03
 * ADDR: Board address (0x00 or 0x01)
 * LOCKNUM: Lock number 0-11
 * CMD: 0x30 (Status) or 0x31 (Unlock)
 * ASK: 0x00
 * DATALEN: 0x00 (no data for basic commands)
 * SUM: XOR checksum of all bytes except STX and ETX
 */

export interface CU12Packet {
  stx: number;        // 0x02
  address: number;    // 0x00 or 0x01 (board address)
  lockNum: number;    // Lock number 0-11
  command: number;    // 0x30 (Status) or 0x31 (Unlock)
  ask: number;        // 0x00
  dataLen: number;    // 0x00 (no data for basic commands)
  etx: number;        // 0x03
  checksum: number;   // XOR checksum
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
    return this.createPacket(address, 0, 0x30);
  }

  /**
   * Create CU12 unlock packet for specific board and lock
   */
  static createUnlockPacket(address: number, lockNum: number): Buffer {
    return this.createPacket(address, lockNum, 0x31);
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

    // Calculate XOR checksum for bytes between STX and ETX (inclusive of ADDR, exclusive of ETX)
    let checksum = address ^ lockNum ^ command ^ this.ASK ^ this.DATA_LEN;
    packet.push(checksum);

    return Buffer.from(packet);
  }

  /**
   * Parse CU12 response packet
   */
  static parseResponse(data: Buffer): CU12Packet | null {
    if (data.length < 8 || data[0] !== this.STX || data[6] !== this.ETX) {
      return null;
    }

    const packet: CU12Packet = {
      stx: data[0],
      address: data[1],
      lockNum: data[2],
      command: data[3],
      ask: data[4],
      dataLen: data[5],
      etx: data[6],
      checksum: data[7]
    };

    // Verify checksum
    const expectedChecksum = packet.address ^ packet.lockNum ^ packet.command ^ packet.ask ^ packet.dataLen;
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
      case 0x30:
        return "STATUS";
      case 0x31:
        return "UNLOCK";
      default:
        return "UNKNOWN";
    }
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