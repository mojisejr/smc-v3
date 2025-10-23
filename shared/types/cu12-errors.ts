/**
 * CU12 Protocol Error Interfaces
 * Shared type definitions for CU12 error handling
 * 
 * These interfaces are used by both main and renderer processes
 * to ensure consistent error handling across the application.
 */

/**
 * CU12 Protocol Error
 * Represents protocol-level errors (command failures, invalid responses, etc.)
 */
export interface CU12ProtocolError {
  code: number;           // Protocol error code (0x10-0x14)
  command?: number;        // Command that failed (0x80, 0x81, etc.)
  message: string;        // Human-readable error message
  address?: number;       // Device address where error occurred
  timestamp?: number;     // When the error occurred
}

/**
 * CU12 Connection Error
 * Represents connection-level errors (network, serial port, etc.)
 */
export interface CU12ConnectionError {
  type: 'tcp' | 'rs485';  // Connection type
  host?: string;          // For TCP connections
  port?: number;          // For TCP connections
  path?: string;          // For RS485 connections
  message: string;        // Human-readable error message
  timestamp?: number;     // When the error occurred
}

/**
 * CU12 Command Error
 * Represents command execution errors
 */
export interface CU12CommandError {
  command: number;        // Command code (0x80-0x8F)
  slotId?: number;        // Slot involved in the error
  message: string;        // Human-readable error message
  originalError?: Error;  // Original error object if available
  timestamp?: number;     // When the error occurred
}

/**
 * CU12 Error Handler Response
 * Standard response format for error handling
 */
export interface CU12ErrorResponse {
  success: boolean;
  error?: CU12ProtocolError | CU12ConnectionError | CU12CommandError;
  retryable: boolean;     // Whether the operation can be retried
  retryAfter?: number;    // Milliseconds to wait before retry
}

/**
 * CU12 Error Codes
 * Standard error codes used in CU12 protocol
 */
export enum CU12ErrorCode {
  // Protocol errors (0x10-0x14)
  INVALID_COMMAND = 0x10,
  INVALID_ADDRESS = 0x11,
  INVALID_PARAMETER = 0x12,
  DEVICE_BUSY = 0x13,
  OPERATION_FAILED = 0x14,
  
  // Connection errors (custom codes > 0x20)
  CONNECTION_TIMEOUT = 0x20,
  CONNECTION_LOST = 0x21,
  CONNECTION_REFUSED = 0x22,
  
  // Command errors (custom codes > 0x30)
  COMMAND_TIMEOUT = 0x30,
  COMMAND_FAILED = 0x31,
  INVALID_RESPONSE = 0x32,
  
  // Slot errors (custom codes > 0x40)
  SLOT_NOT_FOUND = 0x40,
  SLOT_BUSY = 0x41,
  SLOT_LOCKED = 0x42,
  SLOT_EMPTY = 0x43,
}
