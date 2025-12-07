# 📊 Dashboard Quick Reference

## 🚀 Most Common Commands

```bash
# Generate dashboard (simplest)
npm run dashboard

# Last 6 months
npm run dashboard -- --since "6 months ago"

# Custom output file
npx ts-node generate-dashboard.ts -o my-report.html

# With shell script
./generate-dashboard.sh -s "3 months ago" -o report.html
```

## 📋 All CLI Options

| Option | Short | Example |
|--------|-------|---------|
| `--output` | `-o` | `-o report.html` |
| `--notes-ref` | `-n` | `-n refs/notes/ai` |
| `--since` | `-s` | `-s "6 months ago"` |
| `--repo-name` | `-r` | `-r "My Project"` |
| `--help` | `-h` | `-h` |

## 📅 Time Range Examples

```bash
--since "24 hours ago"
--since "1 week ago"
--since "1 month ago"
--since "6 months ago"
--since "1 year ago"
--since "2024-01-01"
--since "2024-06-15 12:00:00"
```

## 🌐 GitHub Pages Setup

```bash
# 1. Enable in Settings → Pages
#    Source: gh-pages branch

# 2. View at:
https://<username>.github.io/<repo>/ai-dashboard.html

# 3. Runs automatically:
#    - Weekly (Sundays)
#    - On push to main
#    - Manual from Actions tab
```

## 🔧 Troubleshooting

```bash
# Check for git notes
git log --show-notes -5

# Fetch notes from remote
git fetch origin 'refs/notes/*:refs/notes/*'

# Make script executable
chmod +x generate-dashboard.sh

# Rebuild TypeScript
npm run build
```

## 📊 What You Get

- **Timeline charts**: Activity over time
- **Model stats**: Which AI models used
- **Tool breakdown**: Cursor, Git AI usage
- **File insights**: Most modified files
- **Author stats**: Team AI usage
- **Acceptance rates**: Quality metrics

## 💡 Quick Tips

```bash
# Monthly report
npm run dashboard -- -s "1 month ago" -o monthly.html

# Compare quarters
for q in Q1 Q2 Q3 Q4; do
  npx ts-node generate-dashboard.ts -o "$q-2024.html" -r "$q 2024"
done

# Open after generation
npm run dashboard && open ai-dashboard.html
```

## 📚 Documentation

- 🚀 [Quick Start](DASHBOARD-QUICKSTART.md) - 3 steps
- 📖 [Full Guide](DASHBOARD-GUIDE.md) - Complete docs
- 💡 [Examples](example-dashboard-usage.md) - Use cases
- 🔧 [Implementation](DASHBOARD-IMPLEMENTATION.md) - Technical
- 🎉 [Summary](NEW-FEATURES-SUMMARY.md) - Overview

## ⚡ One-Liners

```bash
# Today's activity
npm run dashboard -- -s "24 hours ago"

# This week
npm run dashboard -- -s "1 week ago"

# This year
npm run dashboard -- -s "2024-01-01"

# All time (no --since)
npm run dashboard
```

