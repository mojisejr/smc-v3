import React, { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { ipcRenderer } from "electron";
import Slot from "../components/Slot";
import Image from "next/image";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Modal from "../components/Modals";
import LockWait from "../components/Dialogs/lockWait";
import DispensingWait from "../components/Dialogs/dispensingWait";

import { useKuStates } from "../hooks/useKuStates";
import Loading from "../components/Shared/Loading";
import { useDispense } from "../hooks/useDispense";
import { useUnlock } from "../hooks/useUnlock";
import Navbar from "../components/Shared/Navbar";
import DeActivate from "../components/Dialogs/Deactivate";
import { useSensorContext } from "../contexts/sensorContext";

const mockSlots = [
  {
    slotId: 1,
    hn: "",
    occupied: false,
    timestamp: new Date().getTime(),
    opening: false,
    isActive: false,
  },
  {
    slotId: 2,
    hn: "",
    occupied: false,
    timestamp: new Date().getTime(),
    opening: false,
    isActive: false,
  },
  {
    slotId: 3,
    hn: "",
    occupied: false,
    timestamp: new Date().getTime(),
    opening: false,
    isActive: false,
  },
  {
    slotId: 4,
    hn: "",
    occupied: false,
    timestamp: new Date().getTime(),
    opening: false,
    isActive: false,
  },
  {
    slotId: 5,
    hn: "",
    occupied: false,
    timestamp: new Date().getTime(),
    opening: false,
    isActive: false,
  },
  {
    slotId: 6,
    hn: "",
    occupied: false,
    timestamp: new Date().getTime(),
    opening: false,
    isActive: false,
  },
  {
    slotId: 7,
    hn: "",
    occupied: false,
    timestamp: new Date().getTime(),
    opening: false,
    isActive: false,
  },
  {
    slotId: 8,
    hn: "",
    occupied: false,
    timestamp: new Date().getTime(),
    opening: false,
    isActive: false,
  },
  {
    slotId: 9,
    hn: "",
    occupied: false,
    timestamp: new Date().getTime(),
    opening: false,
    isActive: false,
  },
  {
    slotId: 10,
    hn: "",
    occupied: false,
    timestamp: new Date().getTime(),
    opening: false,
    isActive: false,
  },
  {
    slotId: 11,
    hn: "",
    occupied: false,
    timestamp: new Date().getTime(),
    opening: false,
    isActive: false,
  },
  {
    slotId: 12,
    hn: "",
    occupied: false,
    timestamp: new Date().getTime(),
    opening: false,
    isActive: false,
  },
  {
    slotId: 13,
    hn: "",
    occupied: false,
    timestamp: new Date().getTime(),
    opening: false,
    isActive: false,
  },
  {
    slotId: 14,
    hn: "",
    occupied: false,
    timestamp: new Date().getTime(),
    opening: false,
    isActive: false,
  },
  {
    slotId: 15,
    hn: "",
    occupied: false,
    timestamp: new Date().getTime(),
    opening: false,
    isActive: false,
  },
];

function Home() {
  const { replace } = useRouter();
  const { slots } = useKuStates();
  const { unlocking } = useUnlock();
  const { dispensing } = useDispense();
  const { sensorData, error: sensorError } = useSensorContext();
  const [closeClearOrCon, setCloseClearOrCon] = useState<boolean>(false);
  const [closeLockWait, setCloseLockWait] = useState<boolean>(false);
  const [openDeactivate, setOpenDeactivate] = useState<boolean>(false);
  const [closeDispenseWait, setCloseDispenseWait] = useState<boolean>(false);

  // License validation states
  const [isValidatingLicense, setIsValidatingLicense] = useState<boolean>(true);
  const [licenseValidationComplete, setLicenseValidationComplete] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (unlocking.unlocking) {
      setCloseLockWait(false);
    }
  }, [unlocking]);

  useEffect(() => {
    if (dispensing.dispensing) {
      setCloseDispenseWait(false);
    }
  }, [dispensing]);

  useEffect(() => {
    if (dispensing.continue) {
      setCloseClearOrCon(true);
    }
  }, [dispensing]);

  // License validation on component mount
  useEffect(() => {
    const validateLicense = async () => {
      try {
        setIsValidatingLicense(true);
        setValidationError(null);

        // Check license status using existing IPC handler
        const licenseStatus = await ipcRenderer.invoke("license:status");

        if (licenseStatus.isActive) {
          // License is valid, allow access to home page
          setLicenseValidationComplete(true);
        } else {
          // License is invalid, redirect to activation page
          console.error("License validation failed:", licenseStatus.message);
          setValidationError(licenseStatus.message || "License validation failed");

          // Redirect to activation page after a brief delay to show error
          setTimeout(() => {
            replace("/activate-key");
          }, 2000);
        }
      } catch (error: any) {
        console.error("License validation error:", error);
        setValidationError(error.message || "Failed to validate license");

        // Redirect to activation page on error
        setTimeout(() => {
          replace("/activate-key");
        }, 2000);
      } finally {
        setIsValidatingLicense(false);
      }
    };

    validateLicense();
  }, [replace]);

  return (
    <>
      <Head>
        <title>Smart Medication Cart V1.0</title>
      </Head>

      {/* License validation loading/error state */}
      {isValidatingLicense && (
        <div className="min-h-screen bg-base-200 flex items-center justify-center">
          <div className="card bg-base-100 shadow-xl p-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <Loading />
              <h2 className="text-xl font-semibold">กำลังตรวจสอบ License...</h2>
              <p className="text-base-content/70">กรุณารอสักครู่</p>
            </div>
          </div>
        </div>
      )}

      {/* License validation error state */}
      {validationError && !isValidatingLicense && !licenseValidationComplete && (
        <div className="min-h-screen bg-base-200 flex items-center justify-center">
          <div className="card bg-base-100 shadow-xl p-8 text-center max-w-md">
            <div className="flex flex-col items-center gap-4">
              <div className="alert alert-error">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>การตรวจสอบ License ล้มเหลว</span>
              </div>
              <p className="text-sm text-base-content/70">{validationError}</p>
              <div className="loading loading-bars loading-sm"></div>
              <p className="text-xs text-base-content/50">กำลังไปยังหน้าเปิดใช้งาน License...</p>
            </div>
          </div>
        </div>
      )}

      {/* Main application - only render after successful license validation */}
      {!isValidatingLicense && licenseValidationComplete && (
        <div className=" grid grid-cols-12 text-2xl text-center h-screen">
        <div className="col-span-2 flex flex-col justify-between">
          <div className="w-full px-3 py-10 flex flex-col gap-3 justify-center items-center">
            <Image
              src="/images/deprecision.png"
              width={86}
              height={85}
              alt="logo"
            />
            <Navbar active={1} />
            {sensorError && (
              <div className="alert alert-warning mt-4 text-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="flex-1">
                  <div className="font-medium">การเชื่อมต่อเซ็นเซอร์ขัดข้อง</div>
                  <div className="text-xs opacity-80">{sensorError}</div>
                </div>
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => {
                    // Trigger sensor data refresh
                    window.location.reload();
                  }}
                  title="รีเฟรชข้อมูลเซ็นเซอร์"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                </button>
              </div>
            )}
            {/* <div className="w-full px-4 flex  flex-col gap-2 justify-start items-center">
              <Indicators />
            </div> */}
          </div>
        </div>
        <div className="col-span-10 bg-[#F3F3F3] rounded-l-[50px]">
          <div className="w-full h-full p-[2rem] flex flex-col gap-[1.2rem] overflow-y-auto">
            <>
              {mockSlots === undefined ? (
                <div>Error: undefined</div>
              ) : (
                <>
                  {mockSlots.length <= 0 ? (
                    <div className="min-h-[300px] flex justify-center items-center">
                      <Loading />
                    </div>
                  ) : (
                    <ul className="grid grid-cols-5 gap-6 min-h-[70vh] place-content-start px-20 py-6">
                      {mockSlots
                        .map((s, index) => {
                          return {
                            ...s,
                            ...slots[index],
                          };
                        })
                        .sort((a, b) => a.slotId - b.slotId)
                        .map((s, index) => (
                          <Slot
                            key={index}
                            slotData={s}
                            sensorData={sensorData}
                          />
                        ))}
                    </ul>
                  )}
                </>
              )}
            </>
          </div>
        </div>
      </div>
      )}

      <ToastContainer
        limit={1}
        autoClose={1000}
        position="top-center"
        hideProgressBar
      />

      {/* Only show modals after successful validation */}
      {!isValidatingLicense && licenseValidationComplete && (
        <>
          <Modal
            isOpen={unlocking.unlocking}
            onClose={() => setCloseLockWait(true)}
          >
            <LockWait
              slotNo={unlocking.slotId}
              hn={unlocking.hn}
              onClose={() => setCloseLockWait(true)}
              onOpenDeactive={() => setOpenDeactivate(true)}
            />
          </Modal>
          <Modal
            // isOpen={dispensing.dispensing}
            isOpen={!closeDispenseWait && dispensing.dispensing}
            onClose={() => setCloseDispenseWait(true)}
          >
            <DispensingWait
              slotNo={dispensing.slotId}
              hn={dispensing.hn}
              onClose={() => setCloseDispenseWait(true)}
              onOpenDeactive={() => setOpenDeactivate(true)}
            />
          </Modal>

          <Modal isOpen={openDeactivate} onClose={() => setOpenDeactivate(false)}>
            <DeActivate
              slotNo={unlocking.slotId ?? dispensing.slotId}
              onClose={() => {
                setOpenDeactivate(false);
                setCloseLockWait(true);
              }}
            />
          </Modal>
        </>
      )}
    </>
  );
}

export default Home;
