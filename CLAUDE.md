## Project Overview

**Project Name**: Smart Medication Cart (SMC)

**Repository**: Private / TBD

**Description**: Desktop application for medication cart management and dispensing. Built with Electron + Next.js (Nextron). Integrates with KU16 hardware via SerialPort, supports MQTT messaging, persists data in SQLite using Sequelize, and provides a Tailwind + DaisyUI UI.

**Project Goals**:

- Provide a reliable medication dispensing workflow integrated with KU16 hardware
- Maintain local-first, resilient data storage via SQLite
- Offer clear management pages for slots, settings, and logs
- Ensure secure IPC boundaries and predictable builds for Windows/Linux

---

### Development Guidelines

**⚠️ CRITICAL: Synchronize Time Before Any File Operations**

Before creating a new file or saving any timestamps, you **MUST** retrieve the current date and time from the system.

Windows PowerShell:

```
Get-Date -Format "yyyy-MM-dd HH:mm:ss"
```

#### File Naming Conventions

- **Log Files**: `YYYY-MM-DD-[type].log`
- **Backup Files**: `backup-YYYY-MM-DD-HHMM.sqlite`
- **Migration Files**: follow Sequelize naming conventions if using `sequelize-cli`

#### Important Notes

- **ALL timestamps** in documentation, logs, and file names must use your local timezone
- **Year format** must be consistent
- **Development sessions** should reference local time

---

## Architecture Overview

### Core Structure

- **Framework**: Next.js 12 (Pages Router) via Nextron
- **Frontend/Framework**: React 18 with TypeScript
- **Application Shell**: Electron (main process + preload, renderer in Next)
- **Interprocess**: Secure IPC via `contextIsolation` + `contextBridge`
- **Database**: SQLite with Sequelize ORM
- **Styling**: Tailwind CSS with DaisyUI
- **Messaging/Hardware**: MQTT client, SerialPort for KU16

### Tech Stack

- **Frontend**: Next.js 12, React 18, TypeScript, Tailwind CSS, DaisyUI, Framer Motion
- **Backend**: Electron main process, IPC bridge via preload
- **Database**: SQLite3 with Sequelize
- **Messaging**: MQTT for device/indicator integration
- **Hardware**: SerialPort for KU16 dispenser control
- **State/Form**: React Hook Form; Notifications via React Toastify

### Database Schema

#### Core Models (indicative; adjust to actual `db/models`)

- **User**: basic operator/admin metadata (name, email, role)
- **Setting**: global configuration (com ports, MQTT broker, device params)
- **Slot**: dispenser slots with code, capacity, thresholds, status
- **DispensingLog**: per-dispense records (slotId, quantity, timestamp, outcome)
- **Log**: general system events and error audit trail

### Frontend User Journeys

- **Dispensing Flow**: Select patient/slot → Confirm quantity → Execute hardware → Log result
- **Slot Management**: View slots → Edit capacity/thresholds → Assign mappings → Save
- **Settings Flow**: Configure ports, MQTT broker, app preferences → Test connections → Save
- **Logs & Monitoring**: Filter logs → Inspect errors → Export/backup

---

## 🗄️ Database Architecture

### SQLite with Sequelize ORM

#### Key Features

- **Type-safe Database Access**: Sequelize models (TypeScript typings)
- **Database Migrations**: Supported via code or `sequelize-cli` if introduced
- **Data Validation**: Model-level constraints and checks
- **Local-First Storage**: `resources/db/database.db` bundled at build time

#### Database Models Structure

```
// Operations & configuration
Setting (singleton/global)

// Dispenser management
Slot -> DispensingLog (One-to-Many)

// User oversight
User -> DispensingLog (Optional Many-to-Many via actor or recorded by userId)

// System logging
Log (independent; may reference slotId/userId)
```

---

## 📁 File Storage System

### Local-First Storage Model

- Primary database lives under `db/database.db` (bundled with app)
- Runtime database path resolved to app data directory on first run
- Backups stored under `backups/` with timestamped filenames
- Logs stored under `logs/` with rotation policy

### Backup & Restore Policy

- Automated backups on schema changes and before migrations
- Manual backup via app Settings → Database section
- Restore flow validates schema compatibility and integrity before replace

### Resource Packaging

- `electron-builder.yml` includes SQLite file under `extraResources`
- On install, DB is copied from `resources/db/database.db` → `db/database.db`

---

## UI/UX Design System

### Tailwind CSS + DaisyUI

- Use Tailwind utility classes for spacing, color, typography
- DaisyUI component primitives for consistent UI patterns
- Theme tokens centralized to ensure design consistency

