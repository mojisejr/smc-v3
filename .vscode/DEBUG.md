# CU12 Hardware Debugging Guide

## Overview

Enhanced debugging configuration for Smart Medication Cart (SMC) Electron application with comprehensive CU12 hardware debugging support for TASK-15-1 implementation.

## Debugging Configurations

### 1. Debug Main Process (Launch) ⭐ CU12 Hardware Debugging
- **Purpose**: Primary configuration for CU12 hardware development and debugging
- **Use Case**: CU12 controller implementation, SerialPort debugging, IPC handler development
- **Features**:
  - Full stdout/stderr capture in integrated terminal
  - Source map support for TypeScript files
  - Environment variables: `NODE_ENV=development`, `DEBUG_CU12=true`
  - Remote debugging port enabled for renderer process
  - Enhanced logging for CU12 packet communication
  - Real-time console output monitoring

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
- **Use Case**: Complete end-to-end testing with CU12 hardware
- **Features**: Synchronized debugging with stop-all capability

### 5. Debug CU12 Hardware Only ⚡ **Hardware-Focused Debugging**
- **Purpose**: Fast debugging of main process only for CU12 hardware
- **Use Case**: Hardware communication testing without UI debugging
- **Features**: Focused on SerialPort and CU12 packet debugging

## Quick Start for CU12 Development

1. **Open CU12 files**: Navigate to `main/cu12/index.ts`
2. **Set breakpoints**: Add breakpoints in CU12 communication methods:
   - `CU12Controller` constructor (line ~54) - SerialPort initialization
   - `sendUnlock()` method (line ~150) - Command sending
   - `parser.on("data")` handler (line ~380) - Packet reception
3. **Start debugging**: Press F5 with "**Debug Main Process (Launch) ⭐ CU12 Hardware Debugging**" selected
4. **Test CU12**: Use unlock operations to test hardware communication
5. **Monitor output**: Check VS Code debug console for detailed CU12 logging

## Recommended Breakpoint Locations for CU12

### In `main/cu12/index.ts` (CU12Controller):
- **Line ~54**: SerialPort connection callback - Check connection errors
- **Line ~150**: `sendUnlock()` method - Verify slot mapping and packet construction
- **Line ~380**: Packet receiver - Monitor all incoming CU12 packets
- **Line ~200**: `receivedUnlockState()` - Handle unlock responses

### In `main/cu12/utils/packet-utils.ts`:
- **Line ~20**: `createPacket()` - Verify CU12 packet format
- **Line ~35**: `parseResponse()` - Check packet validation

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