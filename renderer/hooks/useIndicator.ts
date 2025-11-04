import { ipcRenderer, IpcRendererEvent } from "electron";
import { useEffect, useState } from "react";

type IndicatorPayload = {
  message: string | null;
  success: boolean;
  data: {
    Temp1: number;
    Temp2: number;
    Humidity1: number;
    Humidity2: number;
    Battery: number;
  } | null;
};

export const useIndicator = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [indicator, setIndicator] = useState<IndicatorPayload | null>(null);

  useEffect(() => {
    const handleIndicator = (
      _event: IpcRendererEvent,
      payload: IndicatorPayload | undefined
    ) => {
      if (!payload || typeof payload !== "object") {
        console.warn("[useIndicator] Received invalid payload", payload);
        setIndicator({
          message: "Invalid indicator payload",
          success: false,
          data: null,
        });
        setLoading(false);
        return;
      }

      if (!payload.data) {
        console.warn("[useIndicator] Indicator payload missing data", payload);
        setIndicator({
          message: payload.message ?? "Indicator data unavailable",
          success: false,
          data: null,
        });
        setLoading(false);
        return;
      }

      setIndicator(payload);
      setLoading(false);
    };

    setLoading(true);
    ipcRenderer.on("retrive-indicator", handleIndicator);

    return () => {
      ipcRenderer.removeListener("retrive-indicator", handleIndicator);
    };
  }, []);

  return {
    loading,
    indicator,
  };
};
