---
description: Implementation workflow for specific Task GitHub Issues
category: workflow
argument-hint: > [issue-number] [optional-message]
allowed-tools: Bash,Read,Write,Edit,Glob,Grep,Task,TodoWrite
---

# Implementation System (/impl)

**Transformed from =impl command**

## Usage
```bash
/impl > [issue-number]
/impl > [issue-number] [additional-context-message]
```
Triggers implementation workflow for specific Task GitHub Issue based on current execution mode.

## Implementation

You are implementing the Implementation System that replaces the =impl command workflow.

### Step 1: Parse Arguments
Extract issue number and optional message:
- Issue number: First argument after `> `
- Optional message: Remaining arguments for additional context

### Step 2: Pre-Implementation Validation
**Mandatory Checklist:**
1. **Staging Sync**: `git checkout staging && git pull origin staging`
2. **Task Verification**: Confirm Task GitHub Issue exists and is [TASK] type
3. **Context Status**: Verify Context GitHub Issue is `[Ready for Planning]` or `[Implementation Ready]`
4. **Environment Check**: `git status` - working directory must be clean
5. **Mode Check**: Verify current execution mode matches task assignment

### Step 3: Read Task Requirements
Use GitHub CLI to read task details:
- `gh issue view [issue-number]`
- Extract EXECUTION MODE (MANUAL/COPILOT)
- Parse technical requirements and deliverables
- Identify validation criteria
- Extract branch naming pattern

### Step 4: Mode-Specific Implementation

**For MANUAL Mode:**
1. Create feature branch: `git checkout -b feature/task-[issue-number]-[description]`
2. Display implementation instructions for human developer
3. Show validation checklist
4. Provide commit message template
5. Wait for human implementation completion
6. Guide through validation steps

**For COPILOT Mode:**
1. Create feature branch: `git checkout -b feature/task-[issue-number]-[description]`
2. Parse task requirements automatically
3. Execute implementation using available tools
4. Perform quality validation (build, lint, TypeScript)
5. Create commit with proper message format
6. Push branch: `git push -u origin feature/task-[issue-number]-[description]`
7. Create Pull Request using `/pr` command

### Step 5: Feature Branch Creation
```bash
# Extract task title and create branch name
TITLE=$(gh issue view $ISSUE_NUMBER --json title --jq '.title')
BRANCH_NAME="feature/task-$ISSUE_NUMBER-$(echo $TITLE | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-//;s/-$//')"

git checkout staging
git pull origin staging
git checkout -b $BRANCH_NAME
```

### Step 6: Implementation Execution

**Manual Implementation Guidance:**
- Display exact task requirements
- Show file creation list with paths
- Provide technical specifications
- Include testing requirements
- Show acceptance criteria

**Copilot Implementation:**
- Use TodoWrite to track complex tasks
- Create files according to task specifications
- Follow technical requirements exactly
- Implement comprehensive error handling
- Ensure accessibility compliance
- Write tests as specified

### Step 7: Quality Validation (Mandatory)
```bash
# Run all validations
npm run build    # Must show "✓ Compiled successfully" with 0 errors/warnings
npm run lint     # Must show "✓ Lint complete" with 0 violations
npx tsc --noEmit # Must pass TypeScript compilation
npm test         # Must show "✓ All tests passed" with 0 failures (if applicable)
```

### Step 8: Commit Process
```bash
git add .
git commit -m "feat: [single deliverable]

- Address #[issue-number]: [task title]
- Build validation: 100% PASS
- Linter validation: 100% PASS

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Step 9: Branch Management
```bash
git push -u origin feature/task-[issue-number]-[description]
```

### Step 10: Output Format

**For MANUAL Mode:**
```
🚀 Implementation Started: #[issue-number] - [title]
👤 Mode: MANUAL (Human Implementation Required)
🌿 Branch Created: feature/task-[issue-number]-[description]
📋 Task Requirements:
   - [Requirement 1]
   - [Requirement 2]
   - [Requirement N]
✅ Validation Checklist:
   - [ ] npm run build (100% PASS required)
   - [ ] npm run lint (100% PASS required)
   - [ ] npx tsc --noEmit (TypeScript pass required)
   - [ ] npm test (100% PASS required)
📝 Next Steps:
   1. Implement the deliverable according to requirements
   2. Run all validation commands
   3. Commit changes with provided template
   4. Push branch and create PR with /pr
```

**For COPILOT Mode:**
```
🤖 Implementation Started: #[issue-number] - [title]
🚀 Mode: COPILOT (Automatic Implementation)
🌿 Branch Created: feature/task-[issue-number]-[description]
📋 Executing Implementation...
   - Creating files: [file-list]
   - Following specifications: [tech-requirements]
   - Running validation: [build/lint/test]
✅ Implementation Complete
📊 Validation Results:
   - Build: 100% PASS
   - Lint: 100% PASS
   - TypeScript: PASS
   - Tests: PASS
🚀 Branch Pushed: [branch-url]
📝 Next: Use /pr to create Pull Request
```

### Critical Rules (from original =impl)
- **ALWAYS sync staging first** before implementation
- **MUST create feature branch** with proper naming
- **REQUIRES 100% validation** before commit
- **NEVER merge PRs yourself** - provide PR link
- **MUST follow exact task requirements**
- **NEVER skip quality validation**

### Integration with Other Commands
This command works with:
- `/plan` - For creating task issues
- `/fcs` - For context requirements
- `/pr` - For creating pull requests after implementation
- `/mode` - For execution mode management
- `/kupdate` - For documenting implementation learnings

### Error Handling
- Validate GitHub CLI authentication
- Check issue number exists and is [TASK] type
- Ensure working directory is clean
- Handle branch creation conflicts
- Validate all quality checks pass
- Provide clear error messages for failures

Execute the implementation workflow based on current mode and maintain the exact same functionality as the original =impl command system.