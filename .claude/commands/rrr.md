---
description: Create daily retrospective GitHub Issue for team reflection
category: workflow
argument-hint: > [message]
allowed-tools: Bash,Read,Write
---

# Daily Retrospective System (/rrr)

**Transformed from =rrr command**

## Usage
```bash
/rrr > [message]
```
Creates daily retrospective GitHub Issue for team reflection and improvement.

## Implementation

You are implementing the Daily Retrospective system that replaces the =rrr command workflow.

### Step 1: Parse Arguments
Extract retrospective message from arguments (after `> `).

### Step 2: Date and Context Generation
Generate retrospective context:
- Current date: `date +"%Y-%m-%d"`
- Day of week and context
- Recent activity summary
- Team mood indicators

### Step 3: Retrospective Structure
Create structured retrospective content:

**Title Format:**
```
[DAILY] Retrospective - [YYYY-MM-DD] - [Day]
```

**Body Template:**
```markdown
## Daily Team Retrospective - [YYYY-MM-DD]

### 🌅 Day Overview
**Date**: [current-date]
**Day**: [day-of-week]
**Team Mood**: [positive/neutral/challenging]

### 📝 Today's Focus
[Message provided via > [message] argument]

### ✅ Accomplishments
- [Accomplishment 1]
- [Accomplishment 2]
- [Team wins and progress]

### 🚧 Challenges & Blockers
- [Challenge 1]
- [Challenge 2]
- [Blockers encountered]

### 💡 Insights & Learnings
- [Key insight 1]
- [Lesson learned 2]
- [Process improvements discovered]

### 🔧 Improvements for Tomorrow
- [Improvement 1]
- [Process change 2]
- [Action items for next day]

### 📊 Metrics & Data
- **Tasks Completed**: [number]
- **Issues Resolved**: [number]
- **PRs Merged**: [number]
- **Build Success Rate**: [percentage]
- **Code Quality Score**: [rating]

### 🙏 Team Appreciation
- [Team member 1] - [specific contribution]
- [Team member 2] - [specific contribution]
- [Collaboration highlights]

### 📅 Tomorrow's Priorities
1. [Priority 1]
2. [Priority 2]
3. [Priority 3]

### 🔄 Continuous Improvement
**What went well today?**
[Reflection on positive aspects]

**What could be better tomorrow?**
[Areas for improvement]

**Experiments to try:**
[New approaches or processes]

---

## 📋 Retrospective Guidelines

### Purpose
- Foster team reflection and continuous improvement
- Identify patterns and trends in workflow
- Celebrate wins and address challenges constructively
- Build team culture and communication

### Participation
- All team members encouraged to contribute
- Focus on constructive feedback and solutions
- Maintain psychological safety and trust
- Balance praise with actionable improvement areas

### Follow-up Actions
- Review retrospectives weekly for patterns
- Implement 1-2 improvement experiments per week
- Track improvement metrics over time
- Share learnings with broader team when relevant

---

**Created**: [timestamp]
**Format**: Daily retrospective for team alignment
**Frequency**: Daily at end of workday
🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

### Step 4: GitHub Issue Creation
Create retrospective issue:
```bash
gh issue create \
  --title "[DAILY] Retrospective - [date] - [day]" \
  --body "[retrospective-content]" \
  --label "daily-retrospective" \
  --label "team-alignment" \
  --label "continuous-improvement"
```

### Step 5: Output Format
```
✅ Daily Retrospective Created: #[issue-number]
📅 Date: [YYYY-MM-DD] ([day-of-week])
🌟 Focus: [message-from-argument]
🔗 URL: [github-issue-url]
🏷️  Labels: daily-retrospective, team-alignment, continuous-improvement

💡 Team Actions:
1. Add your accomplishments and challenges
2. Share insights and learnings
3. Contribute improvement ideas
4. Appreciate team members

📊 Retrospective Stats:
- Expected participation: [team-members]
- Estimated completion: [end-of-day]
- Follow-up: [next-retrospective-date]

🔄 Process: This supports continuous team improvement and alignment
```

### Critical Rules (from original =rrr)
- **ALWAYS creates GitHub Issues** - Never creates local .md files
- **NEVER creates local .md files** for retrospectives
- **Structured format** for consistent team reflection
- **Team-oriented content** for collaborative improvement
- **Actionable insights** with clear follow-up items
- **Psychological safety** maintained in all feedback

### Error Handling
- Validate retrospective message is provided
- Handle GitHub CLI authentication
- Process date formatting errors
- Provide clear error messages for creation failures
- Suggest alternative reflection methods if needed

### Integration with Other Commands
This command works with:
- `/kupdate` - For documenting workflow insights
- `/plan` - For planning improvements identified in retrospective
- `/impl` - For implementing process improvements

Execute the daily retrospective creation workflow and maintain the exact same functionality as the original =rrr command system.