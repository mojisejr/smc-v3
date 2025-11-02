import { useState, useEffect } from "react";
import { ipcRenderer } from "electron";

interface ESP32DeviceInfo {
  mac_address: string;
  ip_address: string;
  hostname: string;
  firmware_version: string;
  chip_id: string;
  flash_id: string;
  free_heap: number;
  uptime: number;
}

interface ESP32ConnectionStatusProps {
  isConnected: boolean;
  deviceInfo: ESP32DeviceInfo | null;
  isConnecting: boolean;
  onTestConnection: () => void;
}

export default function ESP32ConnectionStatus({
  isConnected,
  deviceInfo,
  isConnecting,
  onTestConnection,
}: ESP32ConnectionStatusProps) {
  const [connectionError, setConnectionError] = useState<string>("");

  useEffect(() => {
    if (!isConnected && !isConnecting) {
      setConnectionError("");
    }
  }, [isConnected, isConnecting]);

  const handleTestConnection = async () => {
    setConnectionError("");
    onTestConnection();
  };

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title text-lg font-bold flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}></div>
          สถานะการเชื่อมต่อ ESP32
        </h2>

        <div className="form-control">
          <label className="label">
            <span className="label-text font-semibold">สถานะการเชื่อมต่อ</span>
          </label>
          <div className="flex items-center gap-3">
            {isConnecting ? (
              <>
                <div className="loading loading-spinner loading-sm"></div>
                <span className="text-warning">กำลังเชื่อมต่อ...</span>
              </>
            ) : isConnected ? (
              <>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-success">เชื่อมต่อสำเร็จ</span>
              </>
            ) : (
              <>
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-error">ไม่สามารถเชื่อมต่อได้</span>
              </>
            )}
          </div>
        </div>

        {isConnected && deviceInfo && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">MAC Address</span>
              </label>
              <div className="badge badge-info gap-2 p-3">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {deviceInfo.mac_address}
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">IP Address</span>
              </label>
              <div className="badge badge-neutral gap-2 p-3">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 17.25v-.228a4.5 4.5 0 00-.12-1.03l-2.268-9.64a3.375 3.375 0 00-3.285-2.602H7.923a3.375 3.375 0 00-3.285 2.602l-2.268 9.64a4.5 4.5 0 00-.12 1.03v.228m21.75 0a3 3 0 01-3 3H5.25a3 3 0 01-3-3m21.75 0H3m16.5 0h3.75m-3.75 0h-.375M21.75 9v-.75C21.75 4.365 18.635 1.25 14.625 1.25h-6.25C4.365 1.25 1.25 4.365 1.25 8.25V9m21.75 0v12a3 3 0 01-3 3H5.25a3 3 0 01-3-3V9" />
                </svg>
                {deviceInfo.ip_address}
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Hostname</span>
              </label>
              <div className="badge badge-secondary p-3">
                {deviceInfo.hostname}
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Firmware</span>
              </label>
              <div className="badge badge-accent p-3">
                {deviceInfo.firmware_version}
              </div>
            </div>
          </div>
        )}

        {connectionError && (
          <div className="alert alert-error mt-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{connectionError}</span>
          </div>
        )}

        <div className="card-actions justify-end mt-6">
          <button
            className="btn btn-primary btn-outline"
            onClick={handleTestConnection}
            disabled={isConnecting}
          >
            {isConnecting ? (
              <>
                <div className="loading loading-spinner loading-sm"></div>
                กำลังทดสอบ...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                ทดสอบการเชื่อมต่อ
              </>
            )}
          </button>
        </div>

        {!isConnected && (
          <div className="alert alert-warning mt-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h3 className="font-bold">ไม่พบการเชื่อมต่อ ESP32</h3>
              <div className="text-xs">
                กรุณาเชื่อมต่อกับเครือข่าย ESP32 (192.168.4.1) ก่อนดำเนินการต่อ
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}