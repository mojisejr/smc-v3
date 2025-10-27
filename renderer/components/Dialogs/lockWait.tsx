import { ipcRenderer } from "electron";
import { useEffect } from "react";
import { toast } from "react-toastify";
import Loading from "../Shared/Loading";

interface LockWaitProps {
  slotNo: number;
  hn: string;
  onClose: () => void;
  onOpenDeactive: () => void;
}

const LockWait = ({ slotNo, hn, onClose, onOpenDeactive }: LockWaitProps) => {
  const handleCheckLockedBack = async () => {
    try {
      const result = await ipcRenderer.invoke("check-locked-back", { slotId: slotNo });
      
      if (result.success) {
        toast.success("ตรวจสอบการล็อกช่องสำเร็จ");
        onClose();
      } else {
        toast.error(result.message || "เกิดข้อผิดพลาดในการตรวจสอบการล็อกช่อง");
        onClose();
      }
    } catch (error) {
      toast.error("เกิดข้อผิดพลาดในการตรวจสอบการล็อกช่อง");
      onClose();
    }
  };

  return (
    <>
      <div className="flex flex-col rounded-md overflow-hidden gap-2 max-w-[300px]">
        <div className="flex justify-between items-center shadow-xl px-3 py-2 font-bold text-xl">
          HN: {hn}
          <button
            onClick={onOpenDeactive}
            className="btn btn-circle btn-sm btn-ghost font-bold text-xl"
          >
            !
          </button>
        </div>
        <div className="flex flex-col p-3 flex-wrap jusitfy-center items-center">
          <div className="font-bold text-[#ff0000]">
            ช่อง #[{slotNo}] เปิดอยู่
          </div>
          <p className="font-bold p-3">
            นำยาเข้าช่อง #{slotNo} เปิด และปิดช่อง จากนั้นกดปุ่มตกลง
          </p>
          <Loading />
          <button className="btn" onClick={handleCheckLockedBack}>
            ตกลง
          </button>
        </div>
      </div>
    </>
  );
};

export default LockWait;
