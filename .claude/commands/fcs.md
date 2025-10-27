# Context Management Command (/fcs)

**Creates and updates GitHub Issues (not .md files) to mimic the =fcs workflow exactly**

## Command Syntax

```bash
/fcs > [topic-name]           # Create new GitHub Issue using /docs/ISSUE-TEMP.md
/fcs > [ISSUE-XXX]            # Update existing GitHub Issue using /docs/ISSUE-TEMP.md
/fcs list                     # Show all active Context Issues from GitHub
```

## Implementation

This command creates and updates **GitHub Issues directly** (not local .md files) using the GitHub CLI:

### Phase 1: Initial Context Creation
When using `/fcs > [topic-name]`:
1. **Creates GitHub Issue** using `/docs/ISSUE-TEMP.md` template via `gh issue create`
2. **Extracts real issue number** from GitHub API response (e.g., #42)
3. **Replaces all ISSUE-XXX placeholders** with actual issue number (e.g., ISSUE-42 → #42)
4. Fills basic sections: CONTEXT OBJECTIVE, starts DISCUSSION LOG, sets CURRENT STATUS = Planning
5. Adds initial requirements from the current session
6. Updates SESSION NOTES with important discussion points
7. Assigns labels: `context`, `planning`
8. Updates issue title and body with correct issue number (e.g., "[Context] topic - #42")

### Phase 2: Context Updates
When using `/fcs > [ISSUE-XXX]`:
1. **Validates issue number format** (e.g., 42, #42, or ISSUE-42) and extracts numeric ID
2. **Updates existing GitHub Issue** using `gh issue edit [actual-number]`
3. Fetches current issue content via `gh issue view [actual-number]`
4. **Ensures all ISSUE-XXX placeholders** use the correct issue number (e.g., #42)
5. Adds new session to DISCUSSION LOG with timestamp
6. Updates ACCUMULATED CONTEXT with new requirements/decisions
7. Modifies TECHNICAL ARCHITECTURE based on new information
8. Updates SESSION NOTES with latest discussion content
9. Updates issue body with modified template content (correct issue numbers)
10. Updates labels if status changes (e.g., to `ready-for-planning`)

### Phase 3: Context Listing
When using `/fcs list`:
1. Queries GitHub issues with `context` label via `gh issue list --label context`
2. Shows all active Context Issues with their numbers and titles
3. Displays current status from issue body
4. Indicates which contexts are ready for planning

## GitHub CLI Integration

### Prerequisites
- GitHub CLI (`gh`) must be installed and authenticated
- Repository must have `context` and `planning` labels created
- User must have issue creation/editing permissions

### Commands Used
```bash
# Create new issue (get actual issue number from response)
ISSUE_NUMBER=$(gh issue create --title "[Context] [topic-name]" --body "[template-content]" --label context,planning | grep -oE '#[0-9]+' | head -1 | sed 's/#//')

# Update existing issue (use actual number, not ISSUE-XXX)
gh issue edit $ACTUAL_NUMBER --body "[updated-template-content-with-#$ACTUAL_NUMBER]"

# Add comments to issue (use actual number)
gh issue comment $ACTUAL_NUMBER --body "[session-update-content]"

# List context issues
gh issue list --label context --state open --limit 20

# View issue content (get actual issue number)
gh issue view $ACTUAL_NUMBER --json body,title,number
```

### Issue Number Processing
```bash
# Extract actual issue number from various formats
extract_issue_number() {
    local input="$1"
    # Handle formats: 42, #42, ISSUE-42, ISSUE-XXX
    if [[ "$input" =~ ^#?([0-9]+)$ ]]; then
        echo "${BASH_REMATCH[1]}"
    elif [[ "$input" =~ ^ISSUE-([0-9]+)$ ]]; then
        echo "${BASH_REMATCH[1]}"
    else
        echo "Error: Invalid issue format: $input"
        return 1
    fi
}

# Replace ISSUE-XXX placeholders with actual issue number
replace_issue_placeholders() {
    local template="$1"
    local issue_number="$2"
    echo "$template" | sed -E "s/ISSUE-XXX/#$issue_number/g"
}
```

## Template Processing

### Issue Title Format
```
[Context] [topic-name] - #42
```
**Note**: XXX placeholders are replaced with actual GitHub issue numbers (e.g., #42, #156, etc.)

### Issue Body Structure
The issue body will contain the full `/docs/ISSUE-TEMP.md` template with:
- **🎯 #42 [Context Title]** (XXX replaced with actual issue number)
- **🎯 CONTEXT OBJECTIVE**
- **📝 DISCUSSION LOG** (with timestamps)
- **🔄 CURRENT STATUS** (Planning/Ready for Planning/Implementation Ready)
- **📋 ACCUMULATED CONTEXT**
- **🏗️ TECHNICAL ARCHITECTURE**
- **📋 PLANNING READINESS CHECKLIST**
- **🔗 RELATED ISSUES**

### Label Management
- `context`: All context issues have this label
- `planning`: Initial status, changed when ready
- `ready-for-planning`: When checklist is complete
- `implementation-ready`: When tasks are generated

## Workflow Integration

This command is part of the template-driven workflow process:

1. **Phase 1**: `/fcs > [topic]` → Create GitHub Issue with initial context
2. **Phase 2**: `/fcs > [ISSUE-XXX]` → Update GitHub Issue iteratively
3. **Phase 3**: Context reaches `[Ready for Planning]` status → Ready for planning
4. **Phase 4**: `=plan > [task]` → Create atomic tasks (uses /docs/TASK-ISSUE-TEMP.md)
5. **Phase 5**: `=impl > [task-number]` → Implement based on mode

## Error Handling

### Common Issues and Solutions
- **GitHub CLI not authenticated**: Run `gh auth login` first
- **Missing labels**: Create labels in repository settings first
- **Issue not found**: Verify issue number exists in current repository
- **Permission denied**: Check user has issue creation/editing permissions
- **Network issues**: Ensure internet connection for GitHub API access
- **ISSUE-XXX not replaced**: Ensure issue number extraction and replacement functions work correctly
- **Invalid issue format**: Use proper format like 42, #42, or ISSUE-42

### Issue Number Validation
```bash
# Validate issue number before processing
validate_issue_number() {
    local input="$1"
    if ! extract_issue_number "$input" >/dev/null 2>&1; then
        echo "Error: Invalid issue number format: $input"
        echo "Valid formats: 42, #42, ISSUE-42"
        return 1
    fi
}

# Test issue exists before updating
check_issue_exists() {
    local issue_number="$1"
    if ! gh issue view "$issue_number" >/dev/null 2>&1; then
        echo "Error: Issue #$issue_number does not exist in this repository"
        return 1
    fi
}
```

## Context Evolution Principles

- **Incremental**: Add information gradually through GitHub issue updates
- **Transparent**: Record why decisions were made in issue comments/body
- **Flexible**: Adjust decisions with explanations in issue history
- **Living Document**: GitHub issue grows with understanding through edits

## Quality Requirements

- GitHub Issues must reach `[Ready for Planning]` or `[Implementation Ready]` status before task creation
- All PLANNING READINESS CHECKLIST items should be completed via issue updates
- Context must be comprehensive enough for atomic task generation
- Follows template-guided workflow with proper context validation
- Issue titles and labels must follow the established conventions

---
*This command creates and updates GitHub Issues (not .md files) to replicate the =fcs workflow functionality exactly as described in the project documentation.*