## Project Overview

**Project Name**: Smart Medication Cart (SMC)

**Repository**: https://github.com/mojisejr/smc-v3

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

These commands streamline development with GitHub-based context tracking:

- **`=fcs > [topic-name]`**: Creates new GitHub issue `[XXXX] [topic-name]` for context tracking
- **`=fcs > [XXXX]`**: Updates existing context issue by number
- **`=fcs list`**: Shows all active context issues
- **`=fcs recent`**: Shows recent context issues
- **`=plan > [question/problem]`**: Creates/Updates GitHub Task Issue with detailed action plan
- **`=impl > [message]`**: Iterative implementation workflow (creates feature branch, executes from GitHub issue)
- **`=pr > [feedback]`**: Pull request and integration workflow
- **`=stage > [message]`**: Staging deployment workflow
- **`=prod > [message]`**: Production deployment workflow
- **`=rrr > [message]`**: Creates daily retrospective file and GitHub Issue

**Local Development Commands**:
- Build validate: `npm run build && npx tsc --noEmit`
- Open logs directory
- Backup database immediately
- Toggle hardware simulation mode

### GitHub Context Tracking Features

- **Pure GitHub Storage**: No local context files needed
- **Issue Naming**: `[XXXX] [topic-name]` format for easy identification
- **Stateless**: Works from any machine with GitHub access
- **Collaborative**: Team members can view and contribute to context
- **Searchable**: Full GitHub search capabilities for context history

### Workflow Features

- **GitHub Context + Task Issue Pattern**: All context lives in GitHub issues
- **Automated Branch Management**: Feature branches created from staging
- **Iteration Tracking**: Progress tracking with TodoWrite integration
- **Staging-First Deployment**: All features go through staging before production

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

**MANDATORY STAGING BRANCH SYNC**: Before any implementation (`=impl`), you **MUST** ensure the local staging branch is synchronized with remote origin.

**STAGING-FIRST WORKFLOW**: All implementations work exclusively with staging branch. **NEVER** create PRs to main branch during implementation.

**FORCE PUSH RESTRICTIONS**: Only use `git push --force-with-lease` when absolutely necessary. **NEVER** use `git push --force`.

**HIGH-RISK FILE COORDINATION**: Files requiring team coordination include:

- `src/app/page.tsx`, `src/app/layout.tsx` (main app structure)
- `package.json`, `yarn.lock` (dependency management)
- `prisma/schema.prisma` (database schema)
- `.env.example`, configuration files

### AUTOMATED WORKFLOW SAFETY

**BRANCH NAMING ENFORCEMENT**: All feature branches **MUST** follow the pattern `feature/[issue-number]-[description]`.

**COMMIT MESSAGE STANDARDS**: All commits **MUST** include:

