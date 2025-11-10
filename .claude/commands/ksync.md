---
description: Synchronize Knowledge Hub #102 with all knowledge entries
category: knowledge
argument-hint: (no arguments)
allowed-tools: Bash,Read,Write,Edit
---

# Knowledge Sync System (/ksync)

**Transformed from =ksync command**

## Usage
```bash
/ksync
```
Scans all issues with `knowledge-*` labels and synchronizes Knowledge Hub with all existing knowledge entries.

## Implementation

You are implementing the Knowledge Sync system that replaces the =ksync command workflow.

### Step 1: Knowledge Discovery
Scan all issues with knowledge labels:
- `gh issue list --label "knowledge-device" --state all`
- `gh issue list --label "knowledge-database" --state all`
- Continue for all knowledge categories
- Collect all knowledge issues in repository

### Step 2: Category Processing
Group knowledge issues by label type:
- device: Issues with `knowledge-device` label
- database: Issues with `knowledge-database` label
- architecture: Issues with `knowledge-architecture` label
- debug: Issues with `knowledge-debug` label
- workflow: Issues with `knowledge-workflow` label
- frontend: Issues with `knowledge-frontend` label
- backend: Issues with `knowledge-backend` label

### Step 3: Entry Generation
Create standardized format for each found issue:
```
**KNOW-[CATEGORY]-[NUMBER]**: [Title](issue-link) - Brief description
```

### Step 4: Hub Reconstruction
Replace all category sections with complete lists:
- Read current Knowledge Hub #102 content
- Rebuild each category section with all found entries
- Maintain chronological ordering within each category
- Preserve hub structure and formatting

### Step 5: Statistics Calculation
Recalculate all counts from scratch:
- Total knowledge entries count
- Per-category entry counts
- Last updated timestamp
- Distribution across categories

### Step 6: Format Validation
Ensure proper markdown structure:
- Valid GitHub issue links
- Proper heading levels
- Consistent formatting across sections
- No broken or duplicate entries

### Step 7: Update Knowledge Hub
Apply synchronized content:
- `gh issue edit 102 --body "[reconstructed-content]"`
- Verify all changes applied correctly

### Output Format
```
🔄 Knowledge Hub Synchronization Complete
📊 Scanned Issues: [total-scanned]
📝 Knowledge Entries Found: [total-found]
📚 Categories Updated: [categories-updated]

📈 Updated Statistics:
- Total Knowledge Entries: [new-total]
- Device Knowledge: [device-count] entries
- Database Knowledge: [database-count] entries
- Architecture Knowledge: [architecture-count] entries
- Debug Knowledge: [debug-count] entries
- Workflow Knowledge: [workflow-count] entries
- Frontend Knowledge: [frontend-count] entries
- Backend Knowledge: [backend-count] entries

🕐 Last Updated: [current-timestamp]
🔗 View Updated Hub: [knowledge-hub-url]
```

### Critical Rules (from original =ksync)
- **Complete knowledge discovery** across all labels
- **Category processing** for proper organization
- **Standardized entry format** for consistency
- **Hub reconstruction** with complete lists
- **Statistics calculation** from scratch
- **Format validation** for proper markdown

### Error Handling
- Validate GitHub CLI authentication
- Handle missing Knowledge Hub #102
- Process label parsing errors gracefully
- Handle rate limiting for large repositories
- Validate all issue links before updating
- Provide progress indicators for large syncs

### Integration with Other Commands
This command works with:
- `/khub` - For viewing synchronized hub
- `/kupdate` - For creating new entries
- `/klink` - For individual entry linking
- `/ksearch` - For searching synchronized knowledge

Execute the knowledge synchronization workflow and maintain the exact same functionality as the original =ksync command system.