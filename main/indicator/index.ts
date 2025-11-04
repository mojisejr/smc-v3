import { BrowserWindow } from "electron";
import { SerialPort } from "serialport";
import { ReadlineParser } from "serialport";
import { SensorData } from "../interfaces/sensor";

export class IndicatorDevice {
  serialPort: SerialPort;
  parser: ReadlineParser;
  win: BrowserWindow;

  constructor(_path: string, _baudRate: number, _win: BrowserWindow) {
    this.win = _win;
    this.serialPort = new SerialPort(
      {
        path: _path,
        baudRate: _baudRate,
        autoOpen: true,
      },
      (error) => {
        if (error) {
          console.error(
            `[Indicator] Failed to open port ${_path}:`,
            error.message
          );
          // Send error status to frontend but don't crash
          this.win.webContents.send("indicator-error", {
            success: false,
            message: `Failed to open indicator port ${_path}: ${error.message}`,
            port: _path,
          });
        } else {
          console.log(
            `[Indicator] Successfully connected to port ${_path} @${_baudRate} baud`
          );
        }
      }
    );

    this.parser = this.serialPort.pipe(new ReadlineParser({ delimiter: "\n" }));
  }

  private isWithinRange(value: number, min: number, max: number): boolean {
    return (
      typeof value === "number" &&
      !Number.isNaN(value) &&
      value >= min &&
      value <= max
    );
  }

  receive() {
    this.parser.on("data", async (data: Buffer) => {
      console.log("input-indicator", data);

      if (!data) {
        this.win.webContents.send("retrive-indicator", {
          success: false,
          message: "ไม่ได้รับข้อมูล indicator",
          data: null,
        });
        return;
      }

      try {
        const rawIndicators = JSON.parse(data.toString());
        const normalizedIndicators: any = {
          ...rawIndicators,
          Temp1: Number(rawIndicators?.Temp1 ?? rawIndicators?.temp1 ?? 0),
          Temp2: Number(rawIndicators?.Temp2 ?? rawIndicators?.temp2 ?? 0),
          Humidity1: Number(
            rawIndicators?.Humidity1 ??
              rawIndicators?.Huminity1 ??
              rawIndicators?.humidity1 ??
              0
          ),
          Humidity2: Number(
            rawIndicators?.Humidity2 ??
              rawIndicators?.Huminity2 ??
              rawIndicators?.humidity2 ??
              0
          ),
          Battery: Number(
            rawIndicators?.Battery ?? rawIndicators?.battery ?? 0
          ),
        };

        delete normalizedIndicators.Huminity1;
        delete normalizedIndicators.Huminity2;

        console.log(normalizedIndicators);
        this.win.webContents.send("retrive-indicator", {
          success: true,
          message: null,
          data: normalizedIndicators,
        });

        const sensorData: SensorData = {
          temperature1: normalizedIndicators.Temp1,
          temperature2: normalizedIndicators.Temp2,
          humidity1: normalizedIndicators.Humidity1,
          humidity2: normalizedIndicators.Humidity2,
          battery: normalizedIndicators.Battery,
          source: "indicator",
          timestamp: Date.now(),
          valid:
            this.isWithinRange(normalizedIndicators.Temp1, -10, 50) &&
            this.isWithinRange(normalizedIndicators.Humidity1, 0, 100),
        };

        if (!sensorData.valid) {
          sensorData.error = "Indicator sensor data out of expected range";
        }

        this.win.webContents.send("sensor-data", {
          success: true,
          data: sensorData,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        console.error(
          "[Indicator] JSON parse error:",
          message,
          "Raw data:",
          data.toString()
        );
        this.win.webContents.send("indicator-error", {
          success: false,
          message: `Malformed indicator data received: ${message}`,
          data: null,
        });
      }
    });
  }
}
