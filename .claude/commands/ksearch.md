---
description: Search across all knowledge entries with full-text search
category: knowledge
argument-hint: "[query]"
allowed-tools: Bash,Read
---

# Knowledge Search System (/ksearch)

**Transformed from =ksearch command**

## Usage
```bash
/ksearch "[query]"
```
Performs full-text search across all knowledge entries and returns matching results.

## Implementation

You are implementing the Knowledge Search system that replaces the =ksearch command workflow.

### Step 1: Parse Query
Extract search query from quoted arguments.

### Step 2: Search Scope
Search across:
- Knowledge Hub #102 content
- All issues with `knowledge-*` labels
- Knowledge entry titles and descriptions
- Problem statements and solutions
- AI feedback and lessons learned

### Step 3: GitHub CLI Search
Use GitHub CLI search functionality:
- `gh issue list --search "[query]" --label "knowledge-device"`
- Repeat for all knowledge categories
- `gh search issues --repo [repo] "[query]" --label "knowledge-*"`

### Step 4: Result Processing
Process and rank search results:
- Title matches (highest priority)
- Description matches (medium priority)
- Body content matches (lower priority)
- Recent entries优先显示
- Category-organized results

### Step 5: Output Formatting
Display results in organized format:
```
🔍 Search Results for: "[query]"
📊 Found [result-count] matching knowledge entries

🏷️  By Category:

🔧 Device Knowledge:
- KNOW-DEVICE-001: [Matching Title](link) - [relevant excerpt]
- KNOW-DEVICE-003: [Matching Title](link) - [relevant excerpt]

🗄️ Database Knowledge:
- KNOW-DATABASE-002: [Matching Title](link) - [relevant excerpt]

🐛 Debug Knowledge:
- KNOW-DEBUG-001: [Matching Title](link) - [relevant excerpt]

💡 Search Tips:
- Use specific keywords for better results
- Try different category terms (device, database, etc.)
- Use /kcategory [category] to browse category knowledge
- Use /khub to see complete knowledge overview
```

### Critical Rules (from original =ksearch)
- **Full-text search** across all knowledge content
- **Category organization** of results
- **Relevance ranking** of matches
- **Search optimization** with keywords and tags
- **Clear excerpt** showing match context

### Error Handling
- Validate search query is provided
- Handle empty search results gracefully
- Process GitHub API rate limits
- Handle malformed search queries
- Provide search suggestions for no results

### Integration with Other Commands
This command works with:
- `/khub` - For browsing all knowledge
- `/kcategory` - For category-specific knowledge
- `/krecent` - For recent knowledge updates
- `/kupdate` - For creating knowledge from search insights

Execute the knowledge search workflow and maintain the exact same functionality as the original =ksearch command system.