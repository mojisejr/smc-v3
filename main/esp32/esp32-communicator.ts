import axios, { AxiosResponse } from "axios";

export interface ESP32DeviceInfo {
  mac_address: string;
  ip_address: string;
  hostname: string;
  firmware_version: string;
  chip_id: string;
  flash_id: string;
  free_heap: number;
  uptime: number;
}

export interface ESP32CommunicationOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export class ESP32Communicator {
  private readonly ESP32_IP = "192.168.4.1";
  private readonly ESP32_PORT = 80;
  private readonly BASE_URL = `http://${this.ESP32_IP}:${this.ESP32_PORT}`;
  private readonly DEFAULT_TIMEOUT = 10000; // 10 seconds
  private readonly DEFAULT_RETRIES = 3;
  private readonly DEFAULT_RETRY_DELAY = 2000; // 2 seconds

  /**
   * Get device information from ESP32 via REST API
   * @param options Communication options including timeout and retry settings
   * @returns Promise<ESP32DeviceInfo> Device information
   * @throws Error if communication fails or device not reachable
   */
  async getDeviceInfo(options: ESP32CommunicationOptions = {}): Promise<ESP32DeviceInfo> {
    const timeout = options.timeout || this.DEFAULT_TIMEOUT;
    const maxRetries = options.retries || this.DEFAULT_RETRIES;
    const retryDelay = options.retryDelay || this.DEFAULT_RETRY_DELAY;

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`ESP32: Attempting to get device info (attempt ${attempt}/${maxRetries})`);

        const response: AxiosResponse<any> = await axios.get(
          `${this.BASE_URL}/info`,
          {
            timeout: timeout,
            headers: {
              'User-Agent': 'SMC-License-Validator/1.0',
              'Accept': 'application/json'
            }
          }
        );

        // Validate response structure
        if (!response.data || typeof response.data !== 'object') {
          throw new Error('Invalid response format from ESP32');
        }

        // Handle both flat and nested response structures
        let deviceInfo: any;

        // Check if response has nested structure (common ESP32 API pattern)
        if (response.data.data && typeof response.data.data === 'object') {
          // Nested structure: { data: { mac_address: "...", ip_address: "...", ... } }
          deviceInfo = response.data.data;
          console.log('ESP32: Detected nested response structure, extracting data field');
        } else if (response.data.info && typeof response.data.info === 'object') {
          // Alternative nested structure: { info: { mac_address: "...", ip_address: "...", ... } }
          deviceInfo = response.data.info;
          console.log('ESP32: Detected nested response structure, extracting info field');
        } else if (response.data.status && typeof response.data.status === 'object') {
          // Alternative nested structure: { status: { mac_address: "...", ip_address: "...", ... } }
          deviceInfo = response.data.status;
          console.log('ESP32: Detected nested response structure, extracting status field');
        } else {
          // Flat structure: { mac_address: "...", ip_address: "...", ... }
          deviceInfo = response.data;
          console.log('ESP32: Using flat response structure');
        }

        // Validate required fields in the extracted device info
        const requiredFields = ['mac_address', 'ip_address'];
        for (const field of requiredFields) {
          if (!deviceInfo[field]) {
            throw new Error(`Missing required field: ${field}`);
          }
        }

        // Validate MAC address format
        if (!this.isValidMacAddress(deviceInfo.mac_address)) {
          throw new Error(`Invalid MAC address format: ${deviceInfo.mac_address}`);
        }

        // Ensure the returned object matches ESP32DeviceInfo interface
        const normalizedDeviceInfo: ESP32DeviceInfo = {
          mac_address: deviceInfo.mac_address,
          ip_address: deviceInfo.ip_address,
          hostname: deviceInfo.hostname || 'esp32',
          firmware_version: deviceInfo.firmware_version || deviceInfo.version || 'unknown',
          chip_id: deviceInfo.chip_id || deviceInfo.chipId || 'unknown',
          flash_id: deviceInfo.flash_id || deviceInfo.flashId || 'unknown',
          free_heap: deviceInfo.free_heap || deviceInfo.freeHeap || 0,
          uptime: deviceInfo.uptime || 0
        };

        console.log(`ESP32: Successfully retrieved device info. MAC: ${normalizedDeviceInfo.mac_address}`);
        return normalizedDeviceInfo;

      } catch (error: any) {
        lastError = error;

        if (attempt < maxRetries) {
          console.warn(`ESP32: Communication attempt ${attempt} failed: ${error.message}. Retrying in ${retryDelay}ms...`);
          await this.sleep(retryDelay);
        } else {
          console.error(`ESP32: All ${maxRetries} communication attempts failed`);
        }
      }
    }

    // Development mode bypass
    if (process.env.NODE_ENV === 'development') {
      console.warn('ESP32: Development mode - returning mock device info');
      return this.getMockDeviceInfo();
    }

    throw lastError || new Error('Failed to communicate with ESP32 device');
  }

  /**
   * Check if ESP32 device is reachable
   * @returns Promise<boolean> True if device is reachable
   */
  async isDeviceReachable(): Promise<boolean> {
    try {
      await this.getDeviceInfo({ timeout: 5000, retries: 1 });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate MAC address format
   * @param mac MAC address string to validate
   * @returns True if MAC address is valid
   */
  private isValidMacAddress(mac: string): boolean {
    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
    return macRegex.test(mac);
  }

  /**
   * Sleep helper function for retry delays
   * @param ms Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get mock device info for development/testing
   * @returns Mock ESP32DeviceInfo
   */
  private getMockDeviceInfo(): ESP32DeviceInfo {
    return {
      mac_address: "AA:BB:CC:DD:EE:FF",
      ip_address: "192.168.4.1",
      hostname: "esp32-mock",
      firmware_version: "1.0.0-mock",
      chip_id: "123456789",
      flash_id: "987654321",
      free_heap: 250000,
      uptime: 3600
    };
  }

  /**
   * Test connection to ESP32 with detailed logging
   * @returns Promise<object> Connection test results
   */
  async testConnection(): Promise<{
    success: boolean;
    deviceInfo?: ESP32DeviceInfo;
    error?: string;
    responseTime?: number;
  }> {
    const startTime = Date.now();

    try {
      const deviceInfo = await this.getDeviceInfo({ timeout: 5000, retries: 1 });
      const responseTime = Date.now() - startTime;

      return {
        success: true,
        deviceInfo,
        responseTime
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      return {
        success: false,
        error: error.message || 'Unknown error occurred',
        responseTime
      };
    }
  }
}

// Export singleton instance
export const esp32Communicator = new ESP32Communicator();