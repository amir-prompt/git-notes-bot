# 🚀 Dashboard Quick Start

Generate beautiful AI authorship analytics in 3 steps!

## Step 1: Generate Dashboard Locally

```bash
npm run dashboard
```

That's it! The dashboard will open in your browser automatically.

## Step 2: View the Dashboard

Open `ai-dashboard.html` in your browser to see:
- 📊 Commit activity timeline
- 🤖 AI vs Human contribution breakdown
- 🧠 AI model usage statistics
- 📁 Most modified files
- 👥 Team member AI usage
- 🎯 Acceptance rate trends

## Step 3: Deploy to GitHub Pages (Optional)

### Enable GitHub Pages:
1. Go to your repo Settings → Pages
2. Source: "Deploy from a branch"
3. Branch: `gh-pages`
4. Save

### Your dashboard will be live at:
```
https://<your-username>.github.io/<repo-name>/ai-dashboard.html
```

Updates automatically weekly and on every push to main!

---

## 🎨 Common Use Cases

### Last 30 Days Only
```bash
npm run dashboard -- --since "30 days ago"
```

### Generate Monthly Reports
```bash
npx ts-node generate-dashboard.ts \
  --output "reports/january-2024.html" \
  --since "2024-01-01" \
  --repo-name "My Project - January 2024"
```

### Different Notes Reference
```bash
npm run dashboard -- --notes-ref refs/notes/ai
```

---

## 📖 Need More?

- **Full Guide:** [DASHBOARD-GUIDE.md](DASHBOARD-GUIDE.md)
- **Main README:** [README.md](README.md)
- **AI Notes Help:** [AI-NOTES-GUIDE.md](AI-NOTES-GUIDE.md)

## 🐛 Troubleshooting

**No data found?**
```bash
# Check if you have git notes
git log --show-notes -5

# Fetch from remote
git fetch origin 'refs/notes/*:refs/notes/*'
```

**Permission errors?**
```bash
# Make sure script is executable
chmod +x generate-dashboard.sh
```

---

**Questions?** Check the [full documentation](DASHBOARD-GUIDE.md) or open an issue!

