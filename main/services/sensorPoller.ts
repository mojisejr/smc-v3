import { BrowserWindow } from "electron";
import { ESP32Communicator } from "../esp32/esp32-communicator";
import { SensorData } from "../interfaces/sensor";

export class SensorPoller {
  private pollingInterval: NodeJS.Timeout | null = null;
  private readonly POLL_INTERVAL_MS = 5000;

  constructor(
    private readonly esp32: ESP32Communicator,
    private readonly mainWindow: BrowserWindow
  ) {}

  start(): void {
    if (this.pollingInterval) {
      console.warn("[SensorPoller] Polling already started");
      return;
    }

    console.log("[SensorPoller] Starting sensor polling interval");
    this.pollingInterval = setInterval(() => {
      void this.pollSensors();
    }, this.POLL_INTERVAL_MS);

    void this.pollSensors();
  }

  stop(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      console.log("[SensorPoller] Sensor polling stopped");
    }
  }

  private async pollSensors(): Promise<void> {
    try {
      await this.pollESP32Sensor();
    } catch (error) {
      console.error("[SensorPoller] Polling error", error);
    }
  }

  private async pollESP32Sensor(): Promise<void> {
    const result = await this.esp32.getSensorReading({
      timeout: 3000,
      retries: 2,
    });

    if (!result.success || !result.data) {
      const message = result.error ?? "Failed to read ESP32 sensor";
      this.mainWindow.webContents.send("esp32-sensor-error", {
        success: false,
        message,
      });
      this.mainWindow.webContents.send("sensor-error", {
        success: false,
        message,
      });
      return;
    }

    const sensorData: SensorData = {
      temperature1: result.data.temp,
      temperature2: 0,
      humidity1: result.data.humid,
      humidity2: 0,
      battery: result.data.battery ?? 0,
      source: "esp32",
      timestamp: Date.now(),
      valid: this.validateSensorData(result.data.temp, result.data.humid),
      error: undefined,
    };

    if (!sensorData.valid) {
      sensorData.error = "ESP32 sensor data out of expected range";
    }

    this.mainWindow.webContents.send("sensor-data", {
      success: true,
      data: sensorData,
    });
  }

  private validateSensorData(temperature: number, humidity: number): boolean {
    const temperatureValid = temperature >= -10 && temperature <= 50;
    const humidityValid = humidity >= 0 && humidity <= 100;
    return temperatureValid && humidityValid;
  }
}
