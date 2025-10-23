# Shared Types Module

## Purpose

This directory contains TypeScript interfaces and types that are shared between the Electron main process and the Next.js renderer process.

## Why This Exists

In an Electron + Next.js application, the main process and renderer process run in separate contexts with different webpack configurations. The main process webpack cannot parse TypeScript files from the renderer directory, which would cause build errors like:

```
Error: Module parse failed: Unexpected token
You may need an appropriate loader to handle this file type
```

By creating a separate `shared/` directory with proper TypeScript path mappings, both processes can safely import common type definitions without causing build failures.

## Structure

```
shared/
  ├── types/          # Shared TypeScript interfaces and types
  │   ├── cu12-errors.ts    # CU12 protocol error definitions
  │   └── index.ts          # Barrel exports
  └── index.ts        # Main shared module export
```

## Usage

### Importing Shared Types

Both main and renderer processes can import using the `@shared/types` path alias:

```typescript
// In main process (main/some-file.ts)
import { CU12ErrorCode, CU12ProtocolError } from '@shared/types';

// In renderer process (renderer/components/SomeComponent.tsx)
import { CU12ErrorCode, CU12ProtocolError } from '@shared/types';
```

### Adding New Shared Types

1. Create a new file in `shared/types/`:
   ```typescript
   // shared/types/my-new-type.ts
   export interface MyNewType {
     id: number;
     name: string;
   }
   ```

2. Export it from `shared/types/index.ts`:
   ```typescript
   export type { MyNewType } from './my-new-type';
   ```

3. Use it in your code:
   ```typescript
   import { MyNewType } from '@shared/types';
   ```

## What Should Be Shared?

### ✅ Good Candidates for Shared Types:

- Error interfaces used by both processes
- Data structures passed via IPC (Inter-Process Communication)
- Common enums and constants
- Protocol definitions
- Configuration interfaces used by both processes

### ❌ Should NOT Be Shared:

- React component prop types (renderer-specific)
- Electron API types (main-specific)
- Database model implementations (main-specific)
- UI state interfaces (renderer-specific)

## Guidelines

1. **Keep it minimal**: Only share types that are truly used by both processes
2. **No dependencies**: Shared types should not import from main or renderer directories
3. **Pure types**: Avoid including implementation logic in shared types
4. **Document well**: Add JSDoc comments to explain complex types
5. **Use `export type`**: When re-exporting types, use `export type` for better tree-shaking

## Path Mapping Configuration

The `@shared/types` alias is configured in `tsconfig.json`:

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

## Related Documentation

- [Interface Organization Guide](../docs/INTERFACE_ORGANIZATION.md) - Comprehensive guide on organizing interfaces
- Main process interfaces: `main/interfaces/`
- Renderer process interfaces: `renderer/interfaces/`

## Troubleshooting

### TypeScript can't find `@shared/types`

1. Make sure `baseUrl` and `paths` are configured in `tsconfig.json`
2. Restart your IDE's TypeScript server
3. Clear build caches: `rm -rf .next/ app/ dist/`

### Build fails with "Module parse failed"

This usually means main process is trying to import from renderer. Move the type to `shared/types/` instead.

### Circular dependency errors

Ensure shared types don't import from main or renderer directories. Shared types should be completely independent.

---

**Created**: 2025-10-23
**Maintained by**: Development Team