### Form & Feedback Patterns

- Forms via `react-hook-form` with schema-backed validation
- Toasts via `react-toastify` for success/error notifications
- Clear error states and accessible focus management

### Visual Design Validation Requirements

Pre-Implementation Design Checklist:

- Verify layout grid and spacing scale alignment
- Confirm color tokens and contrast accessibility
- Validate component states (hover, focus, disabled, error)
- Ensure responsive behavior on target screen sizes

### Design Quality Assurance Process

3-Phase Approach:

- Define: Wireframe key screens and flows before coding
- Implement: Build components adhering to tokens and patterns
- Validate: Review visual and interaction quality in a design pass

### Centralized Styling Architecture

- Maintain shared tokens and utility classes in a single config
- Prefer composition over ad hoc inline styles
- Document reusable component patterns

### Design Review Integration

Visual Review Steps:

- Run through primary flows with real data
- Check edge cases and error surfaces
- Capture screenshots for regression comparison

Common Pitfalls:

- Inconsistent spacing and typography across components
- Unvalidated states leading to visual regressions
- Accessibility gaps (focus, keyboard navigation)

---

## Development Commands

### Core Development

- `npm install`: Install dependencies
- `npm run dev`: Nextron dev server (Next.js + Electron)
- `npm run build`: Package Electron app for the current OS
- `npm run build:linux`: Build AppImage for Linux (`arm64`, `armv7l`)
- `npm run build:win63`: Build Windows x64 (Windows 10/11)
- `npm run postinstall`: Install Electron/SQLite deps and prepare resources

### Database Management

- Migrations via Sequelize scripts or manual migration files
- Automated backups before migrations; manual backup via Settings
- Integrity check and vacuum via maintenance utilities

### Sanity CMS

- Not applicable in SMC; no CMS integration required

Access:

- Development build opens automatically; Electron app launches renderer
- Production build produces installers in `dist/`

---

## Development Workflow

### Shortcut Commands (Agent-Driven Workflow)

- Build validate: `npm run build && npx tsc --noEmit`
- Open logs directory
- Backup database immediately
- Toggle hardware simulation mode

### GitHub Context Tracking Features

- Link issues across PRs and commits
- Automated branch naming aligned with issues
- Iteration tracking via session retrospectives

### Workflow Features

- GitHub Context + Task Issue Pattern
- Automated Branch Management: feature branches created from staging
- Iteration Tracking: progress visibility via TodoWrite
- Staging-First Deployment: features validated in staging before main

### Git Workflow

- **Main Branch**: production-ready code
- **Staging Branch**: pre-production validation
- **Feature Branches**: `feature/[issue-number]-[description]`
- **Development**: work on feature branches; PRs → staging → main

### Code Quality

- **TypeScript**: ensure types across Electron/renderer boundaries
- **Optional ESLint/Prettier**: recommended; if configured, run in CI
- **Security linting** for preload bridge (no direct `ipcRenderer` exposure)

---

## ⚠️ CRITICAL SAFETY RULES

### NEVER MERGE PRS YOURSELF

**DO NOT** use commands to merge Pull Requests. Create well-documented PRs and provide the link to the user or await explicit instruction.

### DO NOT DELETE CRITICAL FILES

You are **FORBIDDEN** from deleting or moving critical files and directories: `.env`, `.git/`, `node_modules/`, `package.json`, `electron-builder.yml`, and core project files.

### HANDLE SENSITIVE DATA WITH CARE

You must **NEVER** include sensitive information such as API keys, passwords, device credentials, or user data in any commit messages, Pull Request descriptions, or public logs. Always use environment variables for sensitive data.

**Critical Environment Variables**:

- Serial/MQTT credentials, any device tokens
- Any other API keys and secrets

### STICK TO THE SCOPE

You are instructed to focus **ONLY** on the assigned task. Do not perform refactoring or new feature development unless explicitly part of the plan.

### BRANCH SAFETY

- Synchronize local branch with remote before implementation
- Work exclusively on feature branches; **NEVER** commit directly to `main`
- Avoid force pushes; prefer `--force-with-lease` only if absolutely required

### AUTOMATED WORKFLOW SAFETY

