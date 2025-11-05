import { useState, useEffect } from "react";

interface BatteryIndicatorProps {
  level?: number | null;
  isUnavailable?: boolean;
}

const BatteryIndicator = ({ level = 19, isUnavailable }: BatteryIndicatorProps) => {
  const [bg, setBg] = useState<string>("#73AD21");
  const displayLevel = isUnavailable || level === null ? null : level;

  useEffect(() => {
    if (displayLevel === null) {
      setBg("#d1d5db"); // Gray color for unavailable state
    } else if (displayLevel > 40) {
      setBg("#73AD21");
    } else if (displayLevel < 40 && displayLevel >= 20) {
      setBg("#ffcc00");
    } else if (displayLevel < 20) {
      setBg("#ff0000");
    } else {
      setBg("#73AD21");
    }
  }, [displayLevel]);

  if (displayLevel === null) {
    return (
      <div className="batteryContainer">
        <div className="batteryOuter">
          <div className="flex flex-col items-center justify-center h-full py-2">
            <div className="text-xs text-base-content/50 font-medium">N/A</div>
            <div className="text-xs text-base-content/40">แบตเตอรี่</div>
          </div>
        </div>
        <div className="batteryBump"></div>
      </div>
    );
  }

  return (
    <div className="batteryContainer">
      <div className="batteryOuter">
        <div
          className="batteryLevel"
          style={{ width: `${displayLevel}%`, backgroundColor: `${bg}` }}
        ></div>
        <p className="text-xs py-1">{displayLevel}%</p>
      </div>
      <div className="batteryBump"></div>
    </div>
  );
};

export default BatteryIndicator;
