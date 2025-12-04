# Git AI Notes Integration Guide

This guide explains how to track and display AI participation in your commits on GitHub.

## Overview

The system works in 3 steps:
1. **Local**: Store AI participation data as git notes after each commit
2. **Push**: Push git notes to GitHub alongside your commits
3. **GitHub**: The GitHub Action automatically displays notes on Pull Requests

## Quick Start

### ⚠️ Important: Syncing Notes to GitHub

**Git notes are stored locally and must be pushed to GitHub separately.**

If you don't push notes, you'll see different authorship percentages:
- **Local terminal**: Shows updated percentages (e.g., 90% AI)
- **GitHub PR**: Shows outdated percentages (e.g., 100% AI)

**Solution**: Run the auto-sync setup (recommended):
```bash
./setup-auto-push-notes.sh
```

This installs a git hook that automatically pushes notes whenever you `git push`, keeping GitHub in sync!

### Method 1: Automatic (Post-Commit Hook)

The post-commit hook will automatically add a note to every commit:

```bash
# Already set up! Just commit normally:
git add .
git commit -m "your message"
# Hook runs automatically and adds AI note

# Push both commits and notes:
git push origin your-branch
git push origin refs/notes/ai
```

### Method 2: Manual (Using Script)

Add notes manually after committing:

```bash
# Make a commit
git commit -m "your message"

# Add AI note with percentage
./add-ai-note.sh HEAD 85 "AI wrote the tests"

# Or for a specific commit
./add-ai-note.sh abc1234 100 "Fully AI generated"

# Push notes
git push origin refs/notes/ai
```

### Method 3: Add Notes to Past Commits

You can add notes to any existing commit:

```bash
# Find commit SHA you want to annotate
git log --oneline

# Add note to that commit
./add-ai-note.sh <commit-sha> <ai-percentage> "additional info"

# Example:
./add-ai-note.sh 72b0531 90 "AI refactored the code"

# Push notes
git push origin refs/notes/ai
```

## Viewing Notes

### Locally
```bash
# View notes for current commit
git notes --ref=refs/notes/ai show

# View notes for specific commit
git notes --ref=refs/notes/ai show <commit-sha>

# View all notes
git log --show-notes=refs/notes/ai
```

### On GitHub

Once you push notes and create a Pull Request, the GitHub Action will:
1. Fetch all git notes
2. Find commits with AI notes in the PR
3. Post/update a comment showing all AI participation data

The comment will look like:

```
📝 Git Notes

Notes from `refs/notes/ai`

### Commit `72b0531`

```
AI Participation: 90%
AI refactored the code
Timestamp: 2025-12-04 10:30:00 UTC
```

---
Posted by git-notes-bot
```

## Advanced Usage

### Custom AI Percentage Extraction

If you have a tool that outputs AI percentage, you can modify the post-commit hook:

```bash
# In .git/hooks/post-commit, replace the placeholder section with:
AI_PERCENTAGE=$(your-ai-tool --get-percentage)
AI_NOTE="AI Participation: ${AI_PERCENTAGE}%"
```

### Batch Add Notes

Add notes to multiple commits:

```bash
# For last 5 commits
for sha in $(git log -5 --format=%H); do
  ./add-ai-note.sh $sha 75 "Estimated AI contribution"
done

git push origin refs/notes/ai
```

### Update Existing Notes

The `-f` flag in the script forces update of existing notes:

```bash
./add-ai-note.sh abc1234 95 "Updated: AI fixed bugs"
```

## Troubleshooting

### Notes not showing on GitHub PR

1. Make sure you pushed the notes:
   ```bash
   git push origin refs/notes/ai
   ```

2. Check if notes exist locally:
   ```bash
   git notes --ref=refs/notes/ai list
   ```

3. Verify the GitHub Action ran (check PR "Checks" tab)

### Fetch notes from GitHub

If someone else added notes:

```bash
git fetch origin refs/notes/ai:refs/notes/ai
```

### Delete a note

```bash
git notes --ref=refs/notes/ai remove <commit-sha>
git push origin refs/notes/ai --force
```

## Integration with Cursor/VS Code

The terminal output you see:
```
you  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ai
     0%                                  100%
     100% AI code accepted | waited 13s for ai
```

Can be captured by enhancing the post-commit hook to parse this output from your terminal or shell history. This is editor-specific and may require custom scripting.

## Workflow Summary

```bash
# 1. Make changes with AI assistance
git add .
git commit -m "Add feature X"  # Post-commit hook adds note automatically

# 2. Push everything
git push origin your-branch
git push origin refs/notes/ai

# 3. Create PR on GitHub
# The bot automatically comments with AI participation stats!
```

## Configuration

Your workflow is configured in `.github/workflows/git-notes-comment.yml`:

- **notes-ref**: `refs/notes/ai` (where AI notes are stored)
- **update-existing**: `true` (updates existing comments on new pushes)

You can create multiple note namespaces:
- `refs/notes/ai` - AI participation
- `refs/notes/review` - Code review notes
- `refs/notes/performance` - Performance metrics

Just update the workflow to use different refs!

