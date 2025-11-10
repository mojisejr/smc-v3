---
description: Read Knowledge Hub #102 for knowledge management navigation
category: knowledge
argument-hint: (no arguments)
allowed-tools: Bash,Read
---

# Knowledge Hub Access (/khub)

**Transformed from =khub command**

## Usage
```bash
/khub
```
Reads Knowledge Hub #102 FIRST before creating knowledge entries to check existing KNOW-[CATEGORY]-XXX numbers.

## Implementation

You are implementing the Knowledge Hub Access system that replaces the =khub command workflow.

### Step 1: Access Knowledge Hub
Use GitHub CLI to read Knowledge Hub #102:
- `gh issue view 102`

### Step 2: Display Knowledge Hub Content
Show the complete Knowledge Hub structure:
- Statistics and overview
- Category sections with existing entries
- Recent entries by category
- Knowledge ID assignments
- Last updated information

### Step 3: Parse Category Information
Extract and display:
- Device Knowledge (KNOW-DEVICE-XXX entries)
- Database Knowledge (KNOW-DATABASE-XXX entries)
- Architecture Knowledge (KNOW-ARCHITECTURE-XXX entries)
- Debug Knowledge (KNOW-DEBUG-XXX entries)
- Workflow Knowledge (KNOW-WORKFLOW-XXX entries)
- Frontend Knowledge (KNOW-FRONTEND-XXX entries)
- Backend Knowledge (KNOW-BACKEND-XXX entries)

### Step 4: Show Existing Numbers
For each category, display the highest existing number:
- KNOW-DEVICE-001, KNOW-DEVICE-002, etc.
- KNOW-DATABASE-001, KNOW-DATABASE-002, etc.
- This helps prevent duplicate Knowledge ID creation

### Step 5: Navigation Guidance
Provide guidance for:
- How to use /kupdate to create new knowledge entries
- How to check existing numbers before creating entries
- How to use /klink to connect knowledge to hub
- How to use /ksync to synchronize hub with all entries

### Output Format
```
🧠 Knowledge Hub #102 - Smart Medication Cart v3

📊 Statistics:
- Total Knowledge Entries: [number]
- Last Updated: [date]
- Categories: 7 active

📚 Knowledge Categories:

🔧 Device Knowledge (KNOW-DEVICE-XXX)
- KNOW-DEVICE-001: [title](link) - [description]
- KNOW-DEVICE-002: [title](link) - [description]
- Next available: KNOW-DEVICE-003

🗄️ Database Knowledge (KNOW-DATABASE-XXX)
- KNOW-DATABASE-001: [title](link) - [description]
- Next available: KNOW-DATABASE-002

🏗️ Architecture Knowledge (KNOW-ARCHITECTURE-XXX)
- No entries yet
- Next available: KNOW-ARCHITECTURE-001

🐛 Debug Knowledge (KNOW-DEBUG-XXX)
- KNOW-DEBUG-001: [title](link) - [description]
- Next available: KNOW-DEBUG-002

⚙️ Workflow Knowledge (KNOW-WORKFLOW-XXX)
- No entries yet
- Next available: KNOW-WORKFLOW-001

🎨 Frontend Knowledge (KNOW-FRONTEND-XXX)
- KNOW-FRONTEND-001: [title](link) - [description]
- Next available: KNOW-FRONTEND-002

⚡ Backend Knowledge (KNOW-BACKEND-XXX)
- No entries yet
- Next available: KNOW-BACKEND-001

📝 Usage Instructions:
1. Always check existing numbers before creating new entries
2. Use /kupdate [category] "[topic]" to create new knowledge
3. Use /klink [issue-number] to connect knowledge to hub
4. Use /ksync to synchronize hub with all knowledge entries
5. Use /ksearch "[query]" to search across all knowledge

🔍 Recent Updates:
- [Entry] - [date] - [category]
- [Entry] - [date] - [category]
```

### Critical Rules (from original =khub)
- **ALWAYS read Knowledge Hub #102 first** before creating knowledge entries
- **Check existing numbers** in each category to prevent duplicates
- **Identify next available number** for each category
- **Never assume** - always verify existing entries
- **Provide clear guidance** for knowledge creation workflow

### Error Handling
- Validate GitHub CLI authentication
- Check if Knowledge Hub #102 exists
- Handle network connectivity issues
- Provide clear error messages if hub is inaccessible
- Show alternative navigation methods if hub is unavailable

### Integration with Other Commands
This command works with:
- `/kupdate` - For creating new knowledge entries
- `/klink` - For linking knowledge to hub
- `/ksync` - For synchronizing hub
- `/ksearch` - For searching knowledge
- `/kcategory` - For category-specific knowledge
- `/krecent` - For recent knowledge updates

Execute the knowledge hub access workflow and maintain the exact same functionality as the original =khub command system.