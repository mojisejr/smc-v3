import { ipcRenderer } from "electron";
import { useApp } from "../../contexts/appContext";
import { useRef } from "react";
// import { IO } from "../../enums/ipc-enums";

interface ResetSlotOrNotProps {
  onClose: () => void;
}

const ReactivateAllSlots = ({ onClose }: ResetSlotOrNotProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  // const { user } = useApp();
  function handleReset() {
    const reason = inputRef.current?.value;
    ipcRenderer
      .invoke("reactivate-all", {
        reason: reason,
        user: "system",
        // user: user.name
      })
      .then(() => {
        onClose();
      });
  }
  function handleContinue() {
    // ipcRenderer.invoke(IO.DispensingContinue, slotNo, hn);
    onClose();
  }

  return (
    <>
      <div className="flex gap-2 p-5 flex-col max-w-[300px]">
        <div className="text-[#ff0000] font-bold text-xl">
          ระวังการ [Reactivate All Slots] จะทำให้สถานะของช่อง กลับมาเป็นว่าง
          กรุณาเอายาที่เหลือออกจากช่อง ก่อนนะครับ
        </div>

        <input
          type="text"
          className="input"
          placeholder="reset reason"
          ref={inputRef}
        ></input>
        <button
          className="p-3 bg-gray-200 hover:bg-[#5495f6] text-white font-bold rounded-md"
          onClick={handleReset}
        >
          Reactivate
        </button>
        <button
          className="p-3 bg-gray-200 hover:bg-[#ff0000] text-white font-bold rounded-md"
          onClick={() => handleContinue()}
        >
          ยกเลิก
        </button>
      </div>
    </>
  );
};

export default ReactivateAllSlots;
