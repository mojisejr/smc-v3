import { useState } from "react";
import LockedSlot from "./locked";
import EmptySlot from "./empty";
import Modal from "../Modals";
import InputSlot from "../Dialogs/inputSlot";
import { SensorData } from "../../interfaces/sensor";

interface SlotProps {
  slotData: {
    slotId?: number;
    occupied: boolean;
    hn?: string;
    timestamp?: number;
    opening: boolean;
    isActive: boolean;
  };
  sensorData: SensorData | null;
}

const Slot = ({ slotData, sensorData }: SlotProps) => {
  const [openModal, setOpenModal] = useState<boolean>(false);

  function handleSlot() {
    if (!slotData.opening && !slotData.occupied && slotData.isActive)
      if (openModal) {
        setOpenModal(false);
      } else {
        setOpenModal(true);
      }
  }

  const rawTemperature = sensorData?.temperature1;
  const temperature = Number.isFinite(rawTemperature ?? NaN)
    ? (rawTemperature as number)
    : 0;
  const rawHumidity = sensorData?.humidity1;
  const humidity = Number.isFinite(rawHumidity ?? NaN)
    ? (rawHumidity as number)
    : 0;
  const isValid = sensorData?.valid ?? false;

  return (
    <button onClick={handleSlot} disabled={!slotData.isActive}>
      {slotData.occupied ? (
        <LockedSlot
          slotNo={slotData.slotId}
          hn={slotData.hn}
          date={new Date(slotData.timestamp).toLocaleDateString()}
          time={new Date(slotData.timestamp).toLocaleTimeString()}
          temp={temperature}
          humid={humidity}
          isValid={isValid}
        />
      ) : (
        <EmptySlot
          slotNo={slotData.slotId}
          isActive={slotData.isActive}
          temp={temperature}
          humid={humidity}
          isValid={isValid}
        />
      )}
      <Modal isOpen={openModal} onClose={handleSlot}>
        <InputSlot slotNo={slotData.slotId} onClose={handleSlot} />
      </Modal>
    </button>
  );
};

export default Slot;
