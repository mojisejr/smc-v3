import * as http from "http";
import * as os from "os";
import { exec } from "child_process";
import { promisify } from "util";
import { logger, systemLog } from "../logger";

const execAsync = promisify(exec);

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
  // private readonly ESP32_PORT = 80;
  private readonly BASE_URL = `http://${this.ESP32_IP}`;
  private readonly DEFAULT_TIMEOUT = 10000; // 10 seconds
  private readonly DEFAULT_RETRIES = 3;
  private readonly DEFAULT_RETRY_DELAY = 2000; // 2 seconds

  /**
   * Log ESP32 diagnostic information to both console and database
   */
  private async logESP32(level: 'INFO' | 'ERROR' | 'DEBUG', message: string, data?: any): Promise<void> {
    const timestamp = new Date().toISOString();
    const logMessage = `[ESP32-${level}] ${timestamp} ${message}`;

    // Console logging for immediate visibility
    if (level === 'ERROR') {
      console.error(logMessage);
      if (data) console.error('Data:', data);
    } else {
      console.log(logMessage);
      if (data) console.log('Data:', data);
    }

    // Database logging for persistence
    try {
      await logger({
        user: "ESP32-System",
        message: `${logMessage}${data ? ` | Data: ${JSON.stringify(data)}` : ''}`
      });
    } catch (error) {
      console.error('Failed to log to database:', error);
    }
  }

  /**
   * Get comprehensive network diagnostics
   */
  private async getNetworkDiagnostics(): Promise<any> {
    try {
      const interfaces = os.networkInterfaces();
      const activeInterfaces = [];

      for (const [name, configs] of Object.entries(interfaces)) {
        if (configs) {
          for (const config of configs) {
            if (!config.internal && config.family === 'IPv4') {
              activeInterfaces.push({
                name,
                address: config.address,
                netmask: config.netmask,
                cidr: config.cidr
              });
            }
          }
        }
      }

      // Get routing table (Windows)
      let routingTable = [];
      try {
        const { stdout } = await execAsync('route print');
        routingTable = stdout.split('\n').slice(0, 10); // First 10 lines
      } catch (error) {
        routingTable = ['Failed to get routing table'];
      }

      // Check ARP table for ESP32 IP
      let arpEntry = null;
      try {
        const { stdout } = await execAsync(`arp -a ${this.ESP32_IP}`);
        arpEntry = stdout.trim();
      } catch (error) {
        arpEntry = 'No ARP entry found';
      }

      // Ping test
      let pingResult = null;
      try {
        const { stdout } = await execAsync(`ping -n 1 ${this.ESP32_IP}`);
        pingResult = stdout.includes('TTL') ? 'Ping successful' : 'Ping failed';
      } catch (error) {
        pingResult = 'Ping failed - host unreachable';
      }

      return {
        activeInterfaces,
        routingTable: routingTable.join('\n'),
        arpEntry,
        pingResult,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      await this.logESP32('ERROR', 'Failed to get network diagnostics', error);
      return { error: error.message };
    }
  }

  /**
   * Get device information from ESP32 via REST API
   * @param options Communication options including timeout and retry settings
   * @returns Promise<ESP32DeviceInfo> Device information
   * @throws Error if communication fails or device not reachable
   */
  async getDeviceInfo(
    options: ESP32CommunicationOptions = {}
  ): Promise<ESP32DeviceInfo> {
    const timeout = options.timeout || this.DEFAULT_TIMEOUT;
    const maxRetries = options.retries || this.DEFAULT_RETRIES;
    const baseRetryDelay = options.retryDelay || this.DEFAULT_RETRY_DELAY;

    await this.logESP32('INFO', `Starting ESP32 device info retrieval`, {
      targetIP: this.ESP32_IP,
      timeout,
      maxRetries,
      attempt: 1
    });

    // Run network diagnostics on first attempt
    if (maxRetries > 0) {
      await this.logESP32('INFO', 'Collecting network diagnostics...');
      const networkDiagnostics = await this.getNetworkDiagnostics();
      await this.logESP32('DEBUG', 'Network diagnostics collected', networkDiagnostics);
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.logESP32('INFO', `Attempting ESP32 connection`, {
          attempt: `${attempt}/${maxRetries}`,
          targetIP: this.ESP32_IP,
          endpoint: '/info'
        });

        // Simple fix: Direct HTTP connection to bypass DNS resolution issues
        const networkAwareTimeout = attempt === 1 ? timeout : timeout * 1.5;
        await this.logESP32('DEBUG', `Making HTTP request`, {
          ip: this.ESP32_IP,
          path: '/info',
          timeout: networkAwareTimeout
        });

        const startTime = Date.now();
        const response = await ESP32Communicator.makeHttpRequest(this.ESP32_IP, '/info', networkAwareTimeout);
        const responseTime = Date.now() - startTime;

        await this.logESP32('DEBUG', `HTTP request completed`, {
          responseTime,
          statusCode: response.status,
          dataSize: JSON.stringify(response.data).length
        });

        // Validate response structure
        if (!response || !response.data || typeof response.data !== "object") {
          throw new Error("Invalid response format from ESP32");
        }

        // Handle both flat and nested response structures
        let deviceInfo: any;

        // Check if response has nested structure (common ESP32 API pattern)
        if (response.data.data && typeof response.data.data === "object") {
          // Nested structure: { data: { mac_address: "...", ip_address: "...", ... } }
          deviceInfo = response.data.data;
          console.log(
            "ESP32: Detected nested response structure, extracting data field"
          );
        } else if (
          response.data.info &&
          typeof response.data.info === "object"
        ) {
          // Alternative nested structure: { info: { mac_address: "...", ip_address: "...", ... } }
          deviceInfo = response.data.info;
          console.log(
            "ESP32: Detected nested response structure, extracting info field"
          );
        } else if (
          response.data.status &&
          typeof response.data.status === "object"
        ) {
          // Alternative nested structure: { status: { mac_address: "...", ip_address: "...", ... } }
          deviceInfo = response.data.status;
          console.log(
            "ESP32: Detected nested response structure, extracting status field"
          );
        } else {
          // Flat structure: { mac_address: "...", ip_address: "...", ... }
          deviceInfo = response.data;
          console.log("ESP32: Using flat response structure");
        }

        // Validate required fields in the extracted device info
        const requiredFields = ["mac_address", "ip_address"];
        for (const field of requiredFields) {
          if (!deviceInfo[field]) {
            throw new Error(`Missing required field: ${field}`);
          }
        }

        // Validate MAC address format
        if (!this.isValidMacAddress(deviceInfo.mac_address)) {
          throw new Error(
            `Invalid MAC address format: ${deviceInfo.mac_address}`
          );
        }

        // Ensure the returned object matches ESP32DeviceInfo interface
        const normalizedDeviceInfo: ESP32DeviceInfo = {
          mac_address: deviceInfo.mac_address,
          ip_address: deviceInfo.ip_address,
          hostname: deviceInfo.hostname || "esp32",
          firmware_version:
            deviceInfo.firmware_version || deviceInfo.version || "unknown",
          chip_id: deviceInfo.chip_id || deviceInfo.chipId || "unknown",
          flash_id: deviceInfo.flash_id || deviceInfo.flashId || "unknown",
          free_heap: deviceInfo.free_heap || deviceInfo.freeHeap || 0,
          uptime: deviceInfo.uptime || 0,
        };

        await this.logESP32('INFO', `Successfully retrieved device info`, {
          mac_address: normalizedDeviceInfo.mac_address,
          ip_address: normalizedDeviceInfo.ip_address,
          firmware_version: normalizedDeviceInfo.firmware_version
        });
        return normalizedDeviceInfo;
      } catch (error: any) {
        lastError = error;

        await this.logESP32('ERROR', `ESP32 communication attempt failed`, {
          attempt: `${attempt}/${maxRetries}`,
          errorMessage: error.message,
          errorName: error.name,
          errorCode: error.code,
          errorStack: error.stack?.split('\n')[0], // First line of stack trace
          targetIP: this.ESP32_IP
        });

        // Option 1: Exponential backoff for retries
        const exponentialRetryDelay = baseRetryDelay * Math.pow(1.5, attempt - 1);

        if (attempt < maxRetries) {
          await this.logESP32('INFO', `Retrying ESP32 connection`, {
            retryDelay: exponentialRetryDelay,
            nextAttempt: attempt + 1
          });
          await this.sleep(exponentialRetryDelay);
        } else {
          await this.logESP32('ERROR', `All ESP32 communication attempts failed`, {
            totalAttempts: maxRetries,
            finalError: error.message
          });
        }
      }
    }

    // Development mode bypass
    if (process.env.NODE_ENV === "development") {
      console.warn("ESP32: Development mode - returning mock device info");
      return this.getMockDeviceInfo();
    }

    throw lastError || new Error("Failed to communicate with ESP32 device");
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
    return new Promise((resolve) => setTimeout(resolve, ms));
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
      uptime: 3600,
    };
  }

  /**
   * Simple HTTP request helper to bypass DNS resolution issues on local networks
   * @param ip ESP32 IP address
   * @param path API endpoint path
   * @param timeout Request timeout in milliseconds
   * @returns Promise with response data and status
   */
  private static async makeHttpRequest(
    ip: string,
    path: string,
    timeout: number = 10000
  ): Promise<{ data: any; status: number }> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      console.log(`[ESP32-DEBUG] ${requestId} Creating HTTP request`, {
        ip,
        path,
        timeout,
        timestamp: new Date().toISOString()
      });

      const options = {
        hostname: ip,
        port: 80,
        path: path,
        method: "GET",
        timeout: timeout,
        headers: {
          "User-Agent": "SMC-License-Validator/1.0",
          Accept: "application/json",
        },
      };

      console.log(`[ESP32-DEBUG] ${requestId} Request options`, options);

      const req = http.request(options, (res) => {
        const connectionTime = Date.now() - startTime;
        console.log(`[ESP32-DEBUG] ${requestId} Response received`, {
          statusCode: res.statusCode,
          statusMessage: res.statusMessage,
          headers: res.headers,
          connectionTime,
          timestamp: new Date().toISOString()
        });

        let data = "";
        let chunksReceived = 0;

        res.on("data", (chunk) => {
          chunksReceived++;
          data += chunk;
          console.log(`[ESP32-DEBUG] ${requestId} Chunk received`, {
            chunkSize: chunk.length,
            totalChunks: chunksReceived,
            totalDataSize: data.length
          });
        });

        res.on("end", () => {
          const totalTime = Date.now() - startTime;
          console.log(`[ESP32-DEBUG] ${requestId} Response completed`, {
            totalTime,
            dataSize: data.length,
            chunksReceived,
            timestamp: new Date().toISOString()
          });

          try {
            const jsonData = JSON.parse(data);
            console.log(`[ESP32-DEBUG] ${requestId} JSON parsed successfully`, {
              dataType: typeof jsonData,
              keys: Object.keys(jsonData || {}),
              timestamp: new Date().toISOString()
            });

            resolve({
              data: jsonData,
              status: res.statusCode || 200,
            });
          } catch (error) {
            console.error(`[ESP32-DEBUG] ${requestId} JSON parse error`, {
              error: error.message,
              rawData: data.substring(0, 200), // First 200 chars
              dataSize: data.length,
              timestamp: new Date().toISOString()
            });
            reject(new Error(`Invalid JSON response: ${error.message}`));
          }
        });
      });

      req.on("socket", (socket) => {
        const socketTime = Date.now() - startTime;
        console.log(`[ESP32-DEBUG] ${requestId} Socket assigned`, {
          socketTime,
          localAddress: socket.localAddress,
          localPort: socket.localPort,
          remoteAddress: socket.remoteAddress,
          remotePort: socket.remotePort,
          timestamp: new Date().toISOString()
        });

        socket.on('connect', () => {
          const connectTime = Date.now() - startTime;
          console.log(`[ESP32-DEBUG] ${requestId} Socket connected`, {
            connectTime,
            timestamp: new Date().toISOString()
          });
        });

        socket.on('error', (socketError) => {
          console.error(`[ESP32-DEBUG] ${requestId} Socket error`, {
            error: socketError.message,
            errorCode: socketError.code,
            timestamp: new Date().toISOString()
          });
        });
      });

      req.on("error", (error) => {
        const errorTime = Date.now() - startTime;
        console.error(`[ESP32-DEBUG] ${requestId} Request error`, {
          error: error.message,
          errorCode: error.code,
          errno: error.errno,
          syscall: error.syscall,
          errorTime,
          timestamp: new Date().toISOString()
        });
        reject(error);
      });

      req.on("timeout", () => {
        const timeoutTime = Date.now() - startTime;
        console.error(`[ESP32-DEBUG] ${requestId} Request timeout`, {
          timeoutTime,
          requestedTimeout: timeout,
          timestamp: new Date().toISOString()
        });
        req.destroy();
        reject(new Error(`HTTP request timeout after ${timeout}ms`));
      });

      req.setTimeout(timeout);

      console.log(`[ESP32-DEBUG] ${requestId} Sending request`, {
        timestamp: new Date().toISOString()
      });
      req.end();
    });
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
      const deviceInfo = await this.getDeviceInfo({
        timeout: 5000,
        retries: 1,
      });
      const responseTime = Date.now() - startTime;

      return {
        success: true,
        deviceInfo,
        responseTime,
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      return {
        success: false,
        error: error.message || "Unknown error occurred",
        responseTime,
      };
    }
  }
}

// Export singleton instance
export const esp32Communicator = new ESP32Communicator();
