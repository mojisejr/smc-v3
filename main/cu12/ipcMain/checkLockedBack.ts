import { ipcMain } from "electron";
import { CU12Controller } from "..";
import { logger } from "../../logger";
import { mapKu16SlotToCu12 } from "../utils/packet-utils";

export const checkLockedBackHandler = (cu12: CU12Controller) => {
  ipcMain.handle("check-locked-back", async (event, payload) => {
    try {
      const slotId = payload.slotId;

      // Validate slot matches opening slot
      if (!cu12.openingSlot) {
        throw new Error("No opening slot found");
      }

      if (slotId !== cu12.openingSlot.slotId) {
        throw new Error(
          `Slot ${slotId} does not match opening slot ${cu12.openingSlot.slotId}`
        );
      }

      // Update currentBoardAddress to correct board BEFORE status check
      const slotZeroBased = cu12.openingSlot.slotId - 1;
      const cu12Slot = mapKu16SlotToCu12(slotZeroBased);
      cu12.currentBoardAddress = cu12Slot.address; // CRITICAL: Set to correct board

      await logger({
        user: "system",
        message: `checkLockedBack: user confirmed for slot #${slotId}, board ${cu12Slot.address.toString(16)}`,
      });

      // Send status check to ONLY the current opening slot's board
      cu12.sendCheckState(); // NOT sendCheckStateToAllBoards()

      return {
        success: true,
        slotId: slotId,
        message: "Status check initiated",
      };
    } catch (error) {
      await logger({
        user: "system",
        message: `checkLockedBack: error - ${error.message}`,
      });
      return {
        success: false,
        slotId: payload.slotId,
        message: error.message,
      };
    }
  });
};