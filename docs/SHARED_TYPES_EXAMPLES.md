# Shared Types Usage Examples

This document provides practical examples of using the shared types system to prevent webpack module parse errors.

## Table of Contents

1. [Basic Usage](#basic-usage)
2. [Main Process Examples](#main-process-examples)
3. [Renderer Process Examples](#renderer-process-examples)
4. [IPC Communication](#ipc-communication)
5. [Error Handling Patterns](#error-handling-patterns)

## Basic Usage

### Importing Shared Types

```typescript
// Both main and renderer processes can use these imports
import { 
  CU12ErrorCode, 
  CU12ProtocolError,
  CU12ConnectionError,
  CU12CommandError,
  CU12ErrorResponse 
} from '@shared/types';
```

### Creating Error Objects

```typescript
// Creating a protocol error
const protocolError: CU12ProtocolError = {
  code: CU12ErrorCode.DEVICE_BUSY,
  command: 0x80,
  message: 'Device is currently busy',
  address: 0x00,
  timestamp: Date.now()
};

// Creating a connection error
const connectionError: CU12ConnectionError = {
  type: 'rs485',
  path: '/dev/ttyUSB0',
  message: 'Connection timeout',
  timestamp: Date.now()
};

// Creating a command error
const commandError: CU12CommandError = {
  command: 0x81,
  slotId: 5,
  message: 'Slot unlock failed',
  timestamp: Date.now()
};
```

## Main Process Examples

### Example 1: CU12 Error Handler (main/cu12/error-handler.ts)

```typescript
import {
  CU12ErrorCode,
  CU12ProtocolError,
  CU12ErrorResponse,
} from '@shared/types';

export class CU12ErrorHandler {
  static handleProtocolError(error: CU12ProtocolError): CU12ErrorResponse {
    console.error(`[CU12 Error] ${error.message}`);
    
    return {
      success: false,
      error,
      retryable: error.code === CU12ErrorCode.DEVICE_BUSY,
      retryAfter: 1000
    };
  }
}
```

### Example 2: IPC Error Sender (main/ipc/error-sender.ts)

```typescript
import { BrowserWindow } from 'electron';
import { CU12ProtocolError, CU12ErrorCode } from '@shared/types';

export function sendErrorToRenderer(
  win: BrowserWindow,
  error: CU12ProtocolError
): void {
  win.webContents.send('cu12:error', {
    code: error.code,
    message: error.message,
    timestamp: error.timestamp
  });
}

// Usage
const error: CU12ProtocolError = {
  code: CU12ErrorCode.SLOT_BUSY,
  message: 'Slot is currently in use',
  timestamp: Date.now()
};

sendErrorToRenderer(mainWindow, error);
```

### Example 3: CU12 Adapter with Error Handling

```typescript
import { CU12ProtocolError, CU12ErrorCode } from '@shared/types';

export class CU12Adapter {
  async unlock(slotId: number): Promise<void> {
    try {
      // ... unlock logic
    } catch (err) {
      const error: CU12ProtocolError = {
        code: CU12ErrorCode.SLOT_BUSY,
        command: 0x81,
        message: `Failed to unlock slot ${slotId}: ${err.message}`,
        timestamp: Date.now()
      };
      
      throw error;
    }
  }
}
```

## Renderer Process Examples

### Example 1: React Error Display Component

```typescript
import React from 'react';
import { CU12ProtocolError, CU12ErrorCode } from '@shared/types';

interface Props {
  error: CU12ProtocolError;
  onRetry?: () => void;
}

export const ErrorDisplay: React.FC<Props> = ({ error, onRetry }) => {
  const getUserMessage = (code: CU12ErrorCode): string => {
    switch (code) {
      case CU12ErrorCode.DEVICE_BUSY:
        return 'อุปกรณ์กำลังทำงาน กรุณารอสักครู่';
      case CU12ErrorCode.SLOT_BUSY:
        return 'ช่องกำลังถูกใช้งาน';
      default:
        return error.message;
    }
  };

  return (
    <div className="alert alert-error">
      <div>
        <h3>เกิดข้อผิดพลาด</h3>
        <p>{getUserMessage(error.code)}</p>
        <small>Error Code: 0x{error.code.toString(16)}</small>
      </div>
      {onRetry && (
        <button onClick={onRetry}>ลองใหม่</button>
      )}
    </div>
  );
};
```

### Example 2: IPC Error Receiver

```typescript
import { useEffect, useState } from 'react';
import { CU12ProtocolError } from '@shared/types';

export function useC12Errors() {
  const [error, setError] = useState<CU12ProtocolError | null>(null);

  useEffect(() => {
    const handleError = (event: any, errorData: CU12ProtocolError) => {
      setError(errorData);
    };

    window.ipc.on('cu12:error', handleError);

    return () => {
      window.ipc.removeListener('cu12:error', handleError);
    };
  }, []);

  return { error, clearError: () => setError(null) };
}
```

### Example 3: Error Context Provider

```typescript
import React, { createContext, useContext, useState } from 'react';
import { 
  CU12ProtocolError, 
  CU12ConnectionError, 
  CU12CommandError 
} from '@shared/types';

type CU12Error = CU12ProtocolError | CU12ConnectionError | CU12CommandError;

interface ErrorContextType {
  error: CU12Error | null;
  setError: (error: CU12Error | null) => void;
  clearError: () => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export const ErrorProvider: React.FC = ({ children }) => {
  const [error, setError] = useState<CU12Error | null>(null);

  return (
    <ErrorContext.Provider 
      value={{ 
        error, 
        setError, 
        clearError: () => setError(null) 
      }}
    >
      {children}
    </ErrorContext.Provider>
  );
};

export const useError = () => {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useError must be used within ErrorProvider');
  }
  return context;
};
```

## IPC Communication

### Pattern 1: Error Reporting via IPC

**Main Process (main/ipc/handlers.ts):**
```typescript
import { ipcMain } from 'electron';
import { CU12ProtocolError, CU12ErrorCode } from '@shared/types';

ipcMain.handle('cu12:unlock', async (event, slotId: number) => {
  try {
    await cu12Adapter.unlock(slotId);
    return { success: true };
  } catch (err) {
    const error: CU12ProtocolError = {
      code: CU12ErrorCode.SLOT_BUSY,
      command: 0x81,
      message: err.message,
      timestamp: Date.now()
    };
    
    return { 
      success: false, 
      error 
    };
  }
});
```

**Renderer Process (renderer/hooks/useCU12.ts):**
```typescript
import { CU12ProtocolError } from '@shared/types';

export async function unlockSlot(slotId: number): Promise<void> {
  const result = await window.ipc.invoke('cu12:unlock', slotId);
  
  if (!result.success) {
    const error = result.error as CU12ProtocolError;
    throw error;
  }
}
```

### Pattern 2: Bidirectional Error Communication

**Main Process:**
```typescript
import { CU12ConnectionError } from '@shared/types';

// Send connection status to renderer
function notifyConnectionError(error: CU12ConnectionError) {
  mainWindow.webContents.send('cu12:connection-error', error);
}
```

**Renderer Process:**
```typescript
import { CU12ConnectionError } from '@shared/types';

window.ipc.on('cu12:connection-error', (event, error: CU12ConnectionError) => {
  console.error('Connection failed:', error);
  // Update UI with error
});
```

## Error Handling Patterns

### Pattern 1: Retry Logic with Exponential Backoff

```typescript
import { CU12ErrorResponse, CU12ErrorCode } from '@shared/types';

async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: CU12ErrorResponse | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as CU12ErrorResponse;
      
      if (!lastError.retryable) {
        throw lastError;
      }
      
      const delay = lastError.retryAfter || (1000 * Math.pow(2, attempt));
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

// Usage
try {
  await retryOperation(() => cu12Adapter.unlock(5));
} catch (error) {
  console.error('Operation failed after retries:', error);
}
```

### Pattern 2: Error Translation Layer

```typescript
import { CU12ErrorCode, CU12ProtocolError } from '@shared/types';

export function translateErrorToUserMessage(error: CU12ProtocolError): string {
  const translations: Record<CU12ErrorCode, string> = {
    [CU12ErrorCode.INVALID_COMMAND]: 'คำสั่งไม่ถูกต้อง',
    [CU12ErrorCode.INVALID_ADDRESS]: 'ที่อยู่ไม่ถูกต้อง',
    [CU12ErrorCode.DEVICE_BUSY]: 'อุปกรณ์กำลังทำงาน กรุณารอสักครู่',
    [CU12ErrorCode.SLOT_BUSY]: 'ช่องกำลังถูกใช้งาน',
    [CU12ErrorCode.SLOT_LOCKED]: 'ช่องถูกล็อค',
    // ... add more translations
  };

  return translations[error.code as CU12ErrorCode] || error.message;
}
```

### Pattern 3: Error Aggregation

```typescript
import { CU12ProtocolError } from '@shared/types';

export class ErrorAggregator {
  private errors: CU12ProtocolError[] = [];

  addError(error: CU12ProtocolError): void {
    this.errors.push(error);
    
    // Keep only last 100 errors
    if (this.errors.length > 100) {
      this.errors = this.errors.slice(-100);
    }
  }

  getRecentErrors(count: number = 10): CU12ProtocolError[] {
    return this.errors.slice(-count);
  }

  getErrorsByCode(code: number): CU12ProtocolError[] {
    return this.errors.filter(e => e.code === code);
  }

  clearErrors(): void {
    this.errors = [];
  }
}
```

## Best Practices

### ✅ Do This:

1. **Always import from `@shared/types`:**
   ```typescript
   import { CU12ProtocolError } from '@shared/types';
   ```

2. **Include timestamps in errors:**
   ```typescript
   const error: CU12ProtocolError = {
     code: CU12ErrorCode.DEVICE_BUSY,
     message: 'Device busy',
     timestamp: Date.now() // Always include
   };
   ```

3. **Use type guards for error discrimination:**
   ```typescript
   function isProtocolError(error: any): error is CU12ProtocolError {
     return 'code' in error && typeof error.code === 'number';
   }
   ```

### ❌ Don't Do This:

1. **Don't import from main in renderer or vice versa:**
   ```typescript
   // ❌ WRONG - Will cause webpack error
   import { SomeType } from '../../main/interfaces/types';
   ```

2. **Don't create duplicate error interfaces:**
   ```typescript
   // ❌ WRONG - Use shared types instead
   interface MyCustomCU12Error {
     code: number;
     message: string;
   }
   ```

3. **Don't mix error types:**
   ```typescript
   // ❌ WRONG - Type inconsistency
   const error = {
     code: 'DEVICE_BUSY', // Should be number
     message: 123 // Should be string
   };
   ```

## Troubleshooting

### Issue: "Cannot find module '@shared/types'"

**Solution:**
1. Verify `tsconfig.json` has correct path mappings
2. Restart TypeScript server in your IDE
3. Clear build cache: `rm -rf .next/ app/ dist/`

### Issue: "Module parse failed: Unexpected token"

**Solution:**
This error occurs when main process tries to import from renderer. Move the interface to `shared/types/` and import using `@shared/types`.

### Issue: Type mismatches between processes

**Solution:**
Ensure both processes import from the same source (`@shared/types`). Never duplicate type definitions.

---

**Last Updated:** 2025-10-23
**Related Documentation:**
- [Interface Organization Guide](./INTERFACE_ORGANIZATION.md)
- [Shared Types README](../shared/README.md)
