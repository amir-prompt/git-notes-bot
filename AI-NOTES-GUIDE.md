# Git AI Notes Integration Guide

This guide explains how to track and display AI participation in your commits on GitHub using git notes.

## Overview

The system works in 3 steps:
1. **Local**: AI participation data is stored as git notes (automatically by Git AI/Cursor, or manually)
2. **Push**: Push git notes to GitHub alongside your commits  
3. **GitHub**: The GitHub Action automatically displays notes as beautiful visualizations on Pull Requests

## Supported Workflows

- **Git AI / Cursor (Automatic)**: Git AI automatically creates rich notes with authorship data
- **Manual**: Use the provided scripts to add custom AI participation notes
- **Mixed**: Combine both approaches as needed

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

### Method 1: Automatic (Git AI / Cursor)

**Recommended**: Use Git AI or Cursor which automatically creates rich git notes:

```bash
# Just commit normally with Cursor/Git AI:
git add .
git commit -m "your message"
# Git AI automatically creates detailed notes

# Push both commits and notes:
git push origin your-branch
git push origin refs/notes/commits  # Default ref used by Git AI
```

> **Note**: Git AI uses `refs/notes/commits` by default. Make sure your GitHub Action is configured to use the same ref.

### Method 2: Manual (Using Script)

Add notes manually after committing (useful for custom AI tracking):

```bash
# Make a commit
git commit -m "your message"

# Add AI note with percentage
./add-ai-note.sh HEAD 85 "AI wrote the tests"

# Or for a specific commit
./add-ai-note.sh abc1234 100 "Fully AI generated"

# Push notes (use the ref configured in your GitHub Action)
git push origin refs/notes/commits
```

> **Note**: Manual notes are simpler than Git AI notes and won't include conversation history or detailed statistics.

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
git push origin refs/notes/commits
```

## Viewing Notes

### Locally
```bash
# View notes for current commit
git notes --ref=refs/notes/commits show

# View notes for specific commit  
git notes --ref=refs/notes/commits show <commit-sha>

# View all notes
git log --show-notes=refs/notes/commits

# Or use default ref (if Git AI is using commits)
git notes show
```

### On GitHub

Once you push notes and create a Pull Request, the GitHub Action will:
1. Fetch all git notes
2. Find commits with notes in the PR
3. Post/update a comment showing beautifully formatted AI participation data

**For Git AI notes**, the comment includes:
- 📁 Files modified
- ⏱️ Commit duration  
- 🤖 AI assistant info (tool, model, author)
- 👥 Visual authorship bar (AI vs human)
- 📊 Detailed code statistics
- 💬 Full conversation history (collapsible)

**For manual notes**, it displays:
```
📝 Git Notes

Notes from `refs/notes/commits`

### Commit `72b0531`

AI Participation: 90%
AI refactored the code

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

1. **Make sure you pushed the notes:**
   ```bash
   git push origin refs/notes/commits
   ```

2. **Check if notes exist locally:**
   ```bash
   git notes --ref=refs/notes/commits list
   ```

3. **Verify the GitHub Action ran** - Check the PR "Checks" tab

4. **Verify the notes ref matches** - Ensure your GitHub Action workflow uses the same ref as your local notes (e.g., `refs/notes/commits`)

### Fetch notes from GitHub

If someone else added notes or to sync with remote:

```bash
git fetch origin 'refs/notes/*:refs/notes/*'
# Or for a specific ref:
git fetch origin refs/notes/commits:refs/notes/commits
```

### Delete a note

```bash
git notes --ref=refs/notes/commits remove <commit-sha>
git push origin refs/notes/commits --force
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

### With Git AI / Cursor (Recommended)
```bash
# 1. Make changes with AI assistance in Cursor
git add .
git commit -m "Add feature X"  # Git AI adds notes automatically

# 2. Push everything (use auto-push setup for convenience)
git push origin your-branch
git push origin refs/notes/commits

# 3. Create PR on GitHub
# The bot automatically comments with beautiful AI participation visualizations!
```

### With Manual Notes
```bash
# 1. Make changes and commit
git commit -m "Add feature X"

# 2. Add note manually
./add-ai-note.sh HEAD 75 "AI helped with implementation"

# 3. Push everything
git push origin your-branch
git push origin refs/notes/commits

# 4. Create PR on GitHub
```

## Configuration

Your workflow is configured in `.github/workflows/git-notes-comment.yml`:

```yaml
- name: Post Git Notes
  uses: amir-prompt/git-notes-bot@main
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    notes-ref: refs/notes/commits  # Must match your local notes ref
    update-existing: true  # Updates existing comments on new pushes
```

### Multiple Note Namespaces

You can create multiple note refs for different purposes:
- `refs/notes/commits` - Default for Git AI
- `refs/notes/ai` - Custom AI tracking
- `refs/notes/review` - Code review notes
- `refs/notes/testing` - Test coverage data

Create separate workflows for each ref or configure different jobs!

