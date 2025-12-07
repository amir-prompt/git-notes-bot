# Git Notes Bot

A GitHub Action that reads [git notes](https://git-scm.com/docs/git-notes) from commits in a pull request and posts them as beautifully formatted PR comments with rich visualizations.

## Table of Contents

- [What are Git Notes?](#what-are-git-notes)
- [Features](#features)
- [Quick Start](#quick-start)
- [Usage](#usage)
- [Git AI / Cursor Integration](#git-ai--cursor-integration)
- [Pushing Git Notes to Remote](#pushing-git-notes-to-remote)
- [AI Authorship Dashboard](#ai-authorship-dashboard-new-)
- [Example Output](#example-output)
- [Troubleshooting](#troubleshooting)
- [How It Works](#how-it-works)
- [Advanced Configuration](#advanced-configuration)
- [Development](#development)
- [Contributing](#contributing)

## What are Git Notes?

Git notes are metadata attached to commits without modifying the commit itself. They're useful for:
- **AI authorship tracking** - Perfect for [Git AI](https://usegitai.com/) / [Cursor](https://cursor.sh/) workflows
- Adding review information after the fact
- Attaching test results or code coverage data
- Any supplementary information about commits

## Features

- 📊 **Visual Dashboard** - Beautiful summary card with aggregate PR statistics  
- 🌐 **Repository Dashboard** - Generate comprehensive HTML dashboards with analytics across all commits
- 🎨 **Rich Visualizations** - Progress bars, pie charts, and sparklines for quick insights
- 📅 **Timeline View** - Visual commit timeline for multi-commit PRs
- 👥 **Authorship Graphics** - Side-by-side AI vs human contribution breakdown with icons
- 📈 **Enhanced Tables** - Color-coded impact metrics and change patterns
- 🔄 **Smart Updates** - Updates existing comments instead of creating duplicates
- 🤖 **Git AI Compatible** - Automatically parses and displays Git AI authorship data
- ⏱️ **Duration Tracking** - Shows time from first change to commit
- 💬 **Conversation History** - Displays full AI conversation with collapsible details
- 🔗 **Inline PR Comments** - Mark AI-modified files directly in the diff view with links to prompts

## Quick Start

1. **Add the GitHub Action** to `.github/workflows/git-notes-comment.yml`
2. **Use Git AI / Cursor** for automatic note creation, or add notes manually
3. **Push notes to remote** (run `./setup-auto-push-notes.sh` for automatic syncing)
4. **Open a PR** - The bot automatically posts beautiful AI authorship reports!

## Usage

### Basic Setup

Add this workflow to your repository at `.github/workflows/git-notes-comment.yml`:

```yaml
name: Post Git Notes to PR

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  post-notes:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Fetch git notes
        run: |
          git fetch origin 'refs/notes/*:refs/notes/*' || true

      - name: Post Git Notes
        uses: amir-prompt/git-notes-bot@main
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

### Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `github-token` | GitHub token for API access | Yes | - |
| `notes-ref` | Git notes ref to read from | No | `refs/notes/commits` |
| `update-existing` | Update existing comment instead of creating new | No | `true` |
| `add-inline-comments` | Add inline comments to AI-modified files in PR diff | No | `false` |

### Outputs

| Output | Description |
|--------|-------------|
| `notes-found` | Whether any git notes were found (`true`/`false`) |
| `notes-count` | Number of commits with git notes |

## Git AI / Cursor Integration

This action works seamlessly with [Git AI](https://usegitai.com/) and [Cursor](https://cursor.sh/) (including Cursor Composer). When you use these tools:

1. **Automatic Note Creation** - Git AI automatically creates git notes with detailed authorship data for every commit
2. **Rich Metadata** - Captures AI model, conversation history, code changes, timestamps, and file modifications
3. **Visual Reports** - This action parses the notes and displays beautiful visualizations on your PRs
4. **Zero Configuration** - Works out of the box with Cursor's default settings

Simply commit with Cursor/Git AI, push your notes, and open a PR - the bot handles the rest!

> **Tip**: The visual authorship bars and statistics you see in your Cursor terminal are automatically captured and displayed on GitHub PRs.

## Inline PR Comments (NEW! 🔗)

Mark AI-modified files **directly in your PR's diff view** with inline comments that show:
- 🤖 AI contribution percentage for each file
- 💬 The original prompt that created the changes
- 📊 Acceptance statistics (accepted vs suggested lines)
- 🔗 Clickable links to full conversation details

### Enable Inline Comments

Add to your workflow:

```yaml
- name: Post Git Notes
  uses: amir-prompt/git-notes-bot@main
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    add-inline-comments: true  # 👈 Enable inline file markers
```

This creates review comments on AI-modified files in the "Files changed" tab, making it easy for reviewers to see which files had AI assistance and jump directly to the prompts that created them.

> 📖 **[See detailed documentation →](INLINE-COMMENTS.md)**

## Pushing Git Notes to Remote

⚠️ **Important**: By default, `git push` does not push notes. This causes a common issue where:
- Your local terminal shows one authorship percentage (e.g., 90% AI)
- GitHub PR comments show a different percentage (e.g., 100% AI)

### Automated Solution (Recommended)

Run the setup script to automatically push notes with every push:

```bash
./setup-auto-push-notes.sh
```

This installs a git hook that keeps GitHub in sync automatically!

### Manual Push

If you prefer to push notes manually:

```bash
# Push notes to remote
git push origin refs/notes/commits

# Or configure git to always push notes
git config --add remote.origin.push refs/notes/commits

# For custom note refs (e.g., refs/notes/ai)
git push origin refs/notes/ai
```

## AI Authorship Dashboard (NEW! 🌐)

Generate beautiful, interactive HTML dashboards with **comprehensive analytics** across your entire repository!

### ✨ Dashboard Features

- **📈 Timeline Charts** - Visualize AI contribution trends over time
- **🧠 Model Analytics** - Compare different AI models (GPT-4, Claude, etc.)
- **👥 Team Statistics** - See how each developer uses AI assistance
- **📁 File Insights** - Identify most AI-modified files
- **🎯 Acceptance Rates** - Track AI code acceptance over time
- **🔧 Tool Distribution** - Usage stats for Cursor, Git AI, etc.
- **📊 Interactive Charts** - Powered by Chart.js
- **📱 Responsive Design** - Works on all devices

### 🚀 Quick Start

**Generate locally:**
```bash
# Simple command
npm run dashboard

# Or with options
npx ts-node generate-dashboard.ts --since "6 months ago"
```

**Deploy to GitHub Pages:**
```bash
# Automatic weekly updates + manual trigger
# Just enable GitHub Pages in your repo settings!
# The workflow is already configured in .github/workflows/
```

**View your dashboard:**
```
https://<username>.github.io/<repository>/ai-dashboard.html
```

### 📋 Dashboard CLI Options

```bash
npx ts-node generate-dashboard.ts [options]

Options:
  -o, --output <file>       Output HTML file (default: ai-dashboard.html)
  -n, --notes-ref <ref>     Git notes ref (default: refs/notes/commits)
  -s, --since <date>        Only commits since date (e.g., "6 months ago")
  -r, --repo-name <name>    Repository name for display
  -h, --help                Show help
```

### 🌟 Usage Examples

```bash
# Last 3 months only
npm run dashboard -- --since "3 months ago"

# Custom output and name
./generate-dashboard.sh -o report.html -r "My Project"

# Specific time range
npx ts-node generate-dashboard.ts -s "2024-01-01" -o 2024-report.html
```

### 🤖 Automatic GitHub Pages Deployment

The repository includes workflows for automatic dashboard generation:

1. **Weekly Updates** - Runs every Sunday
2. **Push to Main** - Updates on every main branch push
3. **Manual Trigger** - Run anytime from Actions tab
4. **PR Previews** - Generates preview dashboards for pull requests

**Setup:**
1. Go to Settings → Pages
2. Set Source to "Deploy from a branch"
3. Select `gh-pages` branch
4. Done! Dashboard updates automatically

> 📖 **[See full dashboard documentation →](DASHBOARD-GUIDE.md)**

## Example Output

When the action finds AI authorship notes, it posts a beautifully formatted comment with rich visualizations:

### 🤖 AI Authorship Report

```
╔═══════════════════════════════════════════════════════════╗
║                    PR STATISTICS                          ║
╠═══════════════════════════════════════════════════════════╣
║  📝 Commits: 3          📁 Files: 12                      ║
║  ➕ Added: 245          ➖ Removed: 89                     ║
║  ✅ Accepted: 196       🔄 Modified: 49                    ║
╠═══════════════════════════════════════════════════════════╣
║            🤖 AI Contribution: 80%                        ║
║            [████████████████░░░░░░░░░░░░░░] 80%          ║
╚═══════════════════════════════════════════════════════════╝
```

### 📅 Commit Timeline
```
├─ 📝 abc1234
│
├─ 📝 def5678
│
└─ 📝 ghi9012
```

### 📝 Commit `abc1234`

**📁 Files Modified**
- `src/index.ts`
- `src/utils.ts`

**⏱️ Commit Duration**
**2m 45s** (from first change to commit)

**🤖 AI Assistant**
- **Tool:** cursor
- **Model:** claude-sonnet-4
- **Human Author:** yourname

**👥 Authorship**

| You vs AI | Visual Breakdown |
|-----------|------------------|
| `┌────────────────────────────────────────┐` | **Visual Breakdown** |
| `│  you  ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ai  │` | 🤖 AI: ▓▓▓▓▓▓▓▓░░ |
| `│       20%                          80%       │` | 👤 You: ▓▓░░░░░░░░ |
| `├────────────────────────────────────────┤` | |
| `│   🔵 80% AI code accepted                   │` | |
| `└────────────────────────────────────────┘` | |

**📊 Code Changes**

| Metric | Count | Visualization | Impact |
|--------|-------|---------------|--------|
| ➕ Additions | **45** | [████████████████░░░░] 75% | 🟢 75% |
| ➖ Deletions | **15** | [██████░░░░░░░░░░░░░░] 25% | 🔴 25% |
| ✅ Accepted | **36** | [████████████████░░░░] 80% | 💚 80% |
| 🔄 Overridden | **9** | [████░░░░░░░░░░░░░░░░] 20% | 🟡 20% |

**Change Pattern:** `▁▃▅` (deletions → accepted → modified)

**💬 Conversation**
- 👤 User messages: 3
- 🤖 Assistant messages: 5
- 🔧 Tool uses: 12

<details>
<summary>View full conversation</summary>
  
(Full conversation history with timestamps)
</details>

---
*Posted by git-notes-bot*

## Troubleshooting

### No comment appears on PR

1. **Check that notes were pushed:**
   ```bash
   git log --show-notes=refs/notes/commits
   ```
   
2. **Verify the action ran:** Check the "Actions" or "Checks" tab on your PR

3. **Check permissions:** Ensure the workflow has `pull-requests: write` permission

4. **Verify note ref:** Make sure `notes-ref` in your workflow matches where your notes are stored

### Different percentages locally vs GitHub

This happens when notes aren't pushed. Solutions:
- **Automatic (Recommended)**: Run `./setup-auto-push-notes.sh` to set up auto-push
- **Manual**: Always run `git push origin refs/notes/commits` after pushing commits

### Notes not updating

If the workflow uses `update-existing: true` (default), it updates the same comment. To force a new comment, temporarily set it to `false` or delete the existing comment.

## How It Works

1. **Fetch Notes**: The action fetches git notes from the configured ref (e.g., `refs/notes/commits`)
2. **Parse Data**: Reads notes for commits in the PR range (base...head)
3. **Smart Formatting**: 
   - Detects Git AI JSON format and creates rich visualizations
   - Falls back to plain text formatting for simple notes
4. **Comment Management**: Creates or updates a single PR comment with all findings

## Advanced Configuration

### Custom Note Format

While optimized for Git AI, the action supports any git note format:
- **Git AI format**: Full rich visualization with statistics
- **Plain text**: Displays in code blocks
- **Custom JSON**: Parsed as plain text (unless it matches Git AI schema)

### Workflow Examples

**Multiple note refs in one comment:**
```yaml
- name: Fetch all note refs
  run: |
    git fetch origin 'refs/notes/*:refs/notes/*' || true

- name: Post AI Notes
  uses: amir-prompt/git-notes-bot@main
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    notes-ref: refs/notes/commits

- name: Post Review Notes  
  uses: amir-prompt/git-notes-bot@main
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    notes-ref: refs/notes/review
    update-existing: false  # Creates separate comments
```

## Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# The compiled output goes to dist/
```

### Project Structure
```
src/
  ├── index.ts        # Main action logic, formatting, PR comments
  ├── git-notes.ts    # Git notes fetching and parsing
dist/                 # Compiled JavaScript (committed for GitHub Actions)
```

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with a sample repository
5. Submit a pull request

## License

MIT
