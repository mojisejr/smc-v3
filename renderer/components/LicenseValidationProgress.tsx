import { useState, useEffect } from "react";

export type ErrorType =
  | "esp32-disconnected"
  | "mac-mismatch"
  | "license-expired"
  | "network-issues"
  | "no-license"
  | "validation-error"
  | "unknown-error";

interface ValidationStep {
  id: string;
  title: string;
  description: string;
  status: "pending" | "loading" | "success" | "error";
  error?: string;
  duration?: number;
}

interface ErrorScenario {
  type: ErrorType;
  title: string;
  message: string;
  troubleshooting: string[];
  isRetryable: boolean;
  emergencyContact?: boolean;
}

interface LicenseValidationProgressProps {
  isValidationInProgress: boolean;
  validationComplete: boolean;
  validationError: string | null;
  esp32MacAddress?: string;
  licenseMacAddress?: string;
  onRetry: () => void;
  onRetryStep?: (step: string) => void;
}

export default function LicenseValidationProgress({
  isValidationInProgress,
  validationComplete,
  validationError,
  esp32MacAddress,
  licenseMacAddress,
  onRetry,
  onRetryStep,
}: LicenseValidationProgressProps) {
  const [errorType, setErrorType] = useState<ErrorType | null>(null);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);

  // Error scenarios with specific guidance
  const errorScenarios: Record<ErrorType, ErrorScenario> = {
    "esp32-disconnected": {
      type: "esp32-disconnected",
      title: "ไม่สามารถเชื่อมต่อกับ ESP32 ได้",
      message: "ระบบไม่พบการเชื่อมต่อกับอุปกรณ์ ESP32 ที่จำเป็นสำหรับการทำงาน",
      troubleshooting: [
        "ตรวจสอบให้แน่ใจว่าอุปกรณ์ ESP32 เชื่อมต่อกับแหล่งจ่ายไฟ",
        "ตรวจสอบการเชื่อมต่อเครือข่าย WiFi ของคอมพิวเตอร์",
        "เชื่อมต่อกับเครือข่าย ESP32 (192.168.4.1) ถ้าจำเป็น",
        "ลองรีสตาร์ทอุปกรณ์ ESP32 และลองใหม่อีกครั้ง",
        "ตรวจสอบว่าไม่มีโปรแกรมอื่นใช้พอร์ตการสื่อสาร"
      ],
      isRetryable: true,
    },
    "mac-mismatch": {
      type: "mac-mismatch",
      title: "อุปกรณ์ไม่ตรงกับ License",
      message: "MAC Address ของ ESP32 ไม่ตรงกับที่ระบุไว้ใน License",
      troubleshooting: [
        "ตรวจสอบว่าเชื่อมต่อกับอุปกรณ์ ESP32 ที่ถูกต้อง",
        "ตรวจสอบ License Key ว่าตรงกับอุปกรณ์ที่ใช้งานจริง",
        "ใช้ License Key ที่สร้างสำหรับอุปกรณ์นี้โดยเฉพาะ",
        "ติดต่อผู้ให้บริการเพื่อขอ License Key ใหม่ถ้าจำเป็น"
      ],
      isRetryable: false,
    },
    "license-expired": {
      type: "license-expired",
      title: "License หมดอายุ",
      message: "License ที่ใช้งานอยู่ได้หมดอายุลงแล้ว",
      troubleshooting: [
        "ตรวจสอบวันหมดอายุของ License",
        "ติดต่อผู้ให้บริการเพื่อต่ออายุการใช้งาน",
        "ขอ License Key ใหม่สำหรับการทำงานต่อ",
        "ตรวจสอบอีเมลสำหรับข้อมูลการต่ออายุ"
      ],
      isRetryable: false,
      emergencyContact: true,
    },
    "network-issues": {
      type: "network-issues",
      title: "ปัญหาการเชื่อมต่อเครือข่าย",
      message: "มีปัญหาในการสื่อสารกับอุปกรณ์เนื่องจากสัญญาณเครือข่ายไม่เสถียร",
      troubleshooting: [
        "ตรวจสอบสัญญาณ WiFi และการเชื่อมต่ออินเทอร์เน็ต",
        "รอสักครู่แล้วลองใหม่อีกครั้ง (อาจเป็นปัญหาชั่วคราว)",
        "ลองย้ายไปใช้งานในพื้นที่ที่มีสัญญาณเครือข่ายดีขึ้น",
        "รีสตาร์ทอุปกรณ์เครือข่าย (Router/Access Point)",
        "ปิดโปรแกรมอื่นๆ ที่ใช้งานเครือข่าย"
      ],
      isRetryable: true,
    },
    "no-license": {
      type: "no-license",
      title: "ไม่พบข้อมูล License",
      message: "ระบบไม่พบข้อมูล License ที่ใช้งานอยู่ในฐานข้อมูล",
      troubleshooting: [
        "ตรวจสอบว่าได้ทำการ Activate License มาก่อนหรือไม่",
        "ใช้ License Key ที่ได้รับจากผู้ให้บริการ",
        "ติดต่อผู้ดูแลระบบเพื่อขอ License Key",
        "ตรวจสอบอีเมลสำหรับข้อมูล License ที่ได้รับ"
      ],
      isRetryable: false,
    },
    "validation-error": {
      type: "validation-error",
      title: "ข้อผิดพลาดในการตรวจสอบ License",
      message: "เกิดข้อผิดพลาดที่ไม่คาดคิดระหว่างการตรวจสอบ License",
      troubleshooting: [
        "ลองรีสตาร์ทโปรแกรมและทำการ Activate ใหม่",
        "ตรวจสอบว่า License Key มีความถูกต้องครบถ้วน",
        "ตรวจสอบพื้นที่จัดเก็บข้อมูลในเครื่องว่าเพียงพอ",
        "ตรวจสอบสิทธิ์การเข้าถึงโปรแกรมในระบบปฏิบัติการ"
      ],
      isRetryable: true,
    },
    "unknown-error": {
      type: "unknown-error",
      title: "ข้อผิดพลาดที่ไม่ทราบสาเหตุ",
      message: "เกิดข้อผิดพลาดที่ไม่สามารถระบุสาเหตุได้",
      troubleshooting: [
        "รีสตาร์ทโปรแกรมและลองใหม่อีกครั้ง",
        "ตรวจสอบการอัพเดทของระบบปฏิบัติการ",
        "ติดต่อผู้ให้บริการเพื่อขอความช่วยเหลือ",
        "บันทึกข้อความแจ้งข้อผิดพลาดเพื่อแจ้งผู้ดูแลระบบ"
      ],
      isRetryable: true,
      emergencyContact: true,
    },
  };

  // Function to detect error type from error message
  const detectErrorType = (errorMessage: string): ErrorType => {
    const lowerError = errorMessage.toLowerCase();

    if (lowerError.includes("esp32") && (lowerError.includes("connect") || lowerError.includes("disconnect"))) {
      return "esp32-disconnected";
    }
    if (lowerError.includes("mac") && (lowerError.includes("mismatch") || lowerError.includes("not match"))) {
      return "mac-mismatch";
    }
    if (lowerError.includes("expired") || lowerError.includes("หมดอายุ")) {
      return "license-expired";
    }
    if (lowerError.includes("network") || lowerError.includes("connection") || lowerError.includes("timeout")) {
      return "network-issues";
    }
    if (lowerError.includes("license") && (lowerError.includes("not found") || lowerError.includes("ไม่พบ"))) {
      return "no-license";
    }
    if (lowerError.includes("validation") || lowerError.includes("ตรวจสอบ")) {
      return "validation-error";
    }

    return "unknown-error";
  };

  // Update error type when validation error changes
  useEffect(() => {
    if (validationError) {
      const detectedType = detectErrorType(validationError);
      setErrorType(detectedType);
    }
  }, [validationError]);
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

        {validationError && errorType && (
          <div className="mt-6 space-y-4">
            {/* Enhanced Error Display */}
            <div className="alert alert-error">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h3 className="font-bold">{errorScenarios[errorType].title}</h3>
                <div className="text-sm">{errorScenarios[errorType].message}</div>
              </div>
            </div>

            {/* Troubleshooting Section */}
            <div className="card bg-base-200">
              <div className="card-body p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-sm flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                    </svg>
                    แนะนำการแก้ไข
                  </h4>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setShowTroubleshooting(!showTroubleshooting)}
                  >
                    {showTroubleshooting ? "ซ่อน" : "แสดง"}
                  </button>
                </div>

                {showTroubleshooting && (
                  <div className="space-y-2">
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      {errorScenarios[errorType].troubleshooting.map((step, index) => (
                        <li key={index} className="text-base-content/80">{step}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            </div>

            {/* Network Awareness for Network-related Errors */}
            {(errorType === "network-issues" || errorType === "esp32-disconnected") && (
              <div className="alert alert-info">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm">
                  <strong>ตรวจสอบเครือข่าย:</strong> สำหรับปัญหาเครือข่าย ลองตรวจสอบสัญญาณ WiFi และการเชื่อมต่อกับ ESP32 Access Point (192.168.4.1)
                </div>
              </div>
            )}

            {/* Emergency Contact for Critical Issues */}
            {errorScenarios[errorType].emergencyContact && (
              <div className="card bg-warning/10 border border-warning/20">
                <div className="card-body p-4">
                  <h4 className="font-bold text-sm flex items-center gap-2 text-warning">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2c.485 0 .95-.066 1.37-.187.763-.207 1.38-.82 1.63-1.543.12-.42.187-.865.187-1.32v-2c0-8.284-6.716-15-15-15h-2c-.485 0-.95.066-1.37.187-.763.207-1.38.82-1.63 1.543C2.066 8.415 2 8.86 2 9.315v2z" />
                    </svg>
                    ติดต่อฝ่ายสนับสนุน
                  </h4>
                  <div className="text-sm space-y-1">
                    <div><strong>Email:</strong> support@smc-system.com</div>
                    <div><strong>Phone:</strong> 02-XXX-XXXX (เวลา 08:30-17:30 น.)</div>
                    <div><strong>Line Official:</strong> @smcsupport</div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="card-actions justify-end gap-2">
              {errorScenarios[errorType].isRetryable && (
                <button className="btn btn-primary" onClick={onRetry}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                  ลองใหม่
                </button>
              )}

              {onRetryStep && (
                <button className="btn btn-outline" onClick={() => onRetryStep("device-detection")}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
                  </svg>
                  กลับไปตรวจสอบอุปกรณ์
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}