---
description: Link knowledge entry to Knowledge Hub #102 automatically
category: knowledge
argument-hint: [knowledge-issue-number]
allowed-tools: Bash,Read,Write,Edit
---

# Knowledge Link System (/klink)

**Transformed from =klink command**

## Usage
```bash
/klink [knowledge-issue-number]
```
Automatically detects category from knowledge issue labels and places knowledge link in appropriate Knowledge Hub section.

## Implementation

You are implementing the Knowledge Link system that replaces the =klink command workflow.

### Step 1: Parse Arguments
Extract knowledge issue number from arguments.

### Step 2: Issue Analysis
Read the knowledge issue details:
- `gh issue view [issue-number] --json title,labels,body`
- Extract title, labels, and description
- Detect category from `knowledge-[category]` label

### Step 3: Category Detection
Parse knowledge category from labels:
- `knowledge-device` → Device Knowledge section
- `knowledge-database` → Database Knowledge section
- `knowledge-architecture` → Architecture Knowledge section
- `knowledge-debug` → Debug Knowledge section
- `knowledge-workflow` → Workflow Knowledge section
- `knowledge-frontend` → Frontend Knowledge section
- `knowledge-backend` → Backend Knowledge section

### Step 4: Format Entry
Create standardized knowledge entry:
```
**KNOW-[CATEGORY]-[NUMBER]**: [Title](issue-link) - Brief description
```

### Step 5: Read Knowledge Hub
Access Knowledge Hub #102:
- `gh issue view 102 --json body`
- Parse current hub content
- Identify appropriate section for insertion

### Step 6: Section Insert
Add knowledge entry to appropriate "Recent Entries" section:
- Find the correct category section
- Insert entry in chronological order
- Maintain proper markdown formatting
- Preserve existing hub structure

### Step 7: Statistics Update
Update hub statistics:
- Increment total knowledge entries count
- Increment category-specific count
- Update "Last Updated" timestamp
- Maintain statistics consistency

### Step 8: Update Knowledge Hub
Apply changes to Knowledge Hub #102:
- `gh issue edit 102 --body "[updated-content]"`
- Ensure proper markdown formatting
- Verify all links are valid

### Output Format
```
✅ Knowledge Entry Linked: KNOW-[CATEGORY]-[NUMBER]
📝 Title: [knowledge-title]
🏷️  Category: [category-name]
📍 Added to: Knowledge Hub #102 - [Category Knowledge] section
📊 Statistics Updated: Total [new-total], Category [new-category-count]
🕐 Last Updated: [current-timestamp]
🔗 View Hub: [knowledge-hub-url]
```

### Critical Rules (from original =klink)
- **Automatic category detection** from knowledge issue labels
- **Proper markdown formatting** maintenance
- **Statistics counters** update automatically
- **Preserve hub structure** and existing content
- **Valid links only** - verify all GitHub issue links work
- **Chronological ordering** within category sections

### Error Handling
- Validate issue number exists
- Check issue has `knowledge-*` labels
- Verify Knowledge Hub #102 accessibility
- Handle missing category labels gracefully
- Prevent duplicate linking to same entry
- Provide clear error messages for failures

### Integration with Other Commands
This command works with:
- `/kupdate` - Auto-prompts for linking after creation
- `/khub` - For viewing updated hub
- `/ksync` - For full hub synchronization
- `/kcategory` - For category-specific viewing

Execute the knowledge linking workflow and maintain the exact same functionality as the original =klink command system.