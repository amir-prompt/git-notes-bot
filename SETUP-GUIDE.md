# Git Notes Bot - Repository Setup Guide

This guide explains how to set up git-notes-bot to work on a specific repository.

## Prerequisites

- GitHub repository with Actions enabled
- Git 2.7.0 or higher
- Node.js 18+ (for local development/dashboard generation)

## Quick Setup

### Step 1: Add the GitHub Action Workflow

Create `.github/workflows/git-notes-comment.yml` in your repository:

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
          fetch-depth: 0  # Required for full git history

      - name: Fetch git notes
        run: |
          git fetch origin 'refs/notes/*:refs/notes/*' || true

      - name: Post Git Notes
        uses: amir-prompt/git-notes-bot@main
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

### Step 2: Set Up Auto-Push for Git Notes

Git notes don't push automatically with regular `git push`. Run this script in your repository to install a post-push hook:

```bash
curl -sSL https://raw.githubusercontent.com/amir-prompt/git-notes-bot/main/setup-auto-push-notes.sh | bash
```

Or manually add to `.git/hooks/post-push`:

```bash
#!/bin/bash
git push origin refs/notes/commits 2>/dev/null || true
```

### Step 3: Commit and Push

That's it! Now when you:
1. Make commits with Git AI or Cursor (which create git notes automatically)
2. Push your branch
3. Open a Pull Request

The bot will automatically post a formatted comment with AI authorship statistics.

## Configuration Options

| Input | Description | Default |
|-------|-------------|---------|
| `github-token` | GitHub token for API access | Required |
| `notes-ref` | Git notes namespace | `refs/notes/commits` |
| `update-existing` | Update existing comment instead of creating new | `true` |
| `add-inline-comments` | Add inline comments on AI-modified files | `false` |
| `dashboard-url` | Custom dashboard URL | Auto-generated |

### Example with All Options

```yaml
- name: Post Git Notes
  uses: amir-prompt/git-notes-bot@main
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    notes-ref: 'refs/notes/commits'
    update-existing: 'true'
    add-inline-comments: 'true'
    dashboard-url: 'https://myorg.github.io/myrepo/ai-dashboard.html'
```

## Optional: Dashboard Generation

To generate an HTML dashboard with AI contribution analytics, add a second workflow:

Create `.github/workflows/generate-dashboard.yml`:

```yaml
name: Generate AI Dashboard

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 0 * * 0'  # Weekly on Sunday
  workflow_dispatch:

permissions:
  contents: write

jobs:
  generate-dashboard:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Fetch all git notes
        run: |
          git fetch origin 'refs/notes/*:refs/notes/*' || true

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Generate dashboard
        run: |
          npx ts-node https://raw.githubusercontent.com/amir-prompt/git-notes-bot/main/generate-dashboard.ts

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: .
          publish_branch: gh-pages
```

Then enable GitHub Pages in your repository settings (Settings → Pages → Source: `gh-pages` branch).

## Manual Git Notes

If you're not using Git AI or Cursor, you can manually add notes:

```bash
# Add a note to the current commit
git notes add -m '{"ai_percentage": 75, "description": "AI helped write this feature"}'

# Push notes to GitHub
git push origin refs/notes/commits
```

## Troubleshooting

### No comment appears on PR

1. Check that the workflow has `pull-requests: write` permission
2. Verify the "Fetch git notes" step completed successfully
3. Ensure commits in the PR have git notes attached

### Git notes not syncing

Run the auto-push setup script again:
```bash
./setup-auto-push-notes.sh
```

Or manually push notes:
```bash
git push origin refs/notes/commits
```

### Different percentages locally vs GitHub

This happens when notes aren't pushed. Either:
- Use the auto-push hook (recommended)
- Remember to push notes after each regular push

## How It Works

1. Git AI/Cursor creates git notes on each commit with AI authorship metadata
2. When you push, the auto-push hook syncs notes to GitHub
3. When a PR is opened/updated, the GitHub Action:
   - Fetches all git notes
   - Parses AI contribution data from notes
   - Generates a formatted comment with statistics and visualizations
   - Posts or updates the PR comment

## Further Reading

- [README.md](./README.md) - Full feature documentation
- [AI-NOTES-GUIDE.md](./AI-NOTES-GUIDE.md) - Detailed integration guide
- [DASHBOARD-GUIDE.md](./DASHBOARD-GUIDE.md) - Dashboard documentation
