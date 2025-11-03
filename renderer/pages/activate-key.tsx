import { ipcRenderer } from "electron";
import { useRouter } from "next/router";
import React, { useState, useEffect } from "react";

import ESP32ConnectionStatus from "../components/ESP32ConnectionStatus";
import LicenseKeyInput from "../components/LicenseKeyInput";
import LicenseValidationProgress from "../components/LicenseValidationProgress";

interface ESP32DeviceInfo {
  mac_address: string;
  ip_address: string;
  hostname: string;
  firmware_version: string;
  chip_id: string;
  flash_id: string;
  free_heap: number;
  uptime: number;
}

interface ParsedLicense {
  organization: string;
  expiresAt: string;
  macAddress: string;
  issuer: string;
  isActive: boolean;
}

type WizardStep = "device-detection" | "license-input" | "validation" | "complete";

export default function ActivatePage() {
  const { replace } = useRouter();
  const [currentStep, setCurrentStep] = useState<WizardStep>("device-detection");
  const [isDevMode, setIsDevMode] = useState(false);

  // ESP32 connection state
  const [isESP32Connected, setIsESP32Connected] = useState(false);
  const [isESP32Connecting, setIsESP32Connecting] = useState(false);
  const [esp32DeviceInfo, setEsp32DeviceInfo] = useState<ESP32DeviceInfo | null>(null);

  // License input state
  const [licenseKey, setLicenseKey] = useState("");
  const [parsedLicense, setParsedLicense] = useState<ParsedLicense | null>(null);

  // Validation state
  const [isValidationInProgress, setIsValidationInProgress] = useState(false);
  const [validationComplete, setValidationComplete] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmittingLicense, setIsSubmittingLicense] = useState(false);

  // Check for development mode and existing activation
  useEffect(() => {
    const checkDevelopmentMode = async () => {
      try {
        // Check if we're in development mode
        const isDev = process.env.NODE_ENV === 'development';
        setIsDevMode(isDev);

        if (isDev) {
          console.log("Running in development mode - License activation bypassed");
          // In development mode, redirect directly to home after a short delay
          setTimeout(() => {
            replace("/home");
          }, 2000);
        }

        // Check if license is already activated
        const licenseStatus = await ipcRenderer.invoke("license:status");
        if (licenseStatus.isActive) {
          console.log("License is already activated");
          replace("/home");
        }
      } catch (error) {
        console.error("Error checking license status:", error);
      }
    };

    checkDevelopmentMode();
  }, [replace]);

  // Auto-check ESP32 connection when starting
  useEffect(() => {
    if (currentStep === "device-detection") {
      testESP32Connection();
    }
  }, [currentStep]);

  const testESP32Connection = async () => {
    setIsESP32Connecting(true);
    try {
      const result = await ipcRenderer.invoke("esp32:test-connection");

      if (result.success && result.deviceInfo) {
        setIsESP32Connected(true);
        setEsp32DeviceInfo(result.deviceInfo);
      } else {
        setIsESP32Connected(false);
        setEsp32DeviceInfo(null);
      }
    } catch (error: any) {
      console.error("ESP32 connection test failed:", error);
      setIsESP32Connected(false);
      setEsp32DeviceInfo(null);
    } finally {
      setIsESP32Connecting(false);
    }
  };

  const handleTestConnection = async () => {
    await testESP32Connection();
  };

  const handleLicenseSubmit = async (data: { key: string }) => {
    setIsSubmittingLicense(true);
    setValidationError(null);

    try {
      // Parse the license to extract MAC address for comparison
      const parsed = parseLicenseKey(data.key);
      setParsedLicense(parsed);

      // Move to validation step
      setCurrentStep("validation");

      // Start validation process
      await startLicenseValidation(data.key);

    } catch (error: any) {
      setValidationError(`License validation failed: ${error.message}`);
    } finally {
      setIsSubmittingLicense(false);
    }
  };

  const parseLicenseKey = (key: string): ParsedLicense => {
    try {
      // Try PEM format first (existing system)
      if (key.includes("BEGIN LICENSE") || key.includes("BEGIN SMC LICENSE")) {
        return parsePEMLicense(key);
      }

      // Try JWT format from ESP32 deployment tool
      if (key.includes(".") && key.split(".").length === 3) {
        return parseJWTLicense(key);
      }

      // If no clear format indicator, try both
      try {
        return parsePEMLicense(key);
      } catch {
        return parseJWTLicense(key);
      }
    } catch (error) {
      throw new Error("Invalid license format. Expected PEM format (-----BEGIN SMC LICENSE-----) or JWT format from ESP32 deployment tool");
    }
  };

  const parsePEMLicense = (key: string): ParsedLicense => {
    try {
      // Handle both old and new PEM headers
      const base64Content = key
        .replace("-----BEGIN LICENSE-----", "")
        .replace("-----END LICENSE-----", "")
        .replace("-----BEGIN SMC LICENSE-----", "")
        .replace("-----END SMC LICENSE-----", "")
        .trim();

      const decodedContent = atob(base64Content);
      const licenseData = JSON.parse(decodedContent);

      const macAddress = licenseData.device?.mac_address || licenseData.mac_address || "";

      return {
        organization: licenseData.organization || licenseData.org || "Unknown",
        expiresAt: licenseData.expires_at || licenseData.expiry || licenseData.expiresAt || "Unknown",
        macAddress: macAddress.toUpperCase(),
        issuer: licenseData.issuer || licenseData.issued_by || "Unknown",
        isActive: !licenseData.expired && new Date(licenseData.expires_at || licenseData.expiry) > new Date(),
      };
    } catch (error) {
      throw new Error("Invalid PEM license format");
    }
  };

  const parseJWTLicense = (key: string): ParsedLicense => {
    try {
      // JWT format: base64url(payload).base64url(signature)
      const parts = key.split(".");
      if (parts.length !== 3) {
        throw new Error("Invalid JWT format");
      }

      // Decode payload using base64url
      const payload = parts[1];
      const base64Payload = payload.replace(/-/g, '+').replace(/_/g, '/');
      const decodedContent = atob(base64Payload);
      const licenseData = JSON.parse(decodedContent);

      // Map ESP32 license fields to frontend interface
      const macAddress = licenseData.mac || "";

      return {
        organization: licenseData.customer || "Unknown",
        expiresAt: licenseData.expiry || "Unknown",
        macAddress: macAddress.toUpperCase(),
        issuer: "ESP32 Deployment Tool",
        isActive: new Date(licenseData.expiry) > new Date(),
      };
    } catch (error) {
      throw new Error("Invalid JWT license format");
    }
  };

  const startLicenseValidation = async (key: string) => {
    setIsValidationInProgress(true);
    setValidationError(null);

    try {
      // Get latest ESP32 device info
      const deviceInfoResult = await ipcRenderer.invoke("esp32:get-info");

      if (!deviceInfoResult.success || !deviceInfoResult.deviceInfo) {
        throw new Error("ไม่สามารถเชื่อมต่อกับ ESP32 ได้ กรุณาตรวจสอบการเชื่อมต่อ");
      }

      const deviceInfo = deviceInfoResult.deviceInfo;

      // Call the license activation handler with real-time MAC validation
      const activationResult = await ipcRenderer.invoke("license:activate", { key });

      if (!activationResult.success) {
        throw new Error(activationResult.message || "การเปิดใช้งาน license ล้มเหลว");
      }

      // Update device info for display
      setEsp32DeviceInfo(deviceInfo);

      // Show success state
      setValidationComplete(true);
      setIsValidationInProgress(false);

      // After successful activation, check and redirect
      setTimeout(async () => {
        const licenseStatus = await ipcRenderer.invoke("license:status");
        if (licenseStatus.isActive) {
          alert("เปิดใช้งาน License สำเร็จ กรุณารีสตาร์ทโปรแกรมเพื่อให้มีผลบังคับใช้");
          replace("/home");
        }
      }, 2000);

    } catch (error: any) {
      console.error("License validation error:", error);
      setValidationError(error.message || "การตรวจสอบ License ล้มเหลว");
      setIsValidationInProgress(false);
    }
  };

  const handleRetryValidation = () => {
    setCurrentStep("license-input");
    setValidationComplete(false);
    setValidationError(null);
  };

  const canProceedToLicense = () => {
    return isESP32Connected && esp32DeviceInfo;
  };

  // Development mode view
  if (isDevMode) {
    return (
      <div className="w-full flex h-screen justify-center items-center">
        <div className="card bg-base-100 shadow-xl p-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-success mb-4">
              Development Mode
            </h1>
            <p className="text-lg mb-4">License activation bypassed</p>
            <div className="loading loading-spinner loading-lg"></div>
            <p className="mt-4">Redirecting to home page...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">การเปิดใช้งาน License</h1>
          <p className="text-base-content/70">Smart Medication Cart Version 1.0</p>
        </div>

        {/* Progress Indicator */}
        <div className="w-full mb-8">
          <ul className="steps w-full">
            <li className={`step ${currentStep === "device-detection" ? "step-primary" : isESP32Connected ? "step-success" : ""}`}>
              ตรวจสอบอุปกรณ์
            </li>
            <li className={`step ${currentStep === "license-input" ? "step-primary" : licenseKey ? "step-success" : ""}`}>
              กรอกข้อมูล License
            </li>
            <li className={`step ${currentStep === "validation" || currentStep === "complete" ? "step-primary" : validationComplete ? "step-success" : ""}`}>
              ตรวจสอบและเปิดใช้งาน
            </li>
          </ul>
        </div>

        {/* Step Content */}
        <div className="space-y-6">
          {currentStep === "device-detection" && (
            <div className="space-y-6">
              <ESP32ConnectionStatus
                isConnected={isESP32Connected}
                deviceInfo={esp32DeviceInfo}
                isConnecting={isESP32Connecting}
                onTestConnection={handleTestConnection}
              />

              {canProceedToLicense() && (
                <div className="card-actions justify-end">
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={() => setCurrentStep("license-input")}
                  >
                    ถัดไป: กรอก License Key
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 ml-2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          )}

          {currentStep === "license-input" && (
            <div className="space-y-4">
              <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">อุปกรณ์ที่เชื่อมต่อ</h3>
                      <p className="text-sm text-base-content/70">MAC: {esp32DeviceInfo?.mac_address}</p>
                    </div>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => setCurrentStep("device-detection")}
                    >
                      ตรวจสอบใหม่
                    </button>
                  </div>
                </div>
              </div>

              <LicenseKeyInput
                value={licenseKey}
                onChange={setLicenseKey}
                onSubmit={handleLicenseSubmit}
                isSubmitting={isSubmittingLicense}
                parsedLicense={parsedLicense}
                validationError={validationError}
              />
            </div>
          )}

          {(currentStep === "validation" || currentStep === "complete") && (
            <LicenseValidationProgress
              isValidationInProgress={isValidationInProgress}
              validationComplete={validationComplete}
              validationError={validationError}
              esp32MacAddress={esp32DeviceInfo?.mac_address}
              licenseMacAddress={parsedLicense?.macAddress}
              onRetry={handleRetryValidation}
            />
          )}
        </div>
      </div>
    </div>
  );
}
