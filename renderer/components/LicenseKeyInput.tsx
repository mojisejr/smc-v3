import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";

interface ParsedLicense {
  organization: string;
  expiresAt: string;
  macAddress: string;
  issuer: string;
  isActive: boolean;
}

interface LicenseKeyInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (data: { key: string }) => void;
  isSubmitting: boolean;
  parsedLicense: ParsedLicense | null;
  validationError: string | null;
}

export default function LicenseKeyInput({
  value,
  onChange,
  onSubmit,
  isSubmitting,
  parsedLicense,
  validationError,
}: LicenseKeyInputProps) {
  const { register, handleSubmit, setValue, watch, formState: { errors, isValid } } = useForm<{ key: string }>({
    mode: "onChange",
  });

  const watchedKey = watch("key");

  // Parse PEM license format
  const parsePEMLicense = (key: string): ParsedLicense | null => {
    try {
      // Check if it's a PEM format
      if (!key.includes("-----BEGIN LICENSE-----") || !key.includes("-----END LICENSE-----")) {
        return null;
      }

      // Extract base64 content
      const base64Content = key
        .replace("-----BEGIN LICENSE-----", "")
        .replace("-----END LICENSE-----", "")
        .trim();

      // Decode base64
      const decodedContent = atob(base64Content);

      // Parse JSON content
      const licenseData = JSON.parse(decodedContent);

      // Extract MAC address from license
      const macAddress = licenseData.device?.mac_address || licenseData.mac_address || "";

      return {
        organization: licenseData.organization || licenseData.org || "Unknown",
        expiresAt: licenseData.expires_at || licenseData.expiresAt || "Unknown",
        macAddress: macAddress.toUpperCase(),
        issuer: licenseData.issuer || licenseData.issued_by || "Unknown",
        isActive: !licenseData.expired && new Date(licenseData.expires_at) > new Date(),
      };
    } catch (error) {
      console.error("License parsing error:", error);
      return null;
    }
  };

  useEffect(() => {
    setValue("key", value);
  }, [value, setValue]);

  useEffect(() => {
    if (watchedKey) {
      onChange(watchedKey);
    }
  }, [watchedKey, onChange]);

  const formatKey = (key: string): string => {
    // Clean up the key format
    return key
      .replace(/\r\n/g, "\n") // Normalize line endings
      .replace(/\n\s*\n/g, "\n") // Remove empty lines
      .trim();
  };

  const handleKeyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const formattedKey = formatKey(e.target.value);
    setValue("key", formattedKey, { shouldValidate: true });
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const formattedKey = formatKey(pastedText);
    setValue("key", formattedKey, { shouldValidate: true });
  };

  const isValidPEMFormat = (key: string): boolean => {
    return key.includes("-----BEGIN LICENSE-----") &&
           key.includes("-----END LICENSE-----") &&
           key.split("\n").length >= 3;
  };

  const keyIsValid = isValid && watchedKey && isValidPEMFormat(watchedKey);

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title text-lg font-bold">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
          </svg>
          ข้อมูล License
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">License Key (PEM Format)</span>
              <span className="label-text-alt text-error">* จำเป็น</span>
            </label>
            <textarea
              {...register("key", {
                required: "กรุณาใส่ License Key",
                validate: (value) => {
                  if (!value.trim()) return "กรุณาใส่ License Key";
                  if (!isValidPEMFormat(value)) {
                    return "รูปแบบ License ไม่ถูกต้อง ต้องเป็น PEM format";
                  }
                  return true;
                }
              })}
              className={`textarea textarea-bordered h-40 font-mono text-sm ${errors.key ? "textarea-error" : ""} ${
                watchedKey && isValidPEMFormat(watchedKey) ? "textarea-success" : ""
              }`}
              placeholder="-----BEGIN LICENSE-----&#10;[Base64 encoded license data]&#10;-----END LICENSE-----"
              onChange={handleKeyChange}
              onPaste={handlePaste}
              disabled={isSubmitting}
            />
            {errors.key && (
              <label className="label">
                <span className="label-text-alt text-error">{errors.key.message}</span>
              </label>
            )}
            <label className="label">
              <span className="label-text-alt">
                วาง License Key ที่ได้รับจากบริษัท ในรูปแบบ PEM (-----BEGIN LICENSE----- ถึง -----END LICENSE-----)
              </span>
            </label>
          </div>

          {validationError && (
            <div className="alert alert-error">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{validationError}</span>
            </div>
          )}

          {parsedLicense && (
            <div className="card bg-base-200">
              <div className="card-body p-4">
                <h3 className="card-title text-base font-bold mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  ข้อมูล License ที่ตรวจสอบแล้ว
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold">หน่วยงาน</span>
                    </label>
                    <div className="badge badge-primary p-3">
                      {parsedLicense.organization}
                    </div>
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold">ผู้ออก License</span>
                    </label>
                    <div className="badge badge-secondary p-3">
                      {parsedLicense.issuer}
                    </div>
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold">วันหมดอายุ</span>
                    </label>
                    <div className={`badge p-3 ${parsedLicense.isActive ? "badge-success" : "badge-error"}`}>
                      {parsedLicense.expiresAt}
                    </div>
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold">MAC Address ที่ผูกไว้</span>
                    </label>
                    <div className="badge badge-warning p-3 font-mono">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                      </svg>
                      {parsedLicense.macAddress}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4">
                  {parsedLicense.isActive ? (
                    <>
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="text-success font-semibold">License ยังใช้งานได้</span>
                    </>
                  ) : (
                    <>
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span className="text-error font-semibold">License หมดอายุแล้ว</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="card-actions justify-end">
            <button
              type="submit"
              className={`btn btn-primary ${isSubmitting ? "loading" : ""}`}
              disabled={!keyIsValid || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="loading loading-spinner loading-sm"></div>
                  กำลังตรวจสอบ...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>
                  ถัดไป: ตรวจสอบอุปกรณ์
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}