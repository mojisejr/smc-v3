import { ipcRenderer, dialog } from "electron";
import { createContext, useContext, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/router";

type ErrorContextType = {};

export const ErrorContext = createContext<ErrorContextType>({});

export const ErrorProvider = ({ children }: { children: React.ReactNode }) => {
  const { replace } = useRouter();
  useEffect(() => {
    ipcRenderer.on("unlock-error", (event, payload) => {
      toast.error(payload.message);
    });

    ipcRenderer.on("dispense-error", (event, payload) => {
      toast.error(payload.message);
    });

    ipcRenderer.on("deactivate-error", (event, payload) => {
      toast.error(payload.message);
    });

    ipcRenderer.on("force-reset-error", (event, payload) => {
      toast.error(payload.message);
    });

    ipcRenderer.on("deactivate-all-error", (event, payload) => {
      toast.error(payload.message);
    });

    ipcRenderer.on("reactivate-all-error", (event, payload) => {
      toast.error(payload.message);
    });

    ipcRenderer.on("deactivate-admin-error", (event, payload) => {
      toast.error(payload.message);
    });

    ipcRenderer.on("reactivate-admin-error", (event, payload) => {
      toast.error(payload.message);
    });

    ipcRenderer.on("init-failed-on-connection-error", (event, payload) => {
      toast.error(payload.message, { autoClose: false });
    });

    ipcRenderer.on("indicator-error", (event, payload) => {
      toast.error(payload.message ?? "Indicator device error occurred");
    });

    ipcRenderer.on("esp32-sensor-error", (event, payload) => {
      toast.error(payload.message ?? "ESP32 sensor error occurred");
    });

    return () => {
      ipcRenderer.removeAllListeners("unlock-error");
      ipcRenderer.removeAllListeners("dispense-error");
      ipcRenderer.removeAllListeners("deactivate-error");
      ipcRenderer.removeAllListeners("force-reset-error");
      ipcRenderer.removeAllListeners("deactivate-all-error");
      ipcRenderer.removeAllListeners("reactivate-all-error");
      ipcRenderer.removeAllListeners("deactivate-admin-error");
      ipcRenderer.removeAllListeners("reactivate-admin-error");
      ipcRenderer.removeAllListeners("init-failed-on-connection-error");
      ipcRenderer.removeAllListeners("indicator-error");
      ipcRenderer.removeAllListeners("esp32-sensor-error");
    };
  }, []);

  return <ErrorContext.Provider value={{}}>{children}</ErrorContext.Provider>;
};

export const useErrorContext = () => {
  return useContext(ErrorContext);
};
