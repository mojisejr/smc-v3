---
description: Create Knowledge GitHub Issues using structured templates
category: knowledge
argument-hint: [category] "[topic]"
allowed-tools: Bash,Read,Write
---

# Knowledge Update System (/kupdate)

**Transformed from =kupdate command**

## Usage
```bash
/kupdate [category] "[topic]"
```
Creates Knowledge GitHub Issue using /docs/KNOWLEDGE-TEMP.md with automatic Knowledge ID generation.

## Valid Categories
- `device` - CU12, KU16, SerialPort, hardware integration
- `database` - SQLite, Sequelize, migrations, queries
- `architecture` - Design patterns, structural decisions
- `debug` - Error solutions, troubleshooting, workarounds
- `workflow` - Process improvements, automation
- `frontend` - React, Electron, UI components
- `backend` - Node.js, APIs, services

## Implementation

You are implementing the Knowledge Update system that replaces the =kupdate command workflow.

### Step 1: Parse Arguments
Extract category and topic:
- Category: First argument (must be one of valid categories)
- Topic: Second argument in quotes (knowledge topic description)

### Step 2: Pre-Creation Validation (CRITICAL)
**MANDATORY Pre-Creation Checklist:**
1. **ALWAYS run /khub first** - Read Knowledge Hub #102 completely
2. **Check existing numbers** in the specified category section
3. **Identify next available number** (if 001, 002 exist, use 003)
4. **Never assume** - always verify existing entries before creating

### Step 3: Auto-Label Creation
Check and create knowledge category labels if needed:
```bash
# Check if label exists
gh label list --search "knowledge-[category]"

# Create label if not exists
gh label create knowledge-[category] --color "1d76db" --description "[category] integration knowledge"
```

### Step 4: Knowledge ID Generation
Generate next available Knowledge ID:
- Format: `KNOW-[CATEGORY]-[NUMBER]`
- Example: `KNOW-DEVICE-003`, `KNOW-DATABASE-015`
- Auto-increment per category
- Verify against existing entries from hub

### Step 5: Template Processing
Read `/docs/KNOWLEDGE-TEMP.md` and fill placeholders:
- Set Knowledge ID in title: `KNOW-[CATEGORY]-[NUMBER]: [topic]`
- Populate category-specific context
- Add structured sections for problem/solution/lessons
- Include AI honest feedback sections

### Step 6: GitHub Issue Creation
Create knowledge issue with proper structure:
```bash
gh issue create \
  --title "KNOW-[CATEGORY]-[NUMBER]: [topic]" \
  --body "[template-content]" \
  --label "knowledge-[category]" \
  --label "knowledge-entry"
```

### Step 7: Auto-Prompt for Hub Linking
After successful creation, automatically prompt:
```
🔗 Link to Knowledge Hub #102? (y/n)
```
- If "y": Automatically run `/klink [new-issue-number]`
- If "n": Skip linking (can be done later)

### Step 8: Output Format
```
✅ Knowledge Issue Created: KNOW-[CATEGORY]-[NUMBER]: [topic]
🔗 URL: [github-issue-url]
🏷️  Labels: knowledge-[category], knowledge-entry
📝 Next: Use /klink [issue-number] to add to Knowledge Hub
🔍 Available Commands:
   - /klink [issue-number] - Link to Knowledge Hub #102
   - /ksync - Synchronize hub with all knowledge entries
   - /ksearch "[query]" - Search across all knowledge
   - /kcategory [category] - Show category knowledge
```

### Critical Rules (from original =kupdate)
- **ALWAYS creates GitHub Issues** - Never creates local .md files
- **CHECK existing numbers first** to prevent duplicates
- **NEVER assume Knowledge IDs** - always verify
- **FOLLOWS template structure exactly** from /docs/KNOWLEDGE-TEMP.md
- **AUTO-prompts for hub linking** after creation
- **MAINTAINS consistency** across knowledge system

### Knowledge Structure Requirements
Each knowledge entry must contain:
- **Problem Statement**: Clear description of what was solved
- **Solution Implementation**: Step-by-step working solution
- **AI Honest Feedback**: What worked, what didn't, lessons learned
- **Things to Avoid**: Common pitfalls and their consequences
- **Prerequisites**: What to check before starting
- **AI Self-Improvement**: Insights for future problem-solving
- **Links & References**: Connections to source issues/PRs/code
- **Verification Status**: Testing and validation state

### Error Handling
- Validate category is one of allowed values
- Check that `/docs/KNOWLEDGE-TEMP.md` exists
- Verify GitHub CLI authentication
- Ensure Knowledge Hub #102 is accessible
- Handle duplicate Knowledge ID detection
- Provide clear error messages for validation failures

### Integration with Other Commands
This command works with:
- `/khub` - For checking existing knowledge entries
- `/klink` - For linking knowledge to hub
- `/ksync` - For synchronizing hub
- `/ksearch` - For searching knowledge
- `/kcategory` - For category-specific knowledge

### Common Mistakes to Avoid (CRITICAL)
- ❌ Creating KNOW-DEVICE-001 when it already exists
- ❌ Not checking Knowledge Hub #102 before creating entries
- ❌ Assuming numbers without verification
- ❌ Creating duplicate knowledge IDs
- ❌ Skipping hub linking prompt

Execute the knowledge creation workflow and maintain the exact same functionality as the original =kupdate command system.