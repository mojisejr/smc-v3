/**
 * Shared Types - Barrel Exports
 * 
 * This file exports all shared type definitions that can be used
 * by both main and renderer processes.
 */

// CU12 Error interfaces and types
export type {
  CU12ProtocolError,
  CU12ConnectionError,
  CU12CommandError,
  CU12ErrorResponse,
} from './cu12-errors';

export { CU12ErrorCode } from './cu12-errors';
