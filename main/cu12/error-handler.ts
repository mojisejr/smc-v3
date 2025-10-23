/**
 * CU12 Error Handler - Example Implementation
 * 
 * This file demonstrates how to properly handle CU12 errors using shared types.
 * It can be used by both main and renderer processes without causing webpack errors.
 * 
 * IMPORTANT: This is an example implementation. Integrate into actual error handling
 * logic as needed.
 */

import {
  CU12ErrorCode,
  CU12ProtocolError,
  CU12ConnectionError,
  CU12CommandError,
  CU12ErrorResponse,
} from '@shared/types';

/**
 * CU12 Error Handler Class
 * Provides centralized error handling for CU12 protocol operations
 */
export class CU12ErrorHandler {
  /**
   * Handle protocol errors
   */
  static handleProtocolError(error: CU12ProtocolError): CU12ErrorResponse {
    console.error(`[CU12 Protocol Error] Code: ${error.code}, Message: ${error.message}`);
    
    const isRetryable = this.isProtocolErrorRetryable(error.code);
    
    return {
      success: false,
      error,
      retryable: isRetryable,
      retryAfter: isRetryable ? 1000 : undefined, // 1 second delay for retryable errors
    };
  }

  /**
   * Handle connection errors
   */
  static handleConnectionError(error: CU12ConnectionError): CU12ErrorResponse {
    console.error(`[CU12 Connection Error] Type: ${error.type}, Message: ${error.message}`);
    
    return {
      success: false,
      error,
      retryable: true,
      retryAfter: 3000, // 3 second delay before retry
    };
  }

  /**
   * Handle command errors
   */
  static handleCommandError(error: CU12CommandError): CU12ErrorResponse {
    console.error(`[CU12 Command Error] Command: 0x${error.command.toString(16)}, Message: ${error.message}`);
    
    return {
      success: false,
      error,
      retryable: true,
      retryAfter: 500, // 500ms delay before retry
    };
  }

  /**
   * Determine if a protocol error is retryable
   */
  private static isProtocolErrorRetryable(code: number): boolean {
    switch (code) {
      case CU12ErrorCode.DEVICE_BUSY:
      case CU12ErrorCode.CONNECTION_TIMEOUT:
      case CU12ErrorCode.CONNECTION_LOST:
      case CU12ErrorCode.COMMAND_TIMEOUT:
        return true;
      
      case CU12ErrorCode.INVALID_COMMAND:
      case CU12ErrorCode.INVALID_ADDRESS:
      case CU12ErrorCode.INVALID_PARAMETER:
      case CU12ErrorCode.SLOT_NOT_FOUND:
        return false;
      
      default:
        return false;
    }
  }

  /**
   * Create a protocol error
   */
  static createProtocolError(
    code: CU12ErrorCode,
    message: string,
    command?: number,
    address?: number
  ): CU12ProtocolError {
    return {
      code,
      command,
      message,
      address,
      timestamp: Date.now(),
    };
  }

  /**
   * Create a connection error
   */
  static createConnectionError(
    type: 'tcp' | 'rs485',
    message: string,
    connectionDetails: { host?: string; port?: number; path?: string }
  ): CU12ConnectionError {
    return {
      type,
      message,
      timestamp: Date.now(),
      ...connectionDetails,
    };
  }

  /**
   * Create a command error
   */
  static createCommandError(
    command: number,
    message: string,
    slotId?: number,
    originalError?: Error
  ): CU12CommandError {
    return {
      command,
      slotId,
      message,
      originalError,
      timestamp: Date.now(),
    };
  }

  /**
   * Get user-friendly error message
   */
  static getUserFriendlyMessage(errorCode: CU12ErrorCode): string {
    switch (errorCode) {
      case CU12ErrorCode.INVALID_COMMAND:
        return 'คำสั่งไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง';
      case CU12ErrorCode.INVALID_ADDRESS:
        return 'ที่อยู่อุปกรณ์ไม่ถูกต้อง';
      case CU12ErrorCode.INVALID_PARAMETER:
        return 'พารามิเตอร์ไม่ถูกต้อง';
      case CU12ErrorCode.DEVICE_BUSY:
        return 'อุปกรณ์กำลังทำงาน กรุณารอสักครู่';
      case CU12ErrorCode.OPERATION_FAILED:
        return 'การดำเนินการล้มเหลว';
      case CU12ErrorCode.CONNECTION_TIMEOUT:
        return 'หมดเวลาการเชื่อมต่อ';
      case CU12ErrorCode.CONNECTION_LOST:
        return 'การเชื่อมต่อขาดหาย';
      case CU12ErrorCode.CONNECTION_REFUSED:
        return 'การเชื่อมต่อถูกปฏิเสธ';
      case CU12ErrorCode.COMMAND_TIMEOUT:
        return 'คำสั่งหมดเวลา';
      case CU12ErrorCode.COMMAND_FAILED:
        return 'คำสั่งล้มเหลว';
      case CU12ErrorCode.INVALID_RESPONSE:
        return 'การตอบสนองไม่ถูกต้อง';
      case CU12ErrorCode.SLOT_NOT_FOUND:
        return 'ไม่พบช่องที่ระบุ';
      case CU12ErrorCode.SLOT_BUSY:
        return 'ช่องกำลังถูกใช้งาน';
      case CU12ErrorCode.SLOT_LOCKED:
        return 'ช่องถูกล็อค';
      case CU12ErrorCode.SLOT_EMPTY:
        return 'ช่องว่าง';
      default:
        return 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
    }
  }
}

// Example usage:
// const error = CU12ErrorHandler.createProtocolError(
//   CU12ErrorCode.DEVICE_BUSY,
//   'Device is currently processing another command',
//   0x80,
//   0x00
// );
// const response = CU12ErrorHandler.handleProtocolError(error);
// console.log(CU12ErrorHandler.getUserFriendlyMessage(error.code));
