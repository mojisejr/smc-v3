---
description: Create atomic Task GitHub Issues based on current execution mode
category: workflow
argument-hint: > [task description]
allowed-tools: Bash,Read,Write
---

# Task Planning System (/plan)

**Transformed from =plan command**

## Usage
```bash
/plan > [task description]
```
Creates atomic Task GitHub Issues using /docs/TASK-ISSUE-TEMP.md template, assigned based on current execution mode.

## Implementation

You are implementing the Task Planning System that replaces the =plan command workflow.

### Step 1: Parse Arguments
Extract task description from arguments (after `> `).

### Step 2: Check Current Execution Mode
Determine current execution mode:
- Check if mode is stored in project configuration
- Default to MANUAL if no mode setting exists
- Use `/mode status` to verify current mode if needed

### Step 3: Validate Context Readiness
Before creating tasks, verify:
- Context Issue exists and is accessible
- Context status is `[Ready for Planning]` or `[Implementation Ready]`
- Planning Readiness Checklist is complete
- All requirements are clear and documented

### Step 4: Template-Based Task Creation
**For MANUAL mode (default):**
1. Read `/docs/TASK-ISSUE-TEMP.md` template
2. Set EXECUTION MODE to `MANUAL`
3. Assign task to human developer
4. Create task with manual implementation instructions
5. Use labels: `atomic`, `manual`, `independent-execution`

**For COPILOT mode:**
1. Read `/docs/TASK-ISSUE-TEMP.md` template
2. Set EXECUTION MODE to `COPILOT`
3. Assign task to @copilot
4. Create task with copilot implementation instructions
5. Use labels: `atomic`, `copilot`, `independent-execution`

### Step 5: Task Structure Requirements
Ensure each task follows atomic principles:
- **Single Deliverable**: One specific outcome
- **Independent Execution**: No dependencies on other tasks
- **Complete Isolation**: Self-contained requirements
- **100% Validation**: Must pass build, lint, and tests

### Step 6: GitHub CLI Integration
Use these GitHub CLI commands:
- `gh issue create --title "[TASK] Atomic: [description]" --body "[template-content]" --assignee [assignee] --label "atomic" --label "[mode]" --label "independent-execution"`

### Step 7: Mode-Specific Behavior

**MANUAL Mode:**
- Tasks assigned to human developer
- Implementation instructions for manual execution
- Human performs validation and commits
- Additional [msg] provides context/clarification

**COPILOT Mode:**
- Tasks assigned to @copilot
- Implementation instructions for copilot execution
- Copilot performs validation and creates PRs
- Additional [msg] provides context/clarification

### Step 8: Output Format
```
✅ Task Issue Created: #[issue-number] - [title]
🤖 Execution Mode: [MANUAL|COPILOT]
👤 Assigned to: [username|@copilot]
🏷️  Labels: atomic, [mode], independent-execution
📋 Context: #[context-issue] (for reference)
🔗 URL: [github-issue-url]
📝 Next: Use /impl > [issue-number] to begin implementation
```

### Critical Rules (from original =plan)
- **ALWAYS creates GitHub Issues** - Never creates local .md files
- **Uses template structure exactly** from /docs/TASK-ISSUE-TEMP.md
- **Assigns based on current mode** (MANUAL/COPILOT)
- **Ensures atomic task characteristics**
- **Includes 100% validation requirements**
- **Never creates task dependencies**

### Task Assignment Logic

```bash
# Determine assignee based on mode
if [ "$MODE" = "COPILOT" ]; then
    ASSIGNEE="@copilot"
    MODE_LABEL="copilot"
else
    ASSIGNEE="[current-user]"
    MODE_LABEL="manual"
fi
```

### Integration with Other Commands
This command works with:
- `/fcs` - For creating context discussions
- `/impl` - For implementing created tasks
- `/mode` - For switching execution modes
- `/kupdate` - For documenting planning insights

### Error Handling
- Validate that `/docs/TASK-ISSUE-TEMP.md` exists
- Check GitHub CLI authentication (`gh auth status`)
- Verify repository access
- Ensure context issue is ready for planning
- Handle missing task descriptions gracefully
- Provide clear error messages for validation failures

Execute the planning workflow based on current mode and maintain the exact same functionality as the original =plan command system.