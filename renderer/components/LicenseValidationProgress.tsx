import { useState, useEffect } from "react";

interface ValidationStep {
  id: string;
  title: string;
  description: string;
  status: "pending" | "loading" | "success" | "error";
  error?: string;
  duration?: number;
}

interface LicenseValidationProgressProps {
  isValidationInProgress: boolean;
  validationComplete: boolean;
  validationError: string | null;
  esp32MacAddress?: string;
  licenseMacAddress?: string;
  onRetry: () => void;
}

export default function LicenseValidationProgress({
  isValidationInProgress,
  validationComplete,
  validationError,
  esp32MacAddress,
  licenseMacAddress,
  onRetry,
}: LicenseValidationProgressProps) {
  const [steps, setSteps] = useState<ValidationStep[]>([
    {
      id: "parsing",
      title: "ตรวจสอบรูปแบบ License",
      description: "ตรวจสอบความถูกต้องของไฟล์ PEM และข้อมูลภายใน",
      status: "pending",
    },
    {
      id: "device",
      title: "ตรวจสอบอุปกรณ์ ESP32",
      description: "ตรวจสอบการเชื่อมต่อและดึงข้อมูลจากอุปกรณ์",
      status: "pending",
    },
    {
      id: "mac-verification",
      title: "ตรวจสอบ MAC Address",
      description: "ตรวจสอบความตรงกันของ MAC Address ระหว่าง License และอุปกรณ์",
      status: "pending",
    },
    {
      id: "database",
      title: "บันทึกลงฐานข้อมูล",
      description: "เข้ารหัสและบันทึกข้อมูล License ลงระบบ",
      status: "pending",
    },
  ]);

  useEffect(() => {
    if (isValidationInProgress) {
      setSteps((prevSteps) => {
        const newSteps = [...prevSteps];
        newSteps[0] = { ...newSteps[0], status: "loading", error: undefined };
        return newSteps;
      });

      // Simulate step completion timing
      setTimeout(() => {
        setSteps((prevSteps) => {
          const newSteps = [...prevSteps];
          newSteps[0] = { ...newSteps[0], status: "success", duration: 1.2 };
          newSteps[1] = { ...newSteps[1], status: "loading" };
          return newSteps;
        });
      }, 1200);

      setTimeout(() => {
        setSteps((prevSteps) => {
          const newSteps = [...prevSteps];
          newSteps[1] = { ...newSteps[1], status: "success", duration: 2.1 };
          newSteps[2] = { ...newSteps[2], status: "loading" };
          return newSteps;
        });
      }, 3300);

      setTimeout(() => {
        setSteps((prevSteps) => {
          const newSteps = [...prevSteps];
          newSteps[2] = { ...newSteps[2], status: "success", duration: 0.8 };
          newSteps[3] = { ...newSteps[3], status: "loading" };
          return newSteps;
        });
      }, 4100);
    } else if (validationComplete) {
      setSteps((prevSteps) => {
        const newSteps = [...prevSteps];
        newSteps.forEach((step, index) => {
          if (index < newSteps.length - 1) {
            step.status = "success";
          } else {
            step.status = "success";
            step.duration = 0.5;
          }
        });
        return newSteps;
      });
    } else if (validationError) {
      setSteps((prevSteps) => {
        const newSteps = [...prevSteps];
        // Find the step that failed
        const failedStepIndex = newSteps.findIndex(step => step.status === "loading");
        if (failedStepIndex >= 0) {
          newSteps[failedStepIndex] = {
            ...newSteps[failedStepIndex],
            status: "error",
            error: validationError
          };
          // Mark previous steps as success, remaining as pending
          for (let i = 0; i < newSteps.length; i++) {
            if (i < failedStepIndex) {
              newSteps[i].status = "success";
            } else if (i > failedStepIndex) {
              newSteps[i].status = "pending";
            }
          }
        }
        return newSteps;
      });
    }
  }, [isValidationInProgress, validationComplete, validationError]);

  const getStepIcon = (step: ValidationStep) => {
    switch (step.status) {
      case "loading":
        return <div className="loading loading-spinner loading-sm"></div>;
      case "success":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case "error":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <div className="w-6 h-6 rounded-full border-2 border-gray-300"></div>
        );
    }
  };

  const getStepColor = (step: ValidationStep) => {
    switch (step.status) {
      case "loading":
        return "loading";
      case "success":
        return "success";
      case "error":
        return "error";
      default:
        return "";
    }
  };

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title text-lg font-bold">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
          </svg>
          กระบวนการตรวจสอบ License
        </h2>

        <div className="timeline">
          {steps.map((step, index) => (
            <div key={step.id} className={`timeline-item ${getStepColor(step)}`}>
              <div className="timeline-middle">
                {getStepIcon(step)}
              </div>
              <div className={`timeline-content timeline-box ${step.status === "error" ? "border-error" : ""}`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-bold">{step.title}</h3>
                    <p className="text-sm text-gray-600">{step.description}</p>

                    {step.status === "error" && step.error && (
                      <div className="alert alert-error mt-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs">{step.error}</span>
                      </div>
                    )}

                    {step.id === "mac-verification" && esp32MacAddress && licenseMacAddress && (
                      <div className="mt-3 p-3 bg-base-200 rounded-lg">
                        <div className="text-xs font-mono">
                          <div className="mb-2">
                            <span className="font-semibold">ESP32 MAC:</span>
                            <span className={`ml-2 ${esp32MacAddress === licenseMacAddress ? "text-success" : "text-error"}`}>
                              {esp32MacAddress}
                            </span>
                          </div>
                          <div>
                            <span className="font-semibold">License MAC:</span>
                            <span className={`ml-2 ${esp32MacAddress === licenseMacAddress ? "text-success" : "text-error"}`}>
                              {licenseMacAddress}
                            </span>
                          </div>
                          {esp32MacAddress === licenseMacAddress && (
                            <div className="mt-2 text-success">
                              ✓ MAC Address ตรงกัน
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  {step.duration && (
                    <div className="text-xs text-gray-500 ml-2">
                      {step.duration}s
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {validationComplete && (
          <div className="alert alert-success mt-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="font-bold">การเปิดใช้งาน License สำเร็จ!</h3>
              <div className="text-xs">
                License ได้รับการตรวจสอบและเปิดใช้งานเรียบร้อยแล้ว
              </div>
            </div>
          </div>
        )}

        {validationError && (
          <div className="card-actions justify-end mt-6">
            <button className="btn btn-primary" onClick={onRetry}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              ลองใหม่
            </button>
          </div>
        )}
      </div>
    </div>
  );
}