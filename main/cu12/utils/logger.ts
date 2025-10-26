import { CU12Packet } from './packet-utils';

/**
 * Enhanced CU12 Logger for debugging
 * Provides detailed logging for CU12 serial communication
 */
export class CU12Logger {
  private static readonly PREFIX = '[CU12]';

  /**
   * Log CU12 packet transmission or reception
   */
  static logPacket(direction: 'TX' | 'RX', packet: Buffer | CU12Packet, context?: string): void {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` (${context})` : '';

    // Use the packet utils formatter for consistent logging
    const { CU12PacketUtils } = require('./packet-utils');
    const packetStr = CU12PacketUtils.formatPacketForLog(packet, direction);

    const message = `${this.PREFIX} ${timestamp}${contextStr} ${packetStr}`;

    // Log to console (will be visible in VS Code debug console)
    console.log(message);

    // Also log to system logger if available
    try {
      const { systemLog } = require('../../logger');
      systemLog(message);
    } catch (error) {
      // System logger not available, continue with console logging
    }
  }

  /**
   * Log CU12 error with context
   */
  static logError(error: Error, context: string, additionalInfo?: any): void {
    const timestamp = new Date().toISOString();
    const errorMessage = `${this.PREFIX} ERROR ${timestamp} [${context}] ${error.message}`;

    console.error(errorMessage);
    console.error(error.stack);

    if (additionalInfo) {
      console.error('Additional info:', additionalInfo);
    }

    // Also log to system logger if available
    try {
      const { systemLog, logger } = require('../../logger');
      systemLog(errorMessage);
      if (logger) {
        logger({
          user: "system",
          message: `${errorMessage} - ${error.stack || ''}`
        });
      }
    } catch (logError) {
      // System logger not available, continue with console logging
    }
  }

  /**
   * Log CU12 status and information
   */
  static logStatus(message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const statusMessage = `${this.PREFIX} INFO ${timestamp} ${message}`;

    console.log(statusMessage);
    if (data) {
      console.log('Data:', data);
    }

    // Also log to system logger if available
    try {
      const { systemLog } = require('../../logger');
      systemLog(statusMessage);
    } catch (error) {
      // System logger not available, continue with console logging
    }
  }

  /**
   * Log CU12 connection status
   */
  static logConnection(status: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING' | 'ERROR', port?: string, baudRate?: number, error?: Error): void {
    const timestamp = new Date().toISOString();
    const portInfo = port ? ` on port ${port}` : '';
    const baudInfo = baudRate ? ` @${baudRate} baud` : '';
    const errorInfo = error ? ` (${error.message})` : '';

    const message = `${this.PREFIX} CONNECTION ${timestamp} ${status}${portInfo}${baudInfo}${errorInfo}`;
    console.log(message);

    // Also log to system logger if available
    try {
      const { systemLog } = require('../../logger');
      systemLog(message);
    } catch (logError) {
      // System logger not available, continue with console logging
    }
  }

  /**
   * Log slot state changes
   */
  static logSlotState(slotId: number, oldState: string, newState: string, context?: string): void {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` (${context})` : '';
    const message = `${this.PREFIX} SLOT_STATE ${timestamp} Slot #${slotId}: ${oldState} → ${newState}${contextStr}`;

    console.log(message);

    // Also log to system logger if available
    try {
      const { systemLog } = require('../../logger');
      systemLog(message);
    } catch (error) {
      // System logger not available, continue with console logging
    }
  }

  /**
   * Create debug section separator for better console output visibility
   */
  static logSection(section: string): void {
    const separator = '='.repeat(50);
    const message = `${this.PREFIX} ${separator}`;
    const sectionMessage = `${this.PREFIX} ${section}`;

    console.log(message);
    console.log(sectionMessage);
    console.log(message);

    // Also log to system logger if available
    try {
      const { systemLog } = require('../../logger');
      systemLog(message);
      systemLog(sectionMessage);
      systemLog(message);
    } catch (error) {
      // System logger not available, continue with console logging
    }
  }

  /**
   * Log timing information for performance debugging
   */
  static logTiming(operation: string, startTime: number, context?: string): void {
    const duration = Date.now() - startTime;
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` (${context})` : '';
    const message = `${this.PREFIX} TIMING ${timestamp} ${operation} took ${duration}ms${contextStr}`;

    console.log(message);

    // Also log to system logger if available
    try {
      const { systemLog } = require('../../logger');
      systemLog(message);
    } catch (error) {
      // System logger not available, continue with console logging
    }
  }
}