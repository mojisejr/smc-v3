import { FaLock } from "react-icons/fa";
import Indicator from "../Indicators/baseIndicator";
interface EmptySlotProps {
  slotNo: number;
  isActive: boolean;
  temp: number;
  humid: number;
}
export const EmptySlot = ({
  slotNo,
  isActive,
  temp = 0,
  humid = 0,
}: EmptySlotProps) => {
  return (
    <div
      className={`relative min-w-[170px] min-h-[175px] ${
        isActive ? "bg-[#F6F6F6]" : "bg-[#eee] opacity-30"
      } shadow-xl rounded-xl p-3`}
    >
      <div className="flex justify-between ">
        <FaLock className="fill-[#F9324A]" size={20} />
      </div>
      <div className="flex flex-col justify-center items-center pt-3 min-h-[100px]">
        <div className="font-bold">ปลดล็อค</div>
      </div>
      <div className="absolute bottom-0 right-0 w-full flex justify-between px-3 py-1">
        {isActive ? (
          <div className="flex">
            <Indicator value={temp} unit="*C" title="Temp." threshold={50} />
            <Indicator value={humid} unit="%" title="%RH" threshold={85} />
          </div>
        ) : (
          <div></div>
        )}
        <div className="text-[#615858] text-[40px] font-bold">{slotNo}</div>
      </div>
    </div>
  );
};

export default EmptySlot;
