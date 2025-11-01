import React from "react";
import { maskLicenseToken } from "@/lib/license-utils";

interface LicenseDownloadProps {
  licenseFilePath?: string;
  licenseFileName?: string;
  licenseToken?: string;
  error?: string;
}

/**
 * LicenseDownload Component
 *
 * Displays license file information and download link
 * Shows masked license token for security
 */
export function LicenseDownload({
  licenseFilePath,
  licenseFileName,
  licenseToken,
  error,
}: LicenseDownloadProps) {
  const handleDownload = () => {
    if (!licenseToken || !licenseFileName) {
      return;
    }

    // Create blob from license token
    const blob = new Blob([licenseToken], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    // Create temporary download link
    const link = document.createElement("a");
    link.href = url;
    link.download = licenseFileName;
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = async () => {
    if (!licenseToken) return;

    try {
      await navigator.clipboard.writeText(licenseToken);
      alert("License token copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy:", err);
      alert("Failed to copy license token");
    }
  };

  // Error state
  if (error) {
    return (
      <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-red-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              License Generation Failed
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No license data
  if (!licenseToken || !licenseFileName) {
    return null;
  }

  const maskedToken = maskLicenseToken(licenseToken);

  return (
    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg
            className="h-6 w-6 text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-green-800">
            ✅ License Generated Successfully
          </h3>

          <div className="mt-3 space-y-2">
            {/* License file name */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-green-700">
                📄 <strong>File:</strong> {licenseFileName}
              </span>
            </div>

            {/* File path */}
            {licenseFilePath && (
              <div className="text-xs text-green-600 break-all">
                <strong>Path:</strong> {licenseFilePath}
              </div>
            )}

            {/* Masked token */}
            <div className="mt-2 p-2 bg-white border border-green-300 rounded">
              <div className="text-xs font-mono text-gray-600 break-all">
                {maskedToken}
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleDownload}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <svg
                  className="mr-2 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Download License File
              </button>

              <button
                onClick={copyToClipboard}
                className="inline-flex items-center px-4 py-2 border border-green-300 text-sm font-medium rounded-md text-green-700 bg-white hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <svg
                  className="mr-2 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                Copy Token
              </button>
            </div>

            {/* Info message */}
            <div className="mt-3 text-xs text-green-600">
              <p>
                ℹ️ This license file has been saved to your Desktop. Keep it
                secure and provide it to the customer for device activation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
