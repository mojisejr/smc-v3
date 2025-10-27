import { useEffect, useState, useRef } from "react";
import { ipcRenderer } from "electron";

interface IPayload {
  slotId: number;
  hn?: string;
  timestamp?: number;
  occupied: boolean;
}

export const useKuStates = () => {
  const [slots, setSlots] = useState<IPayload[]>([]);

  const [canDispense, setCanDispense] = useState<boolean>(false);
  
  // Track if the event listener has been set up
  const listenerSetupRef = useRef<boolean>(false);

  const handleGetKuStates = (
    _event: Electron.IpcRendererEvent,
    payload: IPayload[]
  ) => {
    if (payload != undefined) {
      setSlots(payload);
      isDispensible(payload);
    }
  };

  const get = () => {
    // Set up the listener if not already present
    if (!listenerSetupRef.current) {
      ipcRenderer.on("init-res", (event, payload) => {
        handleGetKuStates(event, payload);
      });
      listenerSetupRef.current = true;
    }
    
    // Invoke the IPC call to get the current state
    ipcRenderer.invoke("init", { init: true }).catch((error) => {
      console.error("Failed to get KU states:", error);
    });
  };

  const isDispensible = (payload: IPayload[]) => {
    const isDispensible = payload.filter((p) => p.occupied == true);
    setCanDispense(isDispensible.length <= 0 ? false : true);
  };

  useEffect(() => {
    // Call get() which will set up the listener and trigger the initial status check
    get();
  }, []);

  return {
    slots,
    get,
    canDispense,
  };
};
