/**
 * IPC Channel Enums
 * Database and Input/Output channel constants for IPC communication
 */

export const DB = {
  // Database operations
  SlotRegistered: 'db:slot-registered',
  GetAllSlots: 'db:get-all-slots',
  RegisterSlot: 'db:register-slot',
  UpdateSlot: 'db:update-slot',
  DeleteSlot: 'db:delete-slot',
} as const;

export const IO = {
  // Lock control operations
  Opening: 'io:opening',
  Closed: 'io:closed',
  Unlock: 'io:unlock',
  Unlocked: 'io:unlocked',
  WaitForLockBack: 'io:wait-for-lock-back',

  // Dispensing operations
  Dispense: 'io:dispense',
  Dispensing: 'io:dispensing',
  DispensingContinue: 'io:dispensing-continue',
  WaitForDispensingLockBack: 'io:wait-for-dispensing-lock-back',
  DispensingClosed: 'io:dispensing-closed',
  DispensingClear: 'io:dispensing-clear',
  DispensingFinished: 'io:dispensing-finished',
} as const;

// Export types for TypeScript
export type DBKeys = typeof DB[keyof typeof DB];
export type IOKeys = typeof IO[keyof typeof IO];