# 📊 AI Authorship Dashboard Guide

The AI Authorship Dashboard provides comprehensive analytics and visualizations for AI code contributions across your repository.

## 🌟 Features

- **📈 Timeline Analytics** - Visualize AI contribution trends over time
- **🧠 Model Comparison** - Compare performance and usage of different AI models
- **👥 Team Statistics** - See how each developer uses AI assistance
- **📁 File Insights** - Identify files with the most AI modifications
- **🎯 Acceptance Rates** - Track how much AI-suggested code is accepted
- **🔧 Tool Distribution** - See which AI tools (Cursor, Git AI, etc.) are most used
- **📊 Beautiful Charts** - Interactive visualizations using Chart.js
- **📱 Responsive Design** - Works on desktop, tablet, and mobile

## 🚀 Quick Start

### Local Generation

Generate a dashboard for your repository:

```bash
# Using npm script (easiest)
npm run dashboard

# Using the shell script
./generate-dashboard.sh

# Using TypeScript directly
npx ts-node generate-dashboard.ts
```

The dashboard will be saved as `ai-dashboard.html` and automatically opened in your browser.

## 📋 CLI Options

### Basic Usage

```bash
npx ts-node generate-dashboard.ts [options]
```

### Available Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--output <file>` | `-o` | Output HTML file path | `ai-dashboard.html` |
| `--notes-ref <ref>` | `-n` | Git notes reference to read | `refs/notes/commits` |
| `--since <date>` | `-s` | Only include commits since date | All commits |
| `--repo-name <name>` | `-r` | Repository name for display | Auto-detected |
| `--help` | `-h` | Show help message | - |

### Examples

**Dashboard for last 6 months:**
```bash
npx ts-node generate-dashboard.ts --since "6 months ago"
```

**Custom output file and repository name:**
```bash
npx ts-node generate-dashboard.ts -o my-report.html -r "My Project"
```

**Different git notes reference:**
```bash
npx ts-node generate-dashboard.ts -n refs/notes/ai
```

**Combine multiple options:**
```bash
npx ts-node generate-dashboard.ts \
  -o team-report.html \
  -s "2024-01-01" \
  -r "MyProject" \
  -n refs/notes/commits
```

## 🤖 GitHub Actions Integration

### Automatic Weekly Dashboard

The dashboard can be automatically generated and deployed to GitHub Pages weekly.

#### Setup Steps

1. **Enable GitHub Pages** in your repository settings:
   - Go to Settings → Pages
   - Source: Deploy from a branch
   - Branch: `gh-pages` / `(root)`

2. **The workflow is already configured** in `.github/workflows/generate-dashboard.yml`

3. **Trigger options:**
   - Automatically runs every Sunday at midnight
   - Runs on every push to main branch
   - Can be manually triggered from Actions tab

4. **View your dashboard:**
   ```
   https://<username>.github.io/<repository>/ai-dashboard.html
   ```

### Manual Trigger

1. Go to your repository on GitHub
2. Click "Actions" tab
3. Select "Generate AI Dashboard" workflow
4. Click "Run workflow"
5. Optionally specify the time range (e.g., "6 months ago")

### PR Previews

When a PR is opened, a preview dashboard is automatically generated and uploaded as an artifact:

1. Open a Pull Request
2. Wait for "PR Dashboard Preview" workflow to complete
3. Download the artifact from the workflow run
4. Open the HTML file locally

## 📊 Dashboard Sections

### 1. Summary Cards

Quick overview of key metrics:
- Total AI-assisted commits
- Number of files modified with AI
- Total lines of code
- Overall AI contribution percentage

### 2. Timeline Charts

**Commit Activity Over Time:**
- Line chart showing commit frequency
- Helps identify AI usage patterns

**AI Acceptance Rate Timeline:**
- Shows how AI acceptance rates change over time
- Useful for tracking AI model improvements

### 3. Model & Tool Analytics

**Model Usage:**
- Doughnut chart of AI models used (Claude, GPT-4, etc.)
- Shows which models are most popular

**Tool Distribution:**
- Pie chart of tools used (Cursor, Git AI, etc.)
- Helps understand team's AI tooling preferences

### 4. Contribution Breakdown

**AI vs Human:**
- Bar chart comparing AI-generated vs human-written code
- Visual representation of collaboration balance

### 5. Data Tables

**Top AI Models:**
- Detailed statistics for each model
- Acceptance rates and commit counts

**Most Modified Files:**
- Files with highest AI modification frequency
- Useful for code review prioritization

**Author Statistics:**
- How each team member uses AI assistance
- Encourages best practice sharing

**Recent Activity:**
- List of recent AI-assisted commits
- Quick overview of latest work

## 🎨 Customization

### Branding

