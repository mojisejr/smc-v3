---
description: Show last 5 knowledge updates across all categories
category: knowledge
argument-hint: (no arguments)
allowed-tools: Bash,Read
---

# Knowledge Recent System (/krecent)

**Transformed from =krecent command**

## Usage
```bash
/krecent
```
Shows the last 5 knowledge entries created across all categories with creation timestamps.

## Implementation

You are implementing the Knowledge Recent system that replaces the =krecent command workflow.

### Step 1: Fetch Recent Knowledge
Query recent issues with knowledge labels:
- `gh issue list --label "knowledge-*" --limit 10 --state all --sort created`
- Filter to knowledge-related labels only
- Get creation timestamps and metadata

### Step 2: Process and Sort
Sort by creation date (most recent first):
- Extract issue numbers, titles, labels
- Parse creation dates
- Format entry metadata
- Limit to 5 most recent entries

### Step 3: Output Format
Display recent knowledge entries:
```
📝 Recent Knowledge Updates (Last 5 Entries)

1. KNOW-DEVICE-003: [Title](link) - [category]
   📅 Created: [date-time] ago
   🏷️  Labels: [relevant-labels]

2. KNOW-DATABASE-001: [Title](link) - [category]
   📅 Created: [date-time] ago
   🏷️  Labels: [relevant-labels]

3. KNOW-DEBUG-002: [Title](link) - [category]
   📅 Created: [date-time] ago
   🏷️  Labels: [relevant-labels]

4. KNOW-WORKFLOW-001: [Title](link) - [category]
   📅 Created: [date-time] ago
   🏷️  Labels: [relevant-labels]

5. KNOW-ARCHITECTURE-001: [Title](link) - [category]
   📅 Created: [date-time] ago
   🏷️  Labels: [relevant-labels]

💡 View Commands:
- /khub - Complete knowledge overview
- /kcategory [category] - Category-specific knowledge
- /ksearch "[query]" - Search all knowledge
```

### Critical Rules (from original =krecent)
- **Show last 5 entries** exactly
- **Chronological ordering** by creation date
- **Category identification** for each entry
- **Creation timestamps** with relative time
- **Quick access commands** for further exploration

Execute the recent knowledge display workflow and maintain the exact same functionality as the original =krecent command system.