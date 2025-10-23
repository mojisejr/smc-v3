# Interface Organization and Best Practices

## Overview

This document describes how TypeScript interfaces are organized in the SMC v3 project to prevent webpack module parse errors and ensure clean separation between main and renderer processes.

## Directory Structure

```
shared/
  types/
    cu12-errors.ts      # CU12-specific error interfaces
    index.ts            # Barrel exports for shared types
  index.ts              # Main shared module export

main/
  interfaces/
    *.ts                # Main process-specific interfaces
    index.ts            # Barrel exports for main interfaces
    dtos/               # Data Transfer Objects

renderer/
  interfaces/
    *.ts                # Renderer process-specific interfaces
    index.ts            # Barrel exports for renderer interfaces
```

## Three Categories of Interfaces

### 1. Shared Interfaces (shared/types/)

**Purpose**: Types and interfaces used by BOTH main and renderer processes

**Location**: `shared/types/`

**Import Path**: `@shared/types` or `@shared/types/[specific-file]`

**Examples**:
- CU12 error interfaces (CU12ProtocolError, CU12ConnectionError, etc.)
- Common data structures passed via IPC
- Shared enums and constants

**Usage**:
```typescript
// In main process
import { CU12ErrorCode, CU12ProtocolError } from '@shared/types';

// In renderer process
import { CU12ErrorCode, CU12ProtocolError } from '@shared/types';
```

### 2. Main Process Interfaces (main/interfaces/)

**Purpose**: Types and interfaces used ONLY by the main process

**Location**: `main/interfaces/`

**Import Path**: Relative imports within main process

**Examples**:
- Lock controller interfaces
- Serial port configurations
- Database model interfaces
- IPC handler types

**Usage**:
```typescript
// Within main process
import { ILockController } from '../interfaces/lock-controller';
import { SlotState } from '../interfaces/slotState';
```

### 3. Renderer Process Interfaces (renderer/interfaces/)

**Purpose**: Types and interfaces used ONLY by the renderer process

**Location**: `renderer/interfaces/`

**Import Path**: Relative imports within renderer process

**Examples**:
- React component prop types
- UI state interfaces
- Form validation types
- Context provider types

**Usage**:
```typescript
// Within renderer process
import { AppProviderProps } from '../interfaces/appProviderProps';
import { AuthState } from '../interfaces/auth';
```

## Critical Rules

### ⚠️ NEVER Do This:

```typescript
// ❌ WRONG: Main process importing from renderer
// File: main/cu12/error-handler.ts
import { SomeInterface } from '../../renderer/lib/interfaces';

// ❌ WRONG: Renderer importing from main
// File: renderer/components/SomeComponent.tsx
import { DatabaseModel } from '../../main/interfaces/models';
```

**Why?**: 
- Webpack in main process cannot parse TypeScript files from renderer directory
- Creates circular dependencies
- Breaks build process
- Violates Electron security best practices

### ✅ Do This Instead:

```typescript
// ✅ CORRECT: Use shared types
// File: main/cu12/error-handler.ts
import { CU12ProtocolError } from '@shared/types';

// File: renderer/components/ErrorDisplay.tsx
import { CU12ProtocolError } from '@shared/types';
```

## Path Mappings

The following TypeScript path mappings are configured in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["shared/*"],
      "@shared/types": ["shared/types"]
    }
  }
}
```

## Adding New Interfaces

### When to Create a Shared Interface:

1. The type is used in IPC communication between main and renderer
2. The type represents data passed across process boundaries
3. Error types that both processes need to handle
4. Common constants or enums

### Steps to Create a Shared Interface:

1. Create the interface file in `shared/types/`
   ```typescript
   // shared/types/my-new-type.ts
   export interface MyNewType {
     // ... properties
   }
   ```

2. Export it from `shared/types/index.ts`
   ```typescript
   export * from './my-new-type';
   ```

3. Import using the path mapping
   ```typescript
   import { MyNewType } from '@shared/types';
   ```

### When to Create a Process-Specific Interface:

1. The type is only used within one process
2. The type contains process-specific APIs (e.g., Electron APIs, React types)
3. Internal implementation details

## Testing Import Resolution

After adding new interfaces, verify they can be imported correctly:

```bash
# TypeScript compilation check
npx tsc --noEmit

# Build check
npm run build
```

## Troubleshooting

### Error: "Module parse failed: Unexpected token"

**Cause**: Main process is trying to import TypeScript from renderer directory

**Solution**: Move the interface to `shared/types/` and use `@shared/types` import

### Error: "Cannot find module '@shared/types'"

**Cause**: Path mapping not configured correctly

**Solution**: 
1. Verify `tsconfig.json` has correct `baseUrl` and `paths`
2. Restart TypeScript server in your IDE
3. Clear build cache: `rm -rf .next/ app/ dist/`

### Error: "Circular dependency detected"

**Cause**: Interfaces are importing from each other incorrectly

**Solution**: 
1. Review import chains
2. Ensure shared types don't import from main or renderer
3. Use barrel exports (index.ts) to break circular dependencies

## Benefits of This Structure

✅ **Clean Separation**: Clear boundaries between process-specific and shared code
✅ **Build Safety**: Prevents webpack parse errors
✅ **Type Safety**: Full TypeScript support across processes
✅ **Maintainability**: Easy to understand where types should live
✅ **Scalability**: Simple to add new shared types as needed
✅ **IDE Support**: Path mappings work in modern IDEs

## Examples

### Example 1: CU12 Error Handling

**Shared Interface** (`shared/types/cu12-errors.ts`):
```typescript
export interface CU12ProtocolError {
  code: number;
  command?: number;
  message: string;
  address?: number;
  timestamp?: number;
}
```

**Main Process Usage** (`main/cu12/error-handler.ts`):
```typescript
import { CU12ProtocolError, CU12ErrorCode } from '@shared/types';

export class CU12ErrorHandler {
  handleError(error: CU12ProtocolError): void {
    // Handle error in main process
    console.error(`CU12 Error [${error.code}]: ${error.message}`);
  }
}
```

**Renderer Usage** (`renderer/components/ErrorDisplay.tsx`):
```typescript
import { CU12ProtocolError } from '@shared/types';

interface Props {
  error: CU12ProtocolError;
}

export const ErrorDisplay: React.FC<Props> = ({ error }) => {
  return (
    <div className="error">
      <h3>Error {error.code}</h3>
      <p>{error.message}</p>
    </div>
  );
};
```

### Example 2: IPC Data Transfer

**Shared Interface** (`shared/types/slot-data.ts`):
```typescript
export interface SlotUpdateData {
  slotId: number;
  status: 'locked' | 'unlocked' | 'occupied' | 'empty';
  timestamp: number;
}
```

**Main Process** sends via IPC:
```typescript
import { SlotUpdateData } from '@shared/types';

win.webContents.send('slot-update', {
  slotId: 1,
  status: 'unlocked',
  timestamp: Date.now()
} as SlotUpdateData);
```

**Renderer Process** receives via IPC:
```typescript
import { SlotUpdateData } from '@shared/types';

ipcRenderer.on('slot-update', (event, data: SlotUpdateData) => {
  // Use data with full type safety
  console.log(`Slot ${data.slotId} is now ${data.status}`);
});
```

## Maintenance

This structure should be maintained as the application grows:

1. **Review**: Periodically review interface locations
2. **Refactor**: Move interfaces to shared if they start being used cross-process
3. **Document**: Update this file when adding new categories or patterns
4. **Enforce**: Use linting rules or code review to enforce these patterns

---

**Last Updated**: 2025-10-23
**Maintained By**: Development Team
