---
description: Create or update Context GitHub Issues for iterative discussions
category: workflow
argument-hint: > [topic-name] | > [CONTEXT] | list
allowed-tools: Bash,Read,Write
---

# Feature Context System (/fcs)

**Transformed from =fcs command**

## Usage Patterns

### Create New Context Issue
```bash
/fcs > [topic-name]
```
Creates a new GitHub Issue using /docs/ISSUE-TEMP.md template for iterative discussions.

### Update Existing Context Issue
```bash
/fcs > [CONTEXT]
```
Updates existing Context GitHub Issue with new discussion points and accumulated context.

### List Active Context Issues
```bash
/fcs list
```
Shows all active Context Issues with their current status.

## Implementation

You are implementing the Feature Context System (FCS) that replaces the =fcs command workflow.

### Step 1: Parse Arguments
Parse the command arguments to determine the action:
- If argument starts with `> ` and contains a topic name → Create new context
- If argument starts with `> ` and contains [CONTEXT] → Update existing context
- If argument is `list` → List active contexts

### Step 2: Template-Based Workflow
**For creating new context:**
1. Read `/docs/ISSUE-TEMP.md` template
2. Extract topic name from arguments (after `> `)
3. Replace template placeholders with initial values:
   - Set CONTEXT OBJECTIVE based on topic
   - Initialize DISCUSSION LOG with current timestamp
   - Set CURRENT STATUS to `[Planning]`
   - Set Last Updated to current timestamp
4. Create GitHub Issue using `gh issue create` command
5. Return the issue URL and number

**For updating existing context:**
1. Prompt user for existing Context Issue number
2. Read the current issue content using `gh issue view`
3. Add new session to DISCUSSION LOG with timestamp
4. Update ACCUMULATED CONTEXT sections as needed
5. Modify CURRENT STATUS if appropriate
6. Update issue using `gh issue edit` with updated body

**For listing contexts:**
1. Use `gh issue list` with appropriate labels (context-related)
2. Display issue numbers, titles, and current status
3. Show which contexts are `[Ready for Planning]`

### Step 3: GitHub CLI Integration
Use these GitHub CLI commands:
- `gh issue create --title "[CONTEXT] [topic]" --body "[template-content]" --label "context"`
- `gh issue view [issue-number]`
- `gh issue edit [issue-number] --body "[updated-content]"`
- `gh issue list --label "context" --state open`

### Step 4: Error Handling
- Validate that `/docs/ISSUE-TEMP.md` exists
- Check GitHub CLI authentication (`gh auth status`)
- Verify repository access
- Handle invalid issue numbers gracefully
- Provide clear error messages for missing arguments

### Step 5: Output Format
**For new context creation:**
```
✅ Context Issue Created: #[issue-number] - [title]
🔗 URL: [github-issue-url]
📋 Status: [Planning]
📝 Next: Use /fcs > [CONTEXT] to update this context
```

**For context updates:**
```
✅ Context Issue Updated: #[issue-number]
📝 Added new session to DISCUSSION LOG
📋 Current Status: [status]
🔄 Last Updated: [timestamp]
```

**For listing contexts:**
```
📋 Active Context Issues:
#123 - [context-title] ([Ready for Planning])
#124 - [context-title] ([Planning])
#125 - [context-title] ([Implementation Ready])
```

### Critical Rules (from original =fcs)
- **ALWAYS creates GitHub Issues** - Never creates local .md files
- **Follows template structure exactly** from /docs/ISSUE-TEMP.md
- **Maintains discussion log** with proper timestamps
- **Updates Planning Readiness Checklist** as context evolves
- **Preserves all accumulated context** during updates

### Integration with Other Commands
This command works with:
- `/plan` - When context reaches `[Ready for Planning]` status
- `/kupdate` - For documenting insights from context discussions
- `/mode` - For execution mode management

Execute the appropriate action based on parsed arguments and maintain the exact same functionality as the original =fcs command system.