# Git Notes Bot

A GitHub Action that reads [git notes](https://git-scm.com/docs/git-notes) from commits in a pull request and posts them as a PR comment.

## What are Git Notes?

Git notes are metadata attached to commits without modifying the commit itself. They're useful for:
- Adding review information after the fact
- Storing AI authorship data (like [Git AI](https://usegitai.com/))
- Attaching test results or code coverage data
- Any supplementary information about commits

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

### Outputs

| Output | Description |
|--------|-------------|
| `notes-found` | Whether any git notes were found (`true`/`false`) |
| `notes-count` | Number of commits with git notes |

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
```

## Example Output

When the action finds git notes, it posts a comment like:

> ## 📝 Git Notes
>
> *Notes from `refs/notes/commits`*
>
> ### Commit `abc1234`
>
> ```
> Your note content here
> ```
>
> ---
> *Posted by git-notes-bot*

## Development

```bash
# Install dependencies
npm install

# Build
npm run build
```

## License

MIT
