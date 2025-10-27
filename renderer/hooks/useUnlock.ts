import { ipcRenderer } from "electron";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useKuStates } from "./useKuStates";

interface Unlocking {
  slotId?: number;
  hn?: string;
  timestamp?: number;
  unlocking: boolean;
}

export const useUnlock = () => {
  const [unlocking, setUnlocking] = useState<Unlocking>({
    unlocking: false,
  });
  const { get } = useKuStates();

  useEffect(() => {
    ipcRenderer.on("unlocking", (event, payload) => {
      setUnlocking(payload);
      if (!payload.dispensing && !payload.unlocking && payload.hn != "") {
        toast(`ปลดล็อกช่อง #${payload.slotId} เรียบร้อยแล้ว`, {
          toastId: 1,
          type: "success",
        });
      }
    });

    ipcRenderer.on("init-res", () => {
      get();
    });

    return () => {
      ipcRenderer.removeAllListeners("unlocking");
      ipcRenderer.removeAllListeners("init-res");
    };
  }, []);

  const unlock = (slot: number, hn: string, passkey: string) => {
    ipcRenderer.invoke("unlock", {
      slotId: slot,
      hn,
      timestamp: new Date().getTime(),
      passkey,
    });
  };

  return {
    unlock,
    unlocking,
  };
};
