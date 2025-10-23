/**
 * Main Process Interfaces - Barrel Exports
 * 
 * This file exports all interfaces specific to the main process.
 * For shared interfaces (used by both main and renderer), import from @shared/types
 */

// Main-specific interfaces
export * from './auth';
export * from './lock-controller';
export * from './setting';
export * from './slotState';
export * from './unlock';

// DTOs
export * from './dtos/completeRegisterDTO';
export * from './dtos/portDTO';
export * from './dtos/registerDTO';
export * from './dtos/setOpenSlotDTO';
export * from './dtos/slotClosedDTO';
export * from './dtos/slotOpeningDTO';
