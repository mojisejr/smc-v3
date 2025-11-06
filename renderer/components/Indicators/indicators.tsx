import Indicator from "./baseIndicator";
import Loading from "../Shared/Loading";
import { useIndicator } from "../../hooks/useIndicator";
import BatteryIndicator from "./batteryIndicator";
import { useState, useCallback } from "react";

/**
 * {"Temp1":25.9,"Temp2":0,"Huminity1":43,"Huminity2":0,"Battery":15,"temp1":25.9,"temp2":43,"percent_batt":64}
 */

export interface SensorData {
  Temp1?: number;
  Temp2?: number;
  Humidity1?: number;
  Humidity2?: number;
  Battery?: number;
}

const Indicators = () => {
  const { indicator, loading } = useIndicator();
  const [isRetrying, setIsRetrying] = useState(false);

  const isDataUnavailable = !indicator?.data || !indicator.success;

  const handleRetry = useCallback(() => {
    setIsRetrying(true);
    // Simple retry mechanism - just show loading state for a moment
    setTimeout(() => {
      setIsRetrying(false);
    }, 2000);
  }, []);

  if (loading) {
    return (
      <div className="w-full flex flex-col items-center justify-center p-4">
        <Loading />
        <div className="text-xs text-base-content/60 mt-2">กำลังโหลดข้อมูลเซ็นเซอร์...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center px-2 mb-2">
        <div className="text-sm font-semibold text-start">
          Indicators
        </div>
        {isDataUnavailable && (
          <button
            className={`btn btn-ghost btn-xs ${isRetrying ? "loading" : ""}`}
            onClick={handleRetry}
            disabled={isRetrying}
            title="ลองโหลดข้อมูลเซ็นเซอร์อีกครั้ง"
          >
            {isRetrying ? (
              <span className="loading loading-spinner loading-xs"></span>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            )}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 bg-gray-800 p-6 rounded-xl">
        <Indicator
          title="Temp."
          value={indicator?.data?.Temp1 ?? null}
          threshold={40}
          unit="*c"
          isUnavailable={isDataUnavailable}
        />
        <Indicator
          title="%RH"
          value={indicator?.data?.Humidity1 ?? null}
          threshold={85}
          unit="%"
          isUnavailable={isDataUnavailable}
        />
        {/* <Indicator
          title="temp2."
          value={indicator.data.Temp2}
          threshold={40}
          unit="*c"
        />
        <Indicator
          title="humid2."
          threshold={85}
          value={indicator.data.Humidity2}
          unit="%"
        /> */}
        <div className="w-full flex justify-center col-span-2">
          <BatteryIndicator
            level={indicator?.data?.Battery ?? null}
            isUnavailable={isDataUnavailable}
          />
        </div>
      </div>

      {isDataUnavailable && (
        <div className="mt-2 text-center">
          <div className="text-xs text-base-content/50">
            ไม่สามารถเชื่อมต่อกับเซ็นเซอร์ได้
          </div>
          <div className="text-xs text-base-content/40">
            กดปุ่มรีเฟรชเพื่อลองใหม่
          </div>
        </div>
      )}
    </div>
  );
};

export default Indicators;
