---
description: Create Pull Request from pushed feature branch
category: workflow
argument-hint: > [feedback]
allowed-tools: Bash,Read,Write
---

# Pull Request System (/pr)

**Transformed from =pr command**

## Usage
```bash
/pr > [feedback]
/pr
```
Creates Pull Request from pushed feature branch (ALWAYS to staging, NEVER to main).

## Implementation

You are implementing the Pull Request system that replaces the =pr command workflow.

### Step 1: Parse Arguments
Extract optional feedback message (after `> `).

### Step 2: Pre-PR Validation
**Mandatory Checklist:**
1. **Branch Check**: Verify on feature branch (not main/staging)
2. **Push Status**: Ensure branch is pushed to remote
3. **Clean Working Directory**: `git status` must be clean
4. **Build Validation**: Confirm `npm run build` passed 100%
5. **Lint Validation**: Confirm `npm run lint` passed 100%
6. **TypeScript Validation**: Confirm `npx tsc --noEmit` passed

### Step 3: Branch Information
Extract current branch details:
- `git branch --show-current` - Get current branch name
- `git log --oneline -5` - Get recent commits
- Parse issue number from branch name (feature/task-[issue-number]-*)
- Get branch target (should be staging)

### Step 4: PR Content Generation
Generate PR content automatically:
- Extract issue number from branch name
- Read issue details: `gh issue view [issue-number]`
- Generate PR title based on task title
- Create comprehensive PR body with sections

### Step 5: GitHub CLI PR Creation
Create PR using GitHub CLI:
```bash
gh pr create \
  --title "[PR Title]" \
  --base staging \
  --head $(git branch --show-current) \
  --body "[PR body content]" \
  --label "auto-pr" \
  --label "ready-for-review"
```

### Step 6: PR Body Template
Use structured PR body:
```markdown
## Summary
[Brief description of changes implemented]

## Task Details
- **Addresses**: #[issue-number] - [task title]
- **Execution Mode**: [MANUAL|COPILOT]
- **Branch**: feature/task-[issue-number]-[description]

## Changes Made
- [List of specific changes implemented]
- [Files created/modified]
- [Features added/bugs fixed]

## Validation Results
- ✅ Build: 100% PASS (0 errors, 0 warnings)
- ✅ Lint: 100% PASS (0 violations)
- ✅ TypeScript: PASS
- ✅ Tests: PASS (if applicable)

## Test Plan
- [ ] Manual testing completed
- [ ] All automated tests pass
- [ ] Desktop app functionality verified
- [ ] No unintended side effects

## Additional Notes
[Optional feedback or context provided via > [feedback] argument]

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

### Step 7: Output Format
```
✅ Pull Request Created Successfully
🔗 PR URL: [github-pr-url]
📝 Title: [pr-title]
🌿 Branch: [feature-branch-name] → staging
🏷️  Labels: auto-pr, ready-for-review

📊 PR Information:
- Task Issue: #[issue-number] - [task-title]
- Files Changed: [file-count]
- Commits: [commit-count]
- Additions: [additions], Deletions: [deletions]

👥 Reviewers: [auto-assigned-reviewers]
📋 Status: Ready for Review

💡 Next Steps:
1. Request code review from team members
2. Address any feedback or requested changes
3. Merge to staging after approval
4. NEVER MERGE TO MAIN DIRECTLY

🚫 CRITICAL: NEVER merge PRs yourself - wait for team review and approval
```

### Critical Rules (from original =pr)
- **ALWAYS create PR to staging** - NEVER to main
- **NEVER merge PRs yourself** - Provide PR link and wait for instructions
- **REQUIRES 100% validation** before PR creation
- **MUST be from feature branch** - Never from main/staging
- **INCLUDES complete validation results** in PR body
- **FOLLOWS structured PR template** exactly

### Error Handling
- Validate not on main/staging branch
- Check branch is pushed to remote
- Verify clean working directory
- Handle GitHub CLI authentication
- Process validation failures gracefully
- Provide clear error messages for missing requirements

### Integration with Other Commands
This command works with:
- `/impl` - For implementation before PR creation
- `/plan` - For task requirements that lead to implementation
- `/mode` - For execution mode context in PR

Execute the pull request creation workflow and maintain the exact same functionality as the original =pr command system.