Edit `src/dashboard-html.ts` to customize:

```typescript
// Change colors
const chartColors = {
  primary: '#667eea',    // Your primary color
  secondary: '#764ba2',  // Your secondary color
  // ... more colors
};

// Modify title
<h1>🤖 Your Company AI Dashboard</h1>
```

### Time Ranges

Common time range formats:

```bash
--since "1 week ago"
--since "1 month ago"
--since "6 months ago"
--since "1 year ago"
--since "2024-01-01"
--since "2024-01-01 12:00:00"
```

### Additional Metrics

To add custom metrics, edit `src/dashboard.ts`:

```typescript
export interface DashboardData {
  // Add your custom metrics here
  customMetric: number;
  // ...
}
```

Then update the aggregation logic and HTML template.

## 🔧 Troubleshooting

### No Data Found

**Problem:** Dashboard shows "No commits with AI authorship data found"

**Solutions:**
1. Verify git notes exist:
   ```bash
   git log --show-notes=refs/notes/commits -5
   ```

2. Fetch notes from remote:
   ```bash
   git fetch origin 'refs/notes/*:refs/notes/*'
   ```

3. Check notes format - should be Git AI / Cursor JSON format

### GitHub Pages Not Working

**Problem:** Dashboard URL returns 404

**Solutions:**
1. Check GitHub Pages is enabled in Settings
2. Verify workflow ran successfully in Actions tab
3. Wait a few minutes for deployment to complete
4. Check `gh-pages` branch exists

### Permission Errors

**Problem:** Workflow fails with permission error

**Solutions:**
1. Ensure workflow has `contents: write` permission
2. Check `GITHUB_TOKEN` has necessary permissions
3. Verify branch protection rules allow bot commits

### TypeScript Errors

**Problem:** `ts-node` or TypeScript compilation fails

**Solutions:**
```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Try running compiled version
node dist/generate-dashboard.js
```

## 🌐 Sharing Dashboards

### Public Repositories

For public repos, the GitHub Pages dashboard is accessible to everyone:
```
https://<username>.github.io/<repository>/ai-dashboard.html
```

### Private Repositories

For private repos, you have several options:

1. **Artifacts:** Download from workflow runs and share HTML file
2. **GitHub Pages (private):** Available for GitHub Enterprise
3. **Self-hosting:** Deploy to your own web server
4. **Local viewing:** Generate and share the HTML file directly

### Embedding in Documentation

Add to your `README.md`:

```markdown
## 📊 AI Contribution Dashboard

View our real-time AI authorship statistics:
[AI Dashboard](https://username.github.io/repo/ai-dashboard.html)

Updated automatically every week!
```

## 📈 Best Practices

### Regular Monitoring

- Set up weekly dashboard generation
- Review trends in team meetings
- Track AI acceptance rates for quality insights
- Identify files that may need extra review

### Team Transparency

- Share dashboard link with your team
- Celebrate high AI efficiency
- Discuss patterns and improvements
- Use data to guide AI tool selection

### Code Review

- Use "Most Modified Files" to prioritize reviews
- Check acceptance rates for quality indicators
- Review commits with unusual AI percentages
- Track improvements over time

## 🤝 Integration with Other Tools

### Slack/Discord Notifications

Create a notification when dashboard updates:

```yaml
# Add to .github/workflows/generate-dashboard.yml
- name: Notify team
  run: |
    curl -X POST $WEBHOOK_URL \
      -H 'Content-Type: application/json' \
      -d '{"text":"📊 AI Dashboard updated! Check it out at https://..."}''
```

### Jira/Linear Integration

Export metrics for project management:

```typescript
// Custom script to export data
const data = await aggregateDashboardData();
const report = {
  date: new Date(),
  aiPercent: data.aiPercentage,
  commits: data.totalCommits
};
// Post to your PM tool API
```

## 📚 Additional Resources

- [Main README](README.md) - General bot documentation
- [AI Notes Guide](AI-NOTES-GUIDE.md) - How to use git notes
- [Chart.js Documentation](https://www.chartjs.org/) - Chart customization

## 💡 Tips

1. **Regular Updates:** Run dashboard generation on a schedule for trending data
2. **Combine with PR Comments:** Use both features for complete visibility
3. **Archive Dashboards:** Save monthly snapshots for historical comparison
4. **Team Education:** Use dashboard insights to train team on AI best practices
5. **Custom Metrics:** Extend the dashboard to track project-specific KPIs

## 🐛 Reporting Issues

Found a bug or have a feature request?

1. Check existing issues on GitHub
2. Provide:
   - Dashboard generation command used
   - Sample git notes (if possible)
   - Error messages or screenshots
   - Expected vs actual behavior

## 📝 License

Same as main project - MIT License