- **BRANCH NAMING ENFORCEMENT**: `feature/[issue-number]-[description]`
- **COMMIT MESSAGE STANDARDS**: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`; reference issues
- **CRITICAL RULES**: Build/validate before asking for review

---

## 🌿 Enhanced Workflow Implementation

### Multi-Phase Implementation Strategy

**Proven 5-Phase Approach**:

1. **Analysis & Preparation**: component and dependency mapping
2. **Core Implementation**: primary changes and IPC/API updates
3. **Integration & Testing**: build validation and hardware simulation
4. **Documentation & Cleanup**: commits and documentation
5. **Review & Validation**: final validation

### TodoWrite Integration Patterns

**High-Impact Usage**: Complex refactoring (3+ files), system changes, hardware integrations

**Workflow Pattern**:

1. Break into manageable todos
2. Mark exactly ONE todo in_progress → completed
3. Provide real-time visibility and accountability across sessions

### Branch Management Excellence

- **ALWAYS** create feature branches
- **NEVER** work directly on main branch
- **Workflow**: Analysis → Branch → Implementation → Build → Commit → PR → Review

---

## 🔧 Key Features Implementation

### Medication Dispensing System

- **Guided workflow** to select slot and quantity
- **Hardware control** via SerialPort with robust retry and error feedback
- **Logging** of outcomes with timestamps and operator reference

### Slot Management

- **Define slot codes, capacity, thresholds**
- **Assign mappings** to physical KU16 channels
- **Status monitoring** and manual overrides

### Settings & Configuration

- **Configure serial port, MQTT broker, app preferences**
- **Test connection utilities** (probe KU16, test MQTT publish/subscribe)
- **Persist** via `Setting` model (singleton or versioned)

### User & Audit

- **Basic operator metadata**
- **Comprehensive audit** via `Log` + `DispensingLog`

---

## 📊 Data Models

### Operational Entities

- **Slot**: `{ id, code, capacity, threshold, status, channel }`
- **DispensingLog**: `{ id, slotId, quantity, at, outcome, actorId? }`
- **Setting**: `{ id, serialPort, baudRate, mqttUrl, deviceConfig }`
- **User**: `{ id, name, email, role }`
- **Log**: `{ id, level, message, context, createdAt }`

---

## 🚀 Deployment Architecture

### Electron/Nextron Deployment

- **Renderer**: Next.js pages served within Electron shell
- **Main/Preload**: IPC bridge with `contextIsolation: true`; use `contextBridge.exposeInMainWorld`
- **Packaging**: Electron Builder configured via `electron-builder.yml`
- **Extra Resources**: SQLite DB included from `resources/db/database.db` → `db/database.db`
- **Targets**: Windows x64 (`build:win63`), Linux AppImage (`build:linux` with `arm64`, `armv7l`)

### Build Validation Checkpoints

1. **Build**: `npm run build`
2. **Type Check**: `npx tsc --noEmit`

---

## 📈 Performance Optimization

### Frontend Optimizations

- Virtualize long lists (logs) in renderer
- Code splitting and bundle awareness (Next.js)
- Animation performance; respect reduced motion
- Avoid heavy work in renderer

### Backend Optimizations

- IPC batching for high-frequency device events
- Hardware command debouncing and exponential backoff
- Move heavy operations to main process
- Efficient logging with minimal blocking I/O

---

## ⚡ Efficiency Patterns & Performance Optimization

### Build Validation Checkpoints

- Schema changes: `npm run build && npx tsc --noEmit`
- IPC modifications: rebuild and runtime sanity checks
- Large refactoring: validate typings and renderer mount

### High-Impact Optimization Areas

- Database access patterns and indexing where applicable
- IPC payload size and frequency management
- Renderer performance (list virtualization, memoization)

### Efficiency Factor Analysis

- Track measured improvements across builds and sessions
- Document before/after metrics in retrospectives

---

## 🛡️ Security Considerations

### Electron Security

- `contextIsolation: true` and `sandbox` as applicable
- Use preload to expose a minimal API surface via `contextBridge`
- **Never expose** `ipcRenderer` directly to the window context

### Input & IPC Validation

- Validate all IPC payloads (types, ranges)
- Whitelist channels; reject unknown commands
- Sanitize error messages and logs

### Data Protection

- Sensitive values via environment/config, not hardcoded
- Log sanitization to avoid leaking device credentials

---

## 🛡️ Security Implementation Methodology

### 8-Phase Security Audit Process

- Asset Inventory: identify IPC channels, preload APIs, stored data
- Threat Modeling: map surfaces for renderer, main, and hardware
- Policy Definition: channel whitelisting, payload schemas, error handling
- Hardening: `contextIsolation`, minimal `contextBridge` surface, sanitize logs
- Validation: schema validation on IPC, input sanitization, bounds checks
- Secrets Management: environment variables for credentials; no hardcoding
- Testing: fuzz IPC payloads; simulate error conditions; audit logging
- Review: periodic audits; update rules when new integrations are added

### Enterprise-Grade Security Measures

- Strict channel whitelisting and payload validators for IPC
- Principle of least privilege in preload-exposed APIs
- Rate control and debouncing for hardware commands to prevent abuse
- Redaction rules for logs and error surfaces
- Secure backup handling; verify integrity before restore

---

## 🔍 Monitoring & Debugging

### Error Handling

- **Renderer error boundaries**
- **Centralized IPC error translation** to user-friendly messages
- **Structured logging** (level, context, timestamp)

### Development Tools

- **React DevTools**; Network/Console
- **SQLite Browser** for DB inspection
- **Serial Port monitor; MQTT client** for testing

---

## 📝 Documentation Standards

### Code Documentation

- **TypeScript JSDoc** for functions and IPC contracts
- **Model docs** reflecting DB fields and relationships

### Project Documentation

- **README**: setup, architecture, commands
- **CHANGELOG**: notable changes
- **CONTRIBUTING**: guidelines for contributors
- **DEPLOYMENT**: packaging and distribution instructions

---

## 📈 Retrospective Workflow

When you create retrospective files, include the following sections and details:

### Retrospective Structure

**Required Sections**:

- **Session Details**: Date (YYYY-MM-DD local timezone), Duration, Focus, Issue/PR references
- **Session Summary**: Overall work accomplished
- **Timeline**: Key events with local timestamps
- **📝 AI Diary** (MANDATORY): First-person reflection on approach and decisions
- **💭 Honest Feedback** (MANDATORY): Performance assessment and improvement suggestions
- **What Went Well**: Successes achieved
- **What Could Improve**: Areas for enhancement
- **Blockers & Resolutions**: Obstacles and solutions
- **Lessons Learned**: Patterns, mistakes, and discoveries

**File Naming**: `session-YYYY-MM-DD-[description].md` with local date

---

## 📚 Best Practices from Retrospectives

### TodoWrite Integration Best Practices

**Results**: Faster implementations vs. ad hoc sessions

**When to Use**: Complex multi-step tasks (3+ phases), multi-component refactoring, full-stack changes, hardware integrations, database migrations

**Workflow Pattern**:

1. Break into manageable todos
2. Mark exactly ONE todo in_progress → completed
3. Provide real-time visibility and accountability

### Pattern Replication Strategy

#### Reference Implementation Approach

1. **Document Successful Patterns**: Create detailed retrospectives for reusable approaches
2. **Systematic Replication**: Use previous session files as implementation guides
3. **Adapt, Don't Recreate**: Modify proven patterns for new contexts
4. **Measure Efficiency**: Track implementation time improvements

### Build Validation Checkpoints

#### Critical Validation Points

- **Schema Changes**: `npm run build && npx tsc --noEmit`
- **IPC Modifications**: `npm run build` and runtime sanity checks
- **Large Refactoring**: validate typings and renderer mount

#### Proactive Testing Strategy

- **Incremental Builds**: Test builds after each major change, not just at the end
- **TypeScript Validation**: Run `npx tsc --noEmit` for pure type checking
- **Dependency Verification**: Check imports and exports after file restructuring

### Schema Investigation Protocol

#### Before Implementation Checklist

1. **Verify Sequelize Models**: Always check actual model definitions under `db/models`
2. **Trace Data Structures**: Follow interface definitions across IPC → renderer → models
3. **Validate Field Names**: Don't assume field naming conventions
4. **Check Relationships**: Understand model relationships before querying

#### Common Schema Pitfalls

- **Assumption Errors**: About field names/structures
- **Interface Misalignment**: Frontend interfaces not matching Sequelize models
- **Relationship Complexity**: Not understanding foreign key relationships
- **Type Mismatches**: TypeScript interfaces not reflecting actual data structures

### Database Best Practices

#### SQLite Autoincrement Notes

- **AUTOINCREMENT**: SQLite manages `sqlite_sequence`; avoid manual resets
- **Recovery**: Use vacuum and integrity checks when needed; prefer migration scripts

### Documentation Standards

#### PR Description Requirements

- **Implementation Summary**
- **Technical Details**
- **Before/After Analysis**
- **Testing Validation**
- **Iteration Note Summary**

#### Retrospective Documentation

- **AI Diary**: First-person reflection on approach and decision-making
- **Honest Feedback**: Efficiency and quality assessment
- **Pattern Recognition**: Reusable patterns and approaches
- **Lessons Learned**: Specific insights for future implementation improvement
