/**
 * CU12 Error Display Component - Example Implementation
 * 
 * This component demonstrates how to display CU12 errors in the renderer process
 * using shared types imported from @shared/types.
 * 
 * IMPORTANT: This is an example implementation. Integrate into actual UI as needed.
 */

import React from 'react';
import {
  CU12ErrorCode,
  CU12ProtocolError,
  CU12ConnectionError,
  CU12CommandError,
} from '@shared/types';

/**
 * Props for CU12ErrorDisplay component
 */
interface CU12ErrorDisplayProps {
  error: CU12ProtocolError | CU12ConnectionError | CU12CommandError;
  onRetry?: () => void;
  onDismiss?: () => void;
}

/**
 * CU12 Error Display Component
 * Renders error information with user-friendly messages
 */
export const CU12ErrorDisplay: React.FC<CU12ErrorDisplayProps> = ({
  error,
  onRetry,
  onDismiss,
}) => {
  /**
   * Type guard to check if error is a protocol error
   */
  const isProtocolError = (err: any): err is CU12ProtocolError => {
    return 'code' in err && typeof err.code === 'number';
  };

  /**
   * Type guard to check if error is a connection error
   */
  const isConnectionError = (err: any): err is CU12ConnectionError => {
    return 'type' in err && (err.type === 'tcp' || err.type === 'rs485');
  };

  /**
   * Type guard to check if error is a command error
   */
  const isCommandError = (err: any): err is CU12CommandError => {
    return 'command' in err && typeof err.command === 'number';
  };

  /**
   * Get error severity for styling
   */
  const getErrorSeverity = (): 'error' | 'warning' | 'info' => {
    if (isProtocolError(error)) {
      switch (error.code) {
        case CU12ErrorCode.DEVICE_BUSY:
        case CU12ErrorCode.CONNECTION_TIMEOUT:
        case CU12ErrorCode.COMMAND_TIMEOUT:
          return 'warning';
        case CU12ErrorCode.INVALID_COMMAND:
        case CU12ErrorCode.INVALID_ADDRESS:
        case CU12ErrorCode.CONNECTION_REFUSED:
          return 'error';
        default:
          return 'warning';
      }
    }
    return 'error';
  };

  /**
   * Get user-friendly error title
   */
  const getErrorTitle = (): string => {
    if (isProtocolError(error)) {
      return 'ข้อผิดพลาดจากโปรโตคอล CU12';
    } else if (isConnectionError(error)) {
      return 'ข้อผิดพลาดในการเชื่อมต่อ';
    } else if (isCommandError(error)) {
      return 'ข้อผิดพลาดในการส่งคำสั่ง';
    }
    return 'ข้อผิดพลาด';
  };

  /**
   * Get error details for display
   */
  const getErrorDetails = (): string[] => {
    const details: string[] = [];
    
    if (isProtocolError(error)) {
      details.push(`รหัสข้อผิดพลาด: 0x${error.code.toString(16)}`);
      if (error.command) {
        details.push(`คำสั่ง: 0x${error.command.toString(16)}`);
      }
      if (error.address !== undefined) {
        details.push(`ที่อยู่: 0x${error.address.toString(16)}`);
      }
    } else if (isConnectionError(error)) {
      details.push(`ประเภทการเชื่อมต่อ: ${error.type.toUpperCase()}`);
      if (error.host && error.port) {
        details.push(`ที่อยู่: ${error.host}:${error.port}`);
      }
      if (error.path) {
        details.push(`พอร์ต: ${error.path}`);
      }
    } else if (isCommandError(error)) {
      details.push(`คำสั่ง: 0x${error.command.toString(16)}`);
      if (error.slotId) {
        details.push(`ช่อง: ${error.slotId}`);
      }
    }

    return details;
  };

  const severity = getErrorSeverity();
  const alertClass =
    severity === 'error'
      ? 'alert-error'
      : severity === 'warning'
      ? 'alert-warning'
      : 'alert-info';

  return (
    <div className={`alert ${alertClass} shadow-lg`}>
      <div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="stroke-current flex-shrink-0 h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div>
          <h3 className="font-bold">{getErrorTitle()}</h3>
          <div className="text-sm">{error.message}</div>
          {getErrorDetails().length > 0 && (
            <div className="text-xs mt-2 space-y-1">
              {getErrorDetails().map((detail, index) => (
                <div key={index}>{detail}</div>
              ))}
            </div>
          )}
          {error.timestamp && (
            <div className="text-xs mt-2 opacity-70">
              เวลา: {new Date(error.timestamp).toLocaleString('th-TH')}
            </div>
          )}
        </div>
      </div>
      <div className="flex-none space-x-2">
        {onRetry && (
          <button className="btn btn-sm btn-ghost" onClick={onRetry}>
            ลองใหม่
          </button>
        )}
        {onDismiss && (
          <button className="btn btn-sm btn-ghost" onClick={onDismiss}>
            ปิด
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Example usage in a page component:
 * 
 * import { CU12ErrorDisplay } from '@/components/errors/CU12ErrorDisplay';
 * import { CU12ProtocolError, CU12ErrorCode } from '@shared/types';
 * 
 * const MyComponent = () => {
 *   const [error, setError] = useState<CU12ProtocolError | null>(null);
 * 
 *   const handleError = () => {
 *     setError({
 *       code: CU12ErrorCode.DEVICE_BUSY,
 *       command: 0x80,
 *       message: 'อุปกรณ์กำลังทำงาน กรุณารอสักครู่',
 *       timestamp: Date.now(),
 *     });
 *   };
 * 
 *   return (
 *     <div>
 *       {error && (
 *         <CU12ErrorDisplay
 *           error={error}
 *           onRetry={() => {
 *             // Retry logic
 *             setError(null);
 *           }}
 *           onDismiss={() => setError(null)}
 *         />
 *       )}
 *     </div>
 *   );
 * };
 */
