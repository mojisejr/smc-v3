import * as http from "http";
import * as os from "os";
import { exec } from "child_process";
import { promisify } from "util";
import { logger, systemLog } from "../logger";
import { SensorReadingOptions } from "../interfaces/sensor";

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
  private async logESP32(
    level: "INFO" | "ERROR" | "DEBUG",
    message: string,
    data?: any
  ): Promise<void> {
    const timestamp = new Date().toISOString();
    const logMessage = `[ESP32-${level}] ${timestamp} ${message}`;

    // Console logging for immediate visibility
    if (level === "ERROR") {
      console.error(logMessage);
      if (data) console.error("Data:", data);
    } else {
      console.log(logMessage);
      if (data) console.log("Data:", data);
    }

    // Database logging for persistence
    try {
      await logger({
        user: "ESP32-System",
        message: `${logMessage}${
          data ? ` | Data: ${JSON.stringify(data)}` : ""
        }`,
      });
    } catch (error) {
      console.error("Failed to log to database:", error);
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
            if (!config.internal && config.family === "IPv4") {
              activeInterfaces.push({
                name,
                address: config.address,
                netmask: config.netmask,
                cidr: config.cidr,
              });
            }
          }
        }
      }

      // Get routing table (Windows)
      let routingTable = [];
      try {
        const { stdout } = await execAsync("route print");
        routingTable = stdout.split("\n").slice(0, 10); // First 10 lines
      } catch (error) {
        routingTable = ["Failed to get routing table"];
      }

      // Check ARP table for ESP32 IP
      let arpEntry = null;
      try {
        const { stdout } = await execAsync(`arp -a ${this.ESP32_IP}`);
        arpEntry = stdout.trim();
      } catch (error) {
        arpEntry = "No ARP entry found";
      }

      // Ping test
      let pingResult = null;
      try {
        const { stdout } = await execAsync(`ping -n 1 ${this.ESP32_IP}`);
        pingResult = stdout.includes("TTL") ? "Ping successful" : "Ping failed";
      } catch (error) {
        pingResult = "Ping failed - host unreachable";
      }

      return {
        activeInterfaces,
        routingTable: routingTable.join("\n"),
        arpEntry,
        pingResult,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      await this.logESP32("ERROR", "Failed to get network diagnostics", error);
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

    await this.logESP32("INFO", `Starting ESP32 device info retrieval`, {
      targetIP: this.ESP32_IP,
      timeout,
      maxRetries,
      attempt: 1,
    });

    // Run network diagnostics on first attempt
    if (maxRetries > 0) {
      await this.logESP32("INFO", "Collecting network diagnostics...");
      const networkDiagnostics = await this.getNetworkDiagnostics();
      await this.logESP32(
        "DEBUG",
        "Network diagnostics collected",
        networkDiagnostics
      );
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.logESP32("INFO", `Attempting ESP32 connection`, {
          attempt: `${attempt}/${maxRetries}`,
          targetIP: this.ESP32_IP,
          endpoint: "/info",
        });

        // Simple fix: Direct HTTP connection to bypass DNS resolution issues
        const networkAwareTimeout = attempt === 1 ? timeout : timeout * 1.5;
        await this.logESP32("DEBUG", `Making HTTP request`, {
          ip: this.ESP32_IP,
          path: "/info",
          timeout: networkAwareTimeout,
        });

        const startTime = Date.now();
        const response = await ESP32Communicator.makeHttpRequest(
          this.ESP32_IP,
          "/info",
          networkAwareTimeout
        );
        const responseTime = Date.now() - startTime;

        await this.logESP32("DEBUG", `HTTP request completed`, {
          responseTime,
          statusCode: response.status,
          dataSize: JSON.stringify(response.data).length,
        });

        // Validate response structure
        if (!response || !response.data || typeof response.data !== "object") {
          throw new Error("Invalid response format from ESP32");
        }

        // Handle both flat and nested response structures
        let deviceInfo: any;

        // Check if response has nested structure (common ESP32 API pattern)
        if (response.data.device && typeof response.data.device === "object") {
          // ESP32 template structure: { device: { mac_address: "...", ap_ip: "...", ... }, customer: {...} }
          deviceInfo = response.data.device;
          // Map ESP32 template fields to expected interface fields
          deviceInfo.ip_address = response.data.device.ap_ip;
          deviceInfo.hostname = "esp32";
          console.log(
            "ESP32: Detected device nested response structure, extracting device field"
          );
        } else if (
          response.data.data &&
          typeof response.data.data === "object"
        ) {
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

        await this.logESP32("INFO", `Successfully retrieved device info`, {
          mac_address: normalizedDeviceInfo.mac_address,
          ip_address: normalizedDeviceInfo.ip_address,
          firmware_version: normalizedDeviceInfo.firmware_version,
        });
        return normalizedDeviceInfo;
      } catch (error: any) {
        lastError = error;

        await this.logESP32("ERROR", `ESP32 communication attempt failed`, {
          attempt: `${attempt}/${maxRetries}`,
          errorMessage: error.message,
          errorName: error.name,
          errorCode: error.code,
          errorStack: error.stack?.split("\n")[0], // First line of stack trace
          targetIP: this.ESP32_IP,
        });

        // Option 1: Exponential backoff for retries
        const exponentialRetryDelay =
          baseRetryDelay * Math.pow(1.5, attempt - 1);

        if (attempt < maxRetries) {
          await this.logESP32("INFO", `Retrying ESP32 connection`, {
            retryDelay: exponentialRetryDelay,
            nextAttempt: attempt + 1,
          });
          await this.sleep(exponentialRetryDelay);
        } else {
          await this.logESP32(
            "ERROR",
            `All ESP32 communication attempts failed`,
            {
              totalAttempts: maxRetries,
              finalError: error.message,
            }
          );
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

  private getMockSensorReading(): {
    temp: number;
    humid: number;
    battery?: number;
  } {
    return {
      temp: 24 + Math.random() * 2,
      humid: 45 + Math.random() * 5,
      battery: 80,
    };
  }

  async getSensorReading(options: SensorReadingOptions = {}): Promise<{
    success: boolean;
    data?: { temp: number; humid: number; battery?: number };
    error?: string;
  }> {
    const timeout = options.timeout || this.DEFAULT_TIMEOUT;
    const maxRetries = options.retries || this.DEFAULT_RETRIES;
    const retryDelay = options.retryDelay || this.DEFAULT_RETRY_DELAY;

    await this.logESP32("INFO", "Starting ESP32 sensor reading", {
      timeout,
      maxRetries,
    });

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.logESP32("DEBUG", "Requesting ESP32 sensor data", {
          attempt,
        });

        const response = await ESP32Communicator.makeHttpRequest(
          this.ESP32_IP,
          "/sensor",
          timeout
        );

        const payload = await this.normalizeSensorPayload(response.data);

        this.validateSensorPayload(payload);

        await this.logESP32("INFO", "ESP32 sensor reading successful", {
          attempt,
          temp: payload.temp,
          humid: payload.humid,
        });

        return {
          success: true,
          data: payload,
        };
      } catch (error: any) {
        lastError = error instanceof Error ? error : new Error(String(error));

        await this.logESP32("ERROR", "ESP32 sensor reading failed", {
          attempt,
          error: lastError.message,
        });

        if (attempt < maxRetries) {
          const delay = retryDelay * Math.pow(2, attempt - 1);
          await this.logESP32("DEBUG", "Retrying ESP32 sensor read", {
            nextAttempt: attempt + 1,
            delay,
          });
          await this.sleep(delay);
        }
      }
    }

    if (process.env.NODE_ENV === "development") {
      await this.logESP32(
        "INFO",
        "Using mock ESP32 sensor data (development mode)"
      );
      return {
        success: true,
        data: this.getMockSensorReading(),
      };
    }

    return {
      success: false,
      error: lastError?.message || "Failed to retrieve ESP32 sensor data",
    };
  }

  private async normalizeSensorPayload(data: any): Promise<{
    temp: number;
    humid: number;
    battery?: number;
  }> {
    if (!data) {
      throw new Error("Empty sensor payload from ESP32");
    }

    // Log raw ESP32 response data for debugging
    await this.logESP32("DEBUG", "Raw ESP32 sensor response", {
      dataType: typeof data,
      rawResponse: data,
      responseKeys: Object.keys(data || {}),
    });

    // Handle different response structures
    // ESP32 returns flat structure: { "temp": 30.9, "humid": 68, ... }
    // But also handle nested structures for compatibility
    let payload;

    if (data?.data?.sensor && typeof data?.data?.sensor === "object") {
      payload = data.data.sensor;
      await this.logESP32("DEBUG", "Using nested data.sensor structure");
    } else if (data?.sensor && typeof data?.sensor === "object") {
      payload = data.sensor;
      await this.logESP32("DEBUG", "Using nested sensor structure");
    } else if (data?.status && typeof data?.status === "object") {
      payload = data.status;
      await this.logESP32("DEBUG", "Using nested status structure");
    } else if (data?.data && typeof data?.data === "object") {
      payload = data.data;
      await this.logESP32("DEBUG", "Using nested data structure");
    } else {
      // Flat structure - direct ESP32 response: { "temp": 30.9, "humid": 68 }
      payload = data;
      await this.logESP32("DEBUG", "Using flat ESP32 response structure");
    }

    // Log extracted payload for debugging
    await this.logESP32("DEBUG", "Extracted sensor payload", {
      payloadType: typeof payload,
      payloadKeys: Object.keys(payload || {}),
      payloadValues: payload,
    });

    // Enhanced type conversion with proper validation
    let temp: number;
    let humid: number;
    let battery: number | undefined;

    // Temperature conversion with fallbacks and validation
    const rawTemp = payload?.temp ?? payload?.temperature ?? payload?.temperature_c;
    if (rawTemp !== undefined && rawTemp !== null) {
      temp = parseFloat(String(rawTemp));
      if (isNaN(temp)) {
        await this.logESP32("ERROR", "Temperature conversion failed", {
          rawValue: rawTemp,
          rawType: typeof rawTemp,
          conversionResult: temp,
        });
        throw new Error(`ESP32 sensor temperature conversion failed: '${rawTemp}' (${typeof rawTemp}) is not a valid number`);
      }
    } else {
      throw new Error("ESP32 sensor temperature value not found in payload");
    }

    // Humidity conversion with fallbacks and validation
    const rawHumid = payload?.humid ?? payload?.humidity ?? payload?.humidity_percent;
    if (rawHumid !== undefined && rawHumid !== null) {
      humid = parseFloat(String(rawHumid));
      if (isNaN(humid)) {
        await this.logESP32("ERROR", "Humidity conversion failed", {
          rawValue: rawHumid,
          rawType: typeof rawHumid,
          conversionResult: humid,
        });
        throw new Error(`ESP32 sensor humidity conversion failed: '${rawHumid}' (${typeof rawHumid}) is not a valid number`);
      }
    } else {
      throw new Error("ESP32 sensor humidity value not found in payload");
    }

    // Battery conversion (optional)
    const rawBattery = payload?.battery ?? payload?.battery_percent ?? payload?.batteryLevel;
    if (rawBattery !== undefined && rawBattery !== null) {
      battery = parseFloat(String(rawBattery));
      if (isNaN(battery)) {
        await this.logESP32("DEBUG", "Battery conversion failed, using undefined", {
          rawValue: rawBattery,
          rawType: typeof rawBattery,
          conversionResult: battery,
        });
        battery = undefined; // Battery is optional, don't throw error
      }
    }

    const result = { temp, humid, battery };

    await this.logESP32("DEBUG", "Normalized sensor payload", {
      finalResult: result,
      tempType: typeof temp,
      humidType: typeof humid,
      batteryType: typeof battery,
    });

    return result;
  }

  private validateSensorPayload(payload: {
    temp: number;
    humid: number;
  }): void {
    // Enhanced validation with detailed error messages showing actual problematic values
    if (!Number.isFinite(payload.temp)) {
      throw new Error(`ESP32 sensor temperature is not a valid number. Received: ${payload.temp} (type: ${typeof payload.temp}, value: "${String(payload.temp)}")`);
    }

    if (!Number.isFinite(payload.humid)) {
      throw new Error(`ESP32 sensor humidity is not a valid number. Received: ${payload.humid} (type: ${typeof payload.humid}, value: "${String(payload.humid)}")`);
    }

    if (payload.temp < -40 || payload.temp > 85) {
      throw new Error(`ESP32 sensor temperature out of range. Value: ${payload.temp}°C, Expected range: -40°C to 85°C`);
    }

    if (payload.humid < 0 || payload.humid > 100) {
      throw new Error(`ESP32 sensor humidity out of range. Value: ${payload.humid}%, Expected range: 0% to 100%`);
    }
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
      const requestId = `${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      console.log(`[ESP32-DEBUG] ${requestId} Creating HTTP request`, {
        ip,
        path,
        timeout,
        timestamp: new Date().toISOString(),
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
          timestamp: new Date().toISOString(),
        });

        // Validate HTTP status code before proceeding
        if (res.statusCode && res.statusCode >= 400) {
          const errorTime = Date.now() - startTime;
          const error = new Error(`HTTP ${res.statusCode}: ${res.statusMessage || 'Endpoint Error'}`);
          (error as any).statusCode = res.statusCode;
          (error as any).path = path;

          console.error(`[ESP32-DEBUG] ${requestId} HTTP error`, {
            statusCode: res.statusCode,
            statusMessage: res.statusMessage,
            path,
            errorTime,
            timestamp: new Date().toISOString(),
          });

          reject(error);
          return;
        }

        // Validate content type if available
        const contentType = res.headers['content-type']?.toLowerCase() || '';
        if (contentType && !contentType.includes('application/json')) {
          console.warn(`[ESP32-DEBUG] ${requestId} Unexpected content type`, {
            contentType,
            path,
            timestamp: new Date().toISOString(),
          });
        }

        let data = "";
        let chunksReceived = 0;

        res.on("data", (chunk) => {
          chunksReceived++;
          data += chunk;
          console.log(`[ESP32-DEBUG] ${requestId} Chunk received`, {
            chunkSize: chunk.length,
            totalChunks: chunksReceived,
            totalDataSize: data.length,
          });
        });

        res.on("end", () => {
          const totalTime = Date.now() - startTime;
          console.log(`[ESP32-DEBUG] ${requestId} Response completed`, {
            totalTime,
            dataSize: data.length,
            chunksReceived,
            timestamp: new Date().toISOString(),
          });

          // Validate response data before JSON parsing
          if (!data || data.trim().length === 0) {
            console.error(`[ESP32-DEBUG] ${requestId} Empty response`, {
              path,
              dataSize: data.length,
              timestamp: new Date().toISOString(),
            });
            reject(new Error(`Empty response from ESP32 endpoint: ${path}`));
            return;
          }

          try {
            const jsonData = JSON.parse(data);
            console.log(`[ESP32-DEBUG] ${requestId} JSON parsed successfully`, {
              dataType: typeof jsonData,
              keys: Object.keys(jsonData || {}),
              timestamp: new Date().toISOString(),
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
              path,
              contentType,
              timestamp: new Date().toISOString(),
            });
            reject(new Error(`Invalid JSON response from ESP32 endpoint ${path}: ${error.message}`));
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
          timestamp: new Date().toISOString(),
        });

        socket.on("connect", () => {
          const connectTime = Date.now() - startTime;
          console.log(`[ESP32-DEBUG] ${requestId} Socket connected`, {
            connectTime,
            timestamp: new Date().toISOString(),
          });
        });

        socket.on("error", (socketError: any) => {
          console.error(`[ESP32-DEBUG] ${requestId} Socket error`, {
            error: socketError.message,
            errorCode: socketError.code,
            timestamp: new Date().toISOString(),
          });
        });
      });

      req.on("error", (error: any) => {
        const errorTime = Date.now() - startTime;
        console.error(`[ESP32-DEBUG] ${requestId} Request error`, {
          error: error.message,
          errorCode: error.code,
          errno: error.errno,
          syscall: error.syscall,
          errorTime,
          timestamp: new Date().toISOString(),
        });
        reject(error);
      });

      req.on("timeout", () => {
        const timeoutTime = Date.now() - startTime;
        console.error(`[ESP32-DEBUG] ${requestId} Request timeout`, {
          timeoutTime,
          requestedTimeout: timeout,
          timestamp: new Date().toISOString(),
        });
        req.destroy();
        reject(new Error(`HTTP request timeout after ${timeout}ms`));
      });

      req.setTimeout(timeout);

      console.log(`[ESP32-DEBUG] ${requestId} Sending request`, {
        timestamp: new Date().toISOString(),
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
