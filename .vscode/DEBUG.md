# Electron Debugging Guide

## Overview

Enhanced debugging configuration for Smart Medication Cart (SMC) Electron application to support CU12 hardware migration development.

## Debugging Configurations

### 1. Debug Main Process (Launch) ⭐ **Recommended for CU12 Development**
- **Purpose**: Direct launch of Electron main process with full debugging visibility
- **Use Case**: CU12 controller implementation, SerialPort debugging, IPC handler development
- **Features**:
  - Full stdout/stderr capture in integrated terminal
  - Source map support for TypeScript files
  - Environment variables set for development
  - Remote debugging port enabled for renderer process

### 2. Debug Main Process (Attach)
- **Purpose**: Attach to already running Electron process
- **Use Case**: When application is started externally
- **Port**: 9292 (Node.js inspector)

### 3. Debug Renderer Process
- **Purpose**: Debug frontend React components
- **Use Case**: UI development, React component debugging
- **Port**: 9222 (Chrome DevTools Protocol)

### 4. Debug Electron (All Processes) 🚀 **Full Stack Debugging**
- **Purpose**: Debug both main and renderer processes simultaneously
- **Use Case**: Complete end-to-end testing
- **Features**: Synchronized debugging with stop-all capability

## Quick Start for CU12 Development

1. **Open KU16 files**: Navigate to `main/ku16/index.ts`
2. **Set breakpoints**: Add breakpoints in SerialPort communication methods
3. **Start debugging**: Press F5 with "Debug Main Process (Launch)" selected
4. **Test SerialPort**: Use `sendUnlock()` method to test hardware communication
5. **Monitor output**: Check integrated terminal for real-time logs

## Debugging CU12 Implementation

When implementing CU12 controller, use this debugging workflow:

1. **Main Process Debugging**: Use "Debug Main Process (Launch)" for:
   - SerialPort communication issues
   - IPC handler debugging
   - CU12 packet parsing
   - Database operations

2. **Breakpoint Strategy**:
   - Set breakpoints in `main/ku16/index.ts` at:
     - `constructor()` - SerialPort initialization
     - `sendUnlock()` - Command sending
     - `receive()` - Data parsing
     - `receivedUnlockState()` - Response handling

3. **Console Output**: All console.log statements will appear in VS Code debug console

## Troubleshooting

### Issues:
- **Port already in use**: Check if another Electron instance is running
- **Breakpoints not hitting**: Verify source maps are working correctly
- **SerialPort errors**: Use debug console to see detailed error messages

### Solutions:
- Restart debugging session
- Check TypeScript compilation: `npx tsc --noEmit`
- Verify all dependencies are installed: `npm install`

## Hotkeys

- **F5**: Start debugging
- **Ctrl+F5**: Start without debugging
- **Shift+F5**: Stop debugging
- **F9**: Toggle breakpoint
- **F10**: Step over
- **F11**: Step into
- **Shift+F11**: Step out

## Next.js Renderer Debugging

For debugging React components in the renderer process:
1. Use "Debug Renderer Process" configuration
2. Set breakpoints in `.tsx` files
3. Use Chrome DevTools for advanced debugging

## Performance Monitoring

The debugging setup includes:
- Memory usage tracking
- CPU profiling
- Network request monitoring (for renderer process)
- SerialPort communication logging

This enhanced debugging setup ensures full visibility into both main and renderer processes during CU12 hardware migration development.