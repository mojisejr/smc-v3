## Project Overview

**Project Name**: Smart Medication Cart Version 1.0 (SMC)

**Repository**: https://github.com/mojisejr/smc-v3
**Author**: Nonthasak.l <nonthasak.l@gmail.com>

**Description**: Smart Medication Cart desktop application for healthcare medication management with Electron + Next.js architecture

---

## ⚠️ CRITICAL SAFETY RULES

### 🚨 FORBIDDEN ACTIONS (NEVER ALLOWED)

- ❌ **NEVER merge PRs yourself** - Provide PR link and wait for user instructions
- ❌ **NEVER work on main/staging branches** - Always use feature branches
- ❌ **NEVER delete critical files** (.env, .git/, node_modules/, package.json, lib/database/)
- ❌ **NEVER commit sensitive data** (API keys, passwords, secrets) - Use environment variables
- ❌ **NEVER skip 100% validation** (build, lint, test) - Must pass completely
- ❌ **NEVER use git push --force** - Only use --force-with-lease when absolutely necessary
- ❌ **NEVER implement without task issue** - Must use =plan command first

### 📋 MANDATORY WORKFLOW RULES

- ✅ **ALWAYS** sync main branch before any implementation: `git checkout main && git pull origin main`
- ✅ **ALWAYS** verify task issue exists: `[TASK-XXX-X]` before `=impl`
- ✅ **ALWAYS** use feature branch naming: `feature/task-[number]-[description]`
- ✅ **ALWAYS** ensure 100% build success before commit: `npm run build`
- ✅ **ALWAYS** ensure 100% lint pass before commit: `npm run lint`
- ✅ **ALWAYS** use template-guided workflow with proper context validation
- ✅ **ALWAYS** test desktop app functionality before deployment

---

## 📋 Workflow System

### Template Integration

**Context Issue Template** - `/docs/ISSUE-TEMP.md`:

- Used for: `=fcs > [topic-name]` or `=fcs > [ISSUE-XXX]`
- Creates living document for iterative discussion
- Contains: DISCUSSION LOG, ACCUMULATED CONTEXT, PLANNING READINESS CHECKLIST

**Task Issue Template** - `/docs/TASK-ISSUE-TEMP.md`:

- Used for: `=plan > [task description]`
- Creates atomic tasks based on current mode (MANUAL/COPILOT)
- Contains: EXECUTION MODE field, 100% validation requirements

### Mode-Based Execution System

**Default Mode**: MANUAL (human implementation)

**Mode Commands**:

```bash
=mode manual     # Tasks assigned to human developer
=mode copilot     # Tasks assigned to @copilot
=mode status      # Show current execution mode
```

**Mode-Specific Behavior**:

- **MANUAL Mode**: `=plan` creates tasks assigned to human, `=impl` waits for human implementation
- **COPILOT Mode**: `=plan` creates tasks assigned to @copilot, `=impl` triggers copilot implementation

### Core Commands

```bash
# Context Management
=fcs > [topic-name]           # Create new Context Issue using /docs/ISSUE-TEMP.md
=fcs > [ISSUE-XXX]            # Update existing Context Issue using /docs/ISSUE-TEMP.md
=fcs list                     # Show all active Context Issues

# Task Management
=plan > [task description]      # Create Task Issue using /docs/TASK-ISSUE-TEMP.md (assigned by current mode)
=impl > [task-number]          # Implementation workflow (triggers based on current mode)
=pr > [feedback]               # Create Pull Request from pushed feature branch

# Other Commands
=rrr > [message]              # Create daily retrospective file and Issue
```

### Template-Driven Workflow Process

1. **Phase 1**: `=fcs > [topic]` → Create initial context issue
2. **Phase 2**: `=fcs > [ISSUE-XXX]` → Update context iteratively
3. **Phase 3**: Context reaches `[Ready for Planning]` status → Ready for planning
4. **Phase 4**: `=plan > [task]` → Create atomic tasks
5. **Phase 5**: `=impl > [task-number]` → Implement based on mode

### Implementation Workflow (MANDATORY)

**Pre-Implementation Checklist**:

1. **Staging Sync**: `git checkout staging && git pull origin staging`
2. **Task Verification**: Confirm Task Issue `[TASK-XXX-X]` exists and is linked to Context Issue
3. **Context Status**: Verify Context Issue is `[Ready for Planning]` or `[Implementation Ready]`
4. **Environment Check**: `git status` - working directory must be clean

**Implementation Steps**:

1. **Create Feature Branch**: `git checkout -b feature/task-[number]-[description]`
2. **Execute Implementation**: Follow task requirements, use TodoWrite for complex tasks
3. **Quality Validation**: `npm run build` (100% pass) + `npm run lint` (100% pass) + `npx tsc --noEmit`
4. **Commit Changes**:

   ```bash
   git add .
   git commit -m "feat: [feature description]

   - Address TASK-XXX-X: [task title]
   - Build validation: 100% PASS
   - Linter validation: 100% PASS

   🤖 Generated with Claude Code
   Co-Authored-By: Claude <noreply@anthropic.com>"
   ```

