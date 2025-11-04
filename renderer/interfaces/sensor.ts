export interface SensorData {
  temperature1: number;
  temperature2: number;
  humidity1: number;
  humidity2: number;
  battery: number;
  source: "indicator" | "esp32" | "fallback";
  timestamp: number;
  valid: boolean;
  error?: string;
}

export interface SensorPayload {
  success: boolean;
  data?: SensorData | null;
  error?: string;
}
