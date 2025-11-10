---
description: Show all knowledge entries for a specific category
category: knowledge
argument-hint: [category]
allowed-tools: Bash,Read
---

# Knowledge Category System (/kcategory)

**Transformed from =kcategory command**

## Usage
```bash
/kcategory [category]
```
Shows all knowledge entries for a specific category with complete details.

## Valid Categories
- `device` - CU12, KU16, SerialPort, hardware integration
- `database` - SQLite, Sequelize, migrations, queries
- `architecture` - Design patterns, structural decisions
- `debug` - Error solutions, troubleshooting, workarounds
- `workflow` - Process improvements, automation
- `frontend` - React, Electron, UI components
- `backend` - Node.js, APIs, services

## Implementation

You are implementing the Knowledge Category system that replaces the =kcategory command workflow.

### Step 1: Parse Category
Extract and validate category from arguments.

### Step 2: Category Validation
Ensure category is one of valid categories:
- Map category to appropriate label: `knowledge-[category]`
- Validate category exists in system

### Step 3: Fetch Category Knowledge
Query issues for specific category:
- `gh issue list --label "knowledge-[category]" --state all --sort created`
- Get all knowledge entries for the category
- Extract detailed information for each entry

### Step 4: Format Category Display
Display category-specific knowledge:
```
📚 [Category] Knowledge (KNOW-[CATEGORY]-XXX)

📊 Total Entries: [entry-count]
🕐 Last Updated: [most-recent-date]

📝 Knowledge Entries:

1. KNOW-[CATEGORY]-001: [Title](link)
   📅 Created: [date-time] ago
   🏷️  Status: [status/verification]
   📄 Brief: [one-line description]

2. KNOW-[CATEGORY]-002: [Title](link)
   📅 Created: [date-time] ago
   🏷️  Status: [status/verification]
   📄 Brief: [one-line description]

[N entries continue...]

💡 Available Commands:
- /khub - Complete knowledge overview
- /ksearch "[query]" - Search this category
- /kupdate [category] "[topic]" - Add new knowledge
- /krecent - Recent updates across all categories
```

### Critical Rules (from original =kcategory)
- **Category-specific filtering** for targeted knowledge
- **Complete entry listing** for the category
- **Entry metadata** with creation dates and status
- **Navigation commands** for related actions
- **Category validation** with clear error messages

### Error Handling
- Validate category argument is provided
- Check category is one of valid categories
- Handle empty categories gracefully
- Process GitHub API errors
- Provide suggestions for similar categories

Execute the category knowledge display workflow and maintain the exact same functionality as the original =kcategory command system.