5. **Push Branch**: `git push -u origin feature/task-[number]-[description]`

**Post-Implementation**:

- **MANUAL Mode**: User commits and pushes, then uses `=pr` to create PR
- **COPILOT Mode**: Agent handles complete implementation including PR creation via `=pr`

---

## 🏗️ Technical Architecture

### Core Stack

- **Framework**: Next.js 12.3.4 + Electron 21.3.3 (Nextron 8.5.0)
- **Frontend**: React 18 + TypeScript + Tailwind CSS + DaisyUI
- **Desktop**: Electron with main process and renderer process
- **Database**: SQLite3 with Sequelize ORM
- **Communication**: SerialPort + MQTT for device communication
- **State Management**: React Context API
- **Build Tool**: Electron Builder

### Project Structure

```bash
smc-app/
├── app/                    # Electron main process
│   └── background.js       # Main Electron process entry point
├── renderer/              # Next.js frontend (Electron renderer)
│   ├── pages/             # Next.js pages routing
│   ├── components/        # React components
│   ├── contexts/          # React contexts for state management
│   ├── hooks/             # Custom React hooks
│   ├── styles/            # Global styles and Tailwind config
│   └── interfaces/        # TypeScript interfaces
├── main/                  # Backend business logic
│   ├── auth/              # Authentication system
│   ├── ku16/              # KU16 device integration
│   ├── setting/           # Settings management
│   ├── indicator/         # Indicator device handling
│   ├── logger/            # Logging system
│   └── user/              # User management
├── db/                    # Database models and setup
│   ├── sequelize.ts       # Sequelize configuration
│   └── model/             # Database models
├── resources/             # Static resources and database
└── scripts/               # Utility scripts
```

### Database Schema

```typescript
// Core Models for medication management
users: {
  id, name, role, passkey
}

slots: {
  slotId, hn (hospital number), timestamp, occupied, opening, isActive
}

dispensing_logs: {
  id, userId, slotId, timestamp, hn_data
}

settings: {
  id, ku16_port, ku16_baudrate, org_info, service_codes, activation_key
}

logs: {
  id, timestamp, level, message, source
}
```

### Key Features

- **Medication Slot Management**: 15 medication slots with visual indicators
- **Device Integration**: KU16 device communication via SerialPort
- **Environmental Monitoring**: Temperature, humidity, battery monitoring
- **User Authentication**: Role-based access control with service codes
- **Dispensing System**: Controlled medication dispensing with audit trails
- **Settings Management**: Device configuration and organization settings
- **Real-time Communication**: MQTT support for live updates
- **Comprehensive Logging**: Error handling and activity tracking

### Development Commands

```bash
npm run dev              # Development server (Electron + Next.js)
npm run build            # Production build (must 100% pass)
npm run build:linux      # Build for Linux
npm run build:win63      # Build for Windows x64
npm run lint             # Lint code (must 100% pass)
```

### Environment Variables (Critical - Never Commit)

- Database configuration for SQLite
- Serial port configurations
- MQTT broker settings
- Device authentication keys
- Any API keys and secrets

---

## 🎯 Quality Standards

### Code Quality Requirements

- **TypeScript**: Strict mode enabled
- **ESLint**: Zero violations allowed
- **Prettier**: Consistent formatting
- **Build**: 100% success rate (zero errors/warnings)
- **Tests**: 100% pass rate when implemented

### UI/UX Requirements

- **Desktop-First**: Electron desktop application optimization
- **Accessibility**: WCAG 2.1 AA compliance (4.5:1 contrast)
- **Clear Visual Indicators**: Medication slot status and device states
- **Performance**: Fast startup and responsive UI for healthcare environment
- **Error Prevention**: Clear feedback and validation for medication safety

### Template-Guided Quality

- **Context Issues**: Complete PLANNING READINESS CHECKLIST ✅
- **Task Issues**: 100% build/lint/test requirements mandatory
- **Mode Execution**: Follow mode-specific behavior exactly
- **Template Consistency**: All issues follow template structures

---

## 📚 Reference Materials

### Templates

- `/docs/ISSUE-TEMP.md` - Context Issue Template for iterative discussions
- `/docs/TASK-ISSUE-TEMP.md` - Atomic Task Template for implementation

### Performance Metrics

- **Target**: Desktop app startup within ≤5 seconds
- **Goal**: 99.9% uptime for medication dispensing operations
- **Reliability**: 99.99% accurate medication slot tracking
- **Database**: Support local SQLite operations with minimal latency

### Security Notes

- **Input Validation**: Comprehensive validation for all user inputs
- **Authentication**: Role-based access control with passkey system
- **Data Protection**: Local SQLite database with secure storage
- **Access Control**: Role-based permissions (Admin, Pharmacist, Nurse)
- **Device Security**: Secure serial communication with medical devices
- **Audit Trail**: Complete dispensing logs for compliance

---

_This document focuses on agent-critical information for efficient workflow execution and safe development practices._
