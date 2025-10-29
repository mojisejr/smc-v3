import { ipcRenderer } from "electron";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

interface Dispensing {
  slotId?: number;
  hn?: string;
  timestamp?: number;
  dispensing: boolean;
  reset?: boolean;
  continue?: boolean;
  passkey?: string;
}

export const useDispense = () => {
  const [dispensing, setDispensing] = useState<Dispensing>({
    dispensing: false,
    reset: false,
    continue: false,
  });

  const reset = (slot: number) => {
    const dataToReset = {
      hn: null,
      timestamp: null,
      slot: null,
      reset: false,
      dispensing: false,
    };
    setDispensing(dataToReset);
    toast(`ช่อง #${slot} เคลียร์เรียบร้อยแล้ว`, {
      toastId: 2,
      type: "success",
    });
  };

  const keep = () => {
    setDispensing({
      reset: false,
      dispensing: false,
    });
  };

  useEffect(() => {
    const onDispensing = (
      _event: Electron.IpcRendererEvent,
      payload: Dispensing
    ) => {
      setDispensing(payload);
    };

    const onDispensingReset = (
      _event: Electron.IpcRendererEvent,
      payload: { slotId: number; hn?: string }
    ) => {
      // Use functional update to avoid stale closure over `dispensing`
      setDispensing((prev) => ({
        ...prev,
        slotId: payload.slotId,
        hn: payload.hn,
        dispensing: false,
        reset: true,
      }));
    };

    ipcRenderer.on("dispensing", onDispensing);
    ipcRenderer.on("dispensing-reset", onDispensingReset);

    return () => {
      ipcRenderer.removeListener("dispensing", onDispensing);
      ipcRenderer.removeListener("dispensing-reset", onDispensingReset);
    };
  }, []);

  const dispense = ({
    slotId,
    hn,
    timestamp,
    passkey,
  }: Partial<Dispensing>) => {
    ipcRenderer.invoke("dispense", { hn, slotId, timestamp, passkey });
  };

  return {
    dispense,
    reset,
    keep,
    dispensing,
  };
};
