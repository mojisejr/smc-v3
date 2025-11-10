---
description: Switch or display current execution mode (MANUAL/COPILOT)
category: system
argument-hint: manual | copilot | status
allowed-tools: Bash,Read,Write
---

# Mode Management System (/mode)

**Transformed from =mode command**

## Usage
```bash
/mode manual     # Switch to MANUAL mode (tasks assigned to human)
/mode copilot     # Switch to COPILOT mode (tasks assigned to @copilot)
/mode status      # Show current execution mode
```

## Implementation

You are implementing the Mode Management system that replaces the =mode command workflow.

### Step 1: Parse Arguments
Extract mode command from arguments:
- `manual` - Switch to MANUAL mode
- `copilot` - Switch to COPILOT mode
- `status` - Show current mode

### Step 2: Mode Storage
Store mode in project configuration:
- Check for existing mode setting in `.claude/settings.json` or project config
- Create/update mode setting as needed
- Persist mode across sessions

### Step 3: Mode Switching Logic

**For MANUAL mode:**
- Set execution mode to "MANUAL"
- Update project configuration
- Inform user of mode change
- Explain behavior differences

**For COPILOT mode:**
- Set execution mode to "COPILOT"
- Update project configuration
- Inform user of mode change
- Explain behavior differences

**For status command:**
- Read current mode from configuration
- Display current mode and behavior
- Show mode-specific command examples

### Step 4: Mode-Specific Behavior

**MANUAL Mode Behavior:**
- `/plan` creates tasks assigned to human developer
- `/impl` triggers manual implementation workflow
- Human performs validation and commits
- Additional [msg] provides context/clarification

**COPILOT Mode Behavior:**
- `/plan` creates tasks assigned to @copilot
- `/impl` triggers copilot implementation workflow
- Copilot performs validation and creates PRs
- Additional [msg] provides context/clarification

### Step 5: Configuration Management
Store mode setting:
```json
{
  "smc": {
    "executionMode": "MANUAL|COPILOT",
    "lastUpdated": "2025-01-10T10:30:00Z"
  }
}
```

### Output Format

**For mode switching:**
```
✅ Execution Mode Changed: [NEW_MODE]
🤖 Mode Behavior:
- Tasks created by /plan will be assigned to [assignee]
- /impl will trigger [implementation-type] workflow
- Additional context messages will be handled by [handler-type]

📝 Current Mode: [NEW_MODE]
🔄 Last Changed: [timestamp]
💡 Use /mode status to see current behavior details
```

**For status command:**
```
📊 Current Execution Mode: [MODE]

🤖 Mode Behavior:
- /plan creates tasks assigned to: [assignee]
- /impl triggers: [implementation-type] workflow
- Context messages handled by: [handler-type]

📋 Mode-Specific Commands:
[MODE-specific command examples]

🔄 Mode Persistence: [enabled/disabled]
💡 Switch modes: /mode [manual|copilot]
```

### Critical Rules (from original =mode)
- **Default mode is MANUAL** (human implementation)
- **Mode persists** throughout session
- **Mode affects task assignment** in /plan
- **Mode affects implementation workflow** in /impl
- **Clear mode indication** for user understanding

### Error Handling
- Validate mode argument is one of valid options
- Handle configuration file permissions
- Provide clear error messages for invalid modes
- Show current mode if invalid switch attempted

### Integration with Other Commands
This command works with:
- `/plan` - Task assignment depends on current mode
- `/impl` - Implementation workflow depends on current mode
- All workflow commands respect current mode setting

Execute the mode management workflow and maintain the exact same functionality as the original =mode command system.