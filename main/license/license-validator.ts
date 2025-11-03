import { createHash, createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { License } from "../../db/model/license.model";
import { esp32Communicator, ESP32DeviceInfo } from "../esp32/esp32-communicator";

export interface LicenseData {
  customerName: string;
  organization: string;
  mac_address: string;
  expiry: string;
  issued_at: string;
  features: string[];
}

export interface LicenseValidationResult {
  isValid: boolean;
  error?: string;
  licenseData?: LicenseData;
  deviceInfo?: ESP32DeviceInfo;
  warnings?: string[];
}

export interface LicenseActivationResult {
  success: boolean;
  message: string;
  licenseData?: LicenseData;
}

export class LicenseValidator {
  private readonly ENCRYPTION_ALGORITHM = 'aes-256-gcm';
  private readonly LICENSE_KEY_PREFIX = '-----BEGIN SMC LICENSE-----';
  private readonly LICENSE_KEY_SUFFIX = '-----END SMC LICENSE-----';

  /**
   * Parse and validate PEM license key format
   * @param pemKey PEM formatted license key
   * @returns Parsed license data or null if invalid
   */
  parsePEMLicense(pemKey: string): LicenseData | null {
    try {
      // Check PEM format
      if (!pemKey.startsWith(this.LICENSE_KEY_PREFIX) ||
          !pemKey.endsWith(this.LICENSE_KEY_SUFFIX)) {
        throw new Error('Invalid PEM license format');
      }

      // Extract base64 content between PEM markers
      const base64Content = pemKey
        .replace(this.LICENSE_KEY_PREFIX, '')
        .replace(this.LICENSE_KEY_SUFFIX, '')
        .trim();

      // Decode base64
      const encryptedData = Buffer.from(base64Content, 'base64');

      // Extract IV (first 16 bytes) and encrypted content
      if (encryptedData.length < 16) {
        throw new Error('Invalid license data length');
      }

      const iv = encryptedData.slice(0, 16);
      const encryptedContent = encryptedData.slice(16);

      // For this implementation, we'll use a derived key from a fixed seed
      // In production, this should use a secure key management system
      const key = this.deriveEncryptionKey();

      // Decrypt the content
      const decipher = createDecipheriv(this.ENCRYPTION_ALGORITHM, key, iv);

      let decrypted = decipher.update(encryptedContent);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      // Parse JSON
      const licenseData: LicenseData = JSON.parse(decrypted.toString());

      // Validate required fields
      this.validateLicenseData(licenseData);

      return licenseData;

    } catch (error: any) {
      console.error('License parsing failed:', error.message);
      return null;
    }
  }

  /**
   * Validate license against current ESP32 hardware
   * @param pemKey PEM formatted license key
   * @returns Promise<LicenseValidationResult> Validation result with details
   */
  async validateLicense(pemKey?: string): Promise<LicenseValidationResult> {
    try {
      // Development mode bypass
      if (process.env.NODE_ENV === 'development') {
        console.warn('License: Development mode - bypassing validation');
        return {
          isValid: true,
          warnings: ['Development mode - license validation bypassed']
        };
      }

      // Get license key from parameter or database
      const licenseKey = pemKey || await this.getActiveLicenseKey();
      if (!licenseKey) {
        return {
          isValid: false,
          error: 'No active license found'
        };
      }

      // Parse license
      const licenseData = this.parsePEMLicense(licenseKey);
      if (!licenseData) {
        return {
          isValid: false,
          error: 'Invalid license format or corrupted license data'
        };
      }

      // Get ESP32 device information
      let deviceInfo: ESP32DeviceInfo;
      try {
        deviceInfo = await esp32Communicator.getDeviceInfo();
      } catch (error: any) {
        return {
          isValid: false,
          error: `ESP32 communication failed: ${error.message}`,
          licenseData
        };
      }

      // Validate MAC address binding
      if (!this.validateMACBinding(licenseData.mac_address, deviceInfo.mac_address)) {
        return {
          isValid: false,
          error: `License MAC address mismatch. Expected: ${licenseData.mac_address}, Found: ${deviceInfo.mac_address}`,
          licenseData,
          deviceInfo
        };
      }

      // Validate expiration date
      const now = new Date();
      const expiryDate = new Date(licenseData.expiry);
      if (expiryDate <= now) {
        return {
          isValid: false,
          error: `License expired on ${expiryDate.toISOString()}`,
          licenseData,
          deviceInfo
        };
      }

      // All validations passed
      return {
        isValid: true,
        licenseData,
        deviceInfo
      };

    } catch (error: any) {
      return {
        isValid: false,
        error: `License validation failed: ${error.message}`
      };
    }
  }

  /**
   * Activate a license key
   * @param pemKey PEM formatted license key
   * @returns Promise<LicenseActivationResult> Activation result
   */
  async activateLicense(pemKey: string): Promise<LicenseActivationResult> {
    try {
      // Parse and validate license format
      const licenseData = this.parsePEMLicense(pemKey);
      if (!licenseData) {
        return {
          success: false,
          message: 'Invalid license format or corrupted license data'
        };
      }

      // Get current device info
      let deviceInfo: ESP32DeviceInfo;
      try {
        deviceInfo = await esp32Communicator.getDeviceInfo();
      } catch (error: any) {
        return {
          success: false,
          message: `Failed to get ESP32 device info: ${error.message}`
        };
      }

      // Validate MAC address binding
      if (!this.validateMACBinding(licenseData.mac_address, deviceInfo.mac_address)) {
        return {
          success: false,
          message: `License MAC address mismatch. This license is bound to ${licenseData.mac_address} but current device MAC is ${deviceInfo.mac_address}`
        };
      }

      // Check if already activated
      const existingLicense = await this.getActiveLicenseKey();
      if (existingLicense) {
        return {
          success: false,
          message: 'A license is already activated. Deactivate the current license first.'
        };
      }

      // Encrypt and store license
      const encryptedKey = this.encryptLicenseKey(pemKey);

      await License.create({
        activation_key: encryptedKey,
        expires_at: new Date(licenseData.expiry),
        is_active: true
      });

      console.log('License activated successfully for MAC:', licenseData.mac_address);

      return {
        success: true,
        message: 'License activated successfully',
        licenseData
      };

    } catch (error: any) {
      console.error('License activation failed:', error);
      return {
        success: false,
        message: `License activation failed: ${error.message}`
      };
    }
  }

  /**
   * Deactivate current license
   * @returns Promise<boolean> True if deactivated successfully
   */
  async deactivateLicense(): Promise<boolean> {
    try {
      const [updatedCount] = await License.update(
        { is_active: false },
        { where: { is_active: true } }
      );

      return updatedCount > 0;
    } catch (error: any) {
      console.error('License deactivation failed:', error);
      return false;
    }
  }

  /**
   * Get currently active license key
   * @returns Promise<string | null> Active license key or null
   */
  async getActiveLicenseKey(): Promise<string | null> {
    try {
      const license = await License.findOne({
        where: { is_active: true }
      });

      if (!license) {
        return null;
      }

      return this.decryptLicenseKey(license.getDataValue('activation_key'));
    } catch (error: any) {
      console.error('Failed to get active license:', error);
      return null;
    }
  }

  /**
   * Validate MAC address binding with strict comparison
   * @param authorizedMAC MAC address from license
   * @param actualMAC MAC address from current device
   * @returns True if MAC addresses match
   */
  private validateMACBinding(authorizedMAC: string, actualMAC: string): boolean {
    // Normalize MAC addresses (remove separators, convert to uppercase)
    const normalize = (mac: string) =>
      mac.replace(/[:-]/g, '').toUpperCase().trim();

    const normalizedAuth = normalize(authorizedMAC);
    const normalizedActual = normalize(actualMAC);

    return normalizedAuth === normalizedActual;
  }

  /**
   * Validate license data structure
   * @param licenseData License data to validate
   * @throws Error if validation fails
   */
  private validateLicenseData(licenseData: LicenseData): void {
    const requiredFields = ['customerName', 'organization', 'mac_address', 'expiry', 'issued_at'];

    for (const field of requiredFields) {
      if (!licenseData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate MAC address format
    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
    if (!macRegex.test(licenseData.mac_address)) {
      throw new Error(`Invalid MAC address format: ${licenseData.mac_address}`);
    }

    // Validate date formats
    try {
      new Date(licenseData.expiry);
      new Date(licenseData.issued_at);
    } catch {
      throw new Error('Invalid date format in license data');
    }
  }

  /**
   * Derive encryption key from system seed
   * @returns Buffer Encryption key
   */
  private deriveEncryptionKey(): Buffer {
    // In production, use a secure key management system
    // For now, derive a key from a combination of system info
    const seed = 'SMC-LICENSE-KEY-2023-SECURE';
    return createHash('sha256').update(seed).digest();
  }

  /**
   * Encrypt license key for storage
   * @param licenseKey Raw license key
   * @returns Encrypted license key
   */
  private encryptLicenseKey(licenseKey: string): string {
    const key = this.deriveEncryptionKey();
    const iv = randomBytes(16);

    const cipher = createCipheriv(this.ENCRYPTION_ALGORITHM, key, iv);

    let encrypted = cipher.update(licenseKey);
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    const authTag = cipher.getAuthTag();

    // Combine IV + encrypted + authTag for storage
    return Buffer.concat([iv, encrypted, authTag]).toString('base64');
  }

  /**
   * Decrypt stored license key
   * @param encryptedKey Encrypted license key
   * @returns Decrypted license key
   */
  private decryptLicenseKey(encryptedKey: string): string {
    try {
      const key = this.deriveEncryptionKey();
      const encryptedData = Buffer.from(encryptedKey, 'base64');

      // Extract IV, encrypted content, and authTag
      const iv = encryptedData.slice(0, 16);
      const authTag = encryptedData.slice(encryptedData.length - 16);
      const encryptedContent = encryptedData.slice(16, encryptedData.length - 16);

      const decipher = createDecipheriv(this.ENCRYPTION_ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encryptedContent);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return decrypted.toString();
    } catch (error: any) {
      console.error('Failed to decrypt license key:', error);
      throw new Error('License key decryption failed');
    }
  }
}

// Export singleton instance
export const licenseValidator = new LicenseValidator();