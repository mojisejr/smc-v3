import { ipcRenderer, IpcRendererEvent } from "electron";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { SensorData, SensorPayload } from "../interfaces/sensor";

interface SensorContextValue {
  sensorData: SensorData | null;
  indicatorData: SensorData | null;
  esp32Data: SensorData | null;
  fallbackData: SensorData | null;
  error: string | null;
  loading: boolean;
  lastUpdate: number | null;
}

const defaultValue: SensorContextValue = {
  sensorData: null,
  indicatorData: null,
  esp32Data: null,
  fallbackData: null,
  error: null,
  loading: true,
  lastUpdate: null,
};

const SensorContext = createContext<SensorContextValue>(defaultValue);

export const SensorProvider = ({ children }: { children: ReactNode }) => {
  const [indicatorData, setIndicatorData] = useState<SensorData | null>(null);
  const [esp32Data, setEsp32Data] = useState<SensorData | null>(null);
  const [fallbackData, setFallbackData] = useState<SensorData | null>(null);
  const [activeData, setActiveData] = useState<SensorData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);

  useEffect(() => {
    const handleSensorData = (
      _event: IpcRendererEvent,
      payload: SensorPayload
    ) => {
      if (!payload || !payload.success || !payload.data) {
        setError(payload?.error ?? "Failed to retrieve sensor data");
        setLoading(false);
        return;
      }

      const { data } = payload;
      setLoading(false);
      setLastUpdate(Date.now());
      setError(data.error ?? null);

      switch (data.source) {
        case "indicator":
          setIndicatorData(data);
          break;
        case "esp32":
          setEsp32Data(data);
          break;
        default:
          setFallbackData(data);
          break;
      }
    };

    const handleSensorError = (
      _event: IpcRendererEvent,
      payload: { message?: string }
    ) => {
      setError(payload?.message ?? "Sensor error occurred");
      setLoading(false);
    };

    const handleIndicatorError = (
      _event: IpcRendererEvent,
      payload: { message?: string }
    ) => {
      setError(payload?.message ?? "Indicator device error");
    };

    const handleEsp32SensorError = (
      _event: IpcRendererEvent,
      payload: { message?: string }
    ) => {
      setError(payload?.message ?? "ESP32 sensor error");
    };

    ipcRenderer.on("sensor-data", handleSensorData);
    ipcRenderer.on("sensor-error", handleSensorError);
    ipcRenderer.on("indicator-error", handleIndicatorError);
    ipcRenderer.on("esp32-sensor-error", handleEsp32SensorError);

    return () => {
      ipcRenderer.removeListener("sensor-data", handleSensorData);
      ipcRenderer.removeListener("sensor-error", handleSensorError);
      ipcRenderer.removeListener("indicator-error", handleIndicatorError);
      ipcRenderer.removeListener("esp32-sensor-error", handleEsp32SensorError);
    };
  }, []);

  useEffect(() => {
    const nextData = chooseBestSensorData(
      esp32Data,
      indicatorData,
      fallbackData
    );
    setActiveData(nextData);
  }, [esp32Data, indicatorData, fallbackData]);

  const contextValue = useMemo<SensorContextValue>(
    () => ({
      sensorData: activeData,
      indicatorData,
      esp32Data,
      fallbackData,
      error,
      loading,
      lastUpdate,
    }),
    [
      activeData,
      indicatorData,
      esp32Data,
      fallbackData,
      error,
      loading,
      lastUpdate,
    ]
  );

  return (
    <SensorContext.Provider value={contextValue}>
      {children}
    </SensorContext.Provider>
  );
};

function chooseBestSensorData(
  esp32Data: SensorData | null,
  indicatorData: SensorData | null,
  fallbackData: SensorData | null
): SensorData | null {
  if (esp32Data && esp32Data.valid) {
    return esp32Data;
  }

  if (indicatorData && indicatorData.valid) {
    return indicatorData;
  }

  return esp32Data ?? indicatorData ?? fallbackData;
}

export const useSensorContext = () => {
  const ctx = useContext(SensorContext);
  if (!ctx) {
    throw new Error("useSensorContext must be used within SensorProvider");
  }
  return ctx;
};
