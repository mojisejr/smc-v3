/**
 * ESP32 Deployment Tool - Barrel Exports
 *
 * Re-exports core functionality for use in API routes and components
 */

// License generation
export { 
  generateAndExportLicense,
  type LicenseGenerationResult 
} from './lib/deploy-license';

// License utilities (client-safe)
export { maskLicenseToken } from './lib/license-utils';

// License utilities
export {
  generateLicense,
  verifyLicense,
  validateLicense,
  isLicenseExpired,
  type LicensePayload,
  type VerificationResult,
} from "./lib/license";

// Key management
export { getPrivateKey, getPublicKey } from "./lib/keyloader";

// Export utilities
export { JSONExporter, type ExportData } from "./lib/export";

export { CSVExporter, type CSVExportResult } from "./lib/csv-export";

// Types
export type {
  CustomerInfo,
  ESP32Device,
  DeploymentState,
  SensorReading,
  SensorTestPanelProps,
  DualExportResult,
  CSVExportData,
} from "./types";