- Clear, descriptive subject line (max 50 characters)
- Reference to related issue number
- Type prefix: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`

**CRITICAL RULES**:

- **NEVER** work directly on main/staging branches
- **ALWAYS** create feature branches from staging
- **ALWAYS** deploy to staging before production

---

## 🌿 Enhanced Workflow Implementation

### Multi-Phase Implementation Strategy

**Proven 5-Phase Approach** (15-34 minute sessions):

1. **Analysis & Preparation** (5-8 min): Component analysis, dependency mapping
2. **Core Implementation** (8-15 min): Primary changes, API updates
3. **Integration & Testing** (3-8 min): Build validation, error resolution
4. **Documentation & Cleanup** (2-5 min): Commits, documentation
5. **Review & Validation** (1-2 min): Final validation

### TodoWrite Integration Patterns

**High-Impact Usage**: Complex refactoring (3+ files), multi-phase implementations, large system changes

**Workflow Pattern**:

1. Break into 5-12 manageable todos
2. Mark exactly ONE todo in_progress → completed
3. Provides real-time visibility and accountability
4. Enables accurate time estimation

**High-Impact TodoWrite Usage Patterns**:
✅ Complex multi-component refactoring (3+ files)
✅ Full-stack implementations (API + Frontend)
✅ Multi-phase system changes (Database + Application)
✅ Large refactoring with dependency management

### Branch Management Excellence

- **ALWAYS** create feature branches: `feature/[issue-number]-[description]`
- **NEVER** work directly on main branch
- **Workflow**: Analysis → Branch → Implementation → Build → Commit → PR → Updates

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

### 15-Minute Implementation Strategy

**Results**: 15-minute implementations vs 34+ minute baseline

**Prerequisites**: Reference pattern, TodoWrite initialized, component structure analyzed, integration points identified

**Speed Optimization Techniques**:

1. **Pattern Recognition**: 56% faster when following proven patterns
2. **MultiEdit**: Batch multiple edits instead of sequential single edits
3. **Systematic Analysis**: 2-3 minute analysis of target areas and integration points
4. **Build Validation**: `npm run build` after major changes, `npx tsc --noEmit` for type checking

### High-Impact Optimization Areas

#### TodoWrite Integration ROI

- **Setup Time**: 2-3 minutes
- **Visibility Benefit**: Real-time progress tracking
- **Accountability**: Prevents skipping critical steps
- **Stakeholder Communication**: Clear progress indicators
- **Proven Results**: 56% faster implementations documented

#### Reference Pattern Utilization

- **Pattern Documentation**: Create detailed retrospectives for reusable approaches
- **Pattern Library**: Maintain reference files as implementation guides
- **Systematic Replication**: Follow proven approaches exactly
- **Context Adaptation**: Modify only necessary elements

#### Tool Optimization

- **Efficient Pattern**: Read (targeted) → MultiEdit (batch) → Build (validation)
- **Avoid**: Multiple single Edits → Multiple Reads → Late build testing

### Efficiency Factor Analysis

**High Efficiency Sessions** (15-20 minutes):

- ✅ TodoWrite usage for progress tracking
- ✅ Reference pattern available
- ✅ Clear component structure understanding
- ✅ Systematic 5-phase approach
- ✅ Proactive build validation

**Low Efficiency Sessions** (45+ minutes):

- ❌ No reference pattern
- ❌ Schema assumptions without verification
- ❌ Working directly on main branch
- ❌ Build testing only at end
- ❌ Complex dependency analysis needed

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

### Systematic Security Audit Approach

**8-Phase Security Audit Process** (31-minute comprehensive audits):

1. **Infrastructure Analysis** (2-3 min): Environment variables, database schema, authentication
2. **Core Endpoint Analysis** (5-8 min): Input validation, rate limiting, error handling, authorization
3. **Data Integrity Analysis** (3-5 min): Transaction security, data flow assessment, logging
4. **Compliance Assessment** (3-5 min): Industry standards and regulations
5. **Vulnerability Testing** (5-8 min): Injection prevention, authentication bypass, authorization
6. **Security Implementation** (8-12 min): Rate limiting, input validation, error hardening
7. **Build Validation** (2-3 min): TypeScript compilation, dependency validation
8. **Documentation & Reporting** (3-5 min): Security audit report, compliance metrics

### Enterprise-Grade Security Measures

#### Critical Security Implementations

- **Rate Limiting**: 15-minute windows, configurable limits per endpoint
- **Input Validation**: Comprehensive schemas for all API endpoints
- **Secure Error Handling**: Generic error responses prevent information disclosure
- **File Upload Security**: Type validation, size limits, and secure storage

### Security Best Practices

**Key Security Areas**:

- **Webhook Security**: Validate signatures, prevent replay attacks, never log secrets
- **File Upload System**: Server-side validation, secure storage, access control
- **Error Handling**: Generic error responses, sanitized logging
- **Data Protection**: Encryption in transit, secure storage of sensitive data

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

When you use the `=rrr` command, the agent will create a file and an Issue with the following sections and details:

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

**Results**: **15-minute implementations** vs 34+ minute sessions

**When to Use**: Complex multi-step tasks (3+ phases), multi-component refactoring, full-stack implementations, large refactoring projects, security audits, database migrations

**Workflow Pattern**:

1. Break into 5-12 manageable todos
2. Mark exactly ONE todo in_progress → completed
3. Provides real-time visibility and accountability
4. Enables accurate time estimation

**Proven Benefits**: 56% faster implementation, reduces context switching, prevents missing steps, ensures comprehensive testing

### Pattern Replication Strategy

#### Reference Implementation Approach

1. **Document Successful Patterns**: Create detailed retrospectives for reusable approaches
2. **Systematic Replication**: Use previous session files as implementation guides
3. **Adapt, Don't Recreate**: Modify proven patterns for new contexts
4. **Measure Efficiency**: Track implementation time improvements

### Build Validation Checkpoints

#### Critical Validation Points

- **Schema Changes**: `npm run build && npx tsc --noEmit`
- **API Modifications**: `npm run build 2>&1 | grep -A 5 "error"`
- **Large Refactoring**: `npx prisma generate && npm run build`

#### Proactive Testing Strategy

- **Incremental Builds**: Test builds after each major change, not just at the end
- **TypeScript Validation**: Run `npx tsc --noEmit` for pure type checking
- **Dependency Verification**: Check imports and exports after file restructuring
- **Database Sync**: Verify `npx prisma generate` after schema changes

### Schema Investigation Protocol

#### Before Implementation Checklist

1. **Verify Database Schema**: Always check actual Prisma schema definitions
2. **Trace Data Structures**: Follow interface definitions through the codebase
3. **Validate Field Names**: Don't assume field naming conventions
4. **Check Relationships**: Understand model relationships before querying

#### Common Schema Pitfalls

- **Assumption Errors**: Making assumptions about field names/structures
- **Interface Misalignment**: Frontend interfaces not matching database schema
- **Relationship Complexity**: Not understanding foreign key relationships
- **Type Mismatches**: TypeScript interfaces not reflecting actual data structures

### Multi-Phase Implementation Approach

#### Systematic Phase Breakdown

- **Phase 1**: Analysis & Preparation (10-15%)
- **Phase 2**: Core Implementation (40-50%)
- **Phase 3**: Integration & Testing (25-30%)
- **Phase 4**: Documentation & Cleanup (10-15%)

#### Phase Management Best Practices

- **Clear Phase Objectives**: Define specific deliverables for each phase
- **Dependency Mapping**: Identify cross-phase dependencies upfront
- **Progress Checkpoints**: Validate phase completion before proceeding
- **Issue Tracking**: Update GitHub issues after each phase completion

### Database Best Practices

#### SQLite Autoincrement Notes

- **AUTOINCREMENT**: SQLite manages `sqlite_sequence`; avoid manual resets
- **Recovery**: Use vacuum and integrity checks when needed; prefer migration scripts
- **Common Issue**: Auto-increment sequences become desynchronized after manual insertions

### Documentation Standards

#### PR Description Requirements

- **Implementation Summary**: Clear overview of changes made
- **Technical Details**: Specific technical implementation notes
- **Before/After Analysis**: Impact assessment and improvement metrics
- **Testing Validation**: Build success and functionality verification
- **Iteration Note Summary**: Key decisions and hurdles from development

#### Retrospective Documentation

- **AI Diary**: First-person reflection on approach and decision-making
- **Honest Feedback**: Critical assessment of session efficiency and quality
- **Pattern Recognition**: Identification of reusable patterns and approaches
- **Lessons Learned**: Specific insights for future implementation improvement
