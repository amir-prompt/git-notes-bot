# 📊 Dashboard Usage Examples

Real-world examples of how to use the AI Authorship Dashboard.

## 🎯 Use Case 1: Monthly Team Report

Generate a monthly report for team retrospectives:

```bash
#!/bin/bash
# monthly-report.sh

MONTH=$(date +%Y-%m)
OUTPUT="reports/ai-report-${MONTH}.html"

npx ts-node generate-dashboard.ts \
  --output "$OUTPUT" \
  --since "1 month ago" \
  --repo-name "Team Report - ${MONTH}"

echo "Report generated: $OUTPUT"
open "$OUTPUT"
```

## 🎯 Use Case 2: Quarterly Analysis

Compare AI usage across quarters:

```bash
# Q1 2024
npx ts-node generate-dashboard.ts \
  -o reports/2024-Q1.html \
  -s "2024-01-01" \
  -r "Q1 2024 Analysis"

# Q2 2024
npx ts-node generate-dashboard.ts \
  -o reports/2024-Q2.html \
  -s "2024-04-01" \
  -r "Q2 2024 Analysis"
```

## 🎯 Use Case 3: Per-Project Dashboards

For mono-repos with multiple projects:

```bash
# Fetch all notes first
git fetch origin 'refs/notes/*:refs/notes/*'

# Frontend project
npx ts-node generate-dashboard.ts \
  -o frontend-ai-stats.html \
  -r "Frontend - AI Statistics"

# Backend project  
npx ts-node generate-dashboard.ts \
  -o backend-ai-stats.html \
  -r "Backend - AI Statistics"
```

## 🎯 Use Case 4: AI Model Comparison

Track different AI models over time:

```bash
# Generate reports for different time periods
npx ts-node generate-dashboard.ts -o early-2024.html -s "2024-01-01"
npx ts-node generate-dashboard.ts -o mid-2024.html -s "2024-06-01"
npx ts-node generate-dashboard.ts -o late-2024.html -s "2024-09-01"
```

Then compare the "Model Usage" sections to see adoption trends.

## 🎯 Use Case 5: Onboarding New Developers

Show new team members how AI is used:

```bash
# Generate a comprehensive all-time dashboard
npx ts-node generate-dashboard.ts \
  -o team-ai-guide.html \
  -r "How We Use AI - Team Guide"
```

Share this with new hires to demonstrate:
- Which AI models the team prefers
- Common acceptance rates
- Files where AI is most useful
- Team members who are AI power users

## 🎯 Use Case 6: Code Review Insights

Before code review sessions:

```bash
# Last week's AI-assisted changes
npx ts-node generate-dashboard.ts \
  -o code-review-prep.html \
  -s "1 week ago" \
  -r "This Week's AI Changes"
```

Review the "Most Modified Files" and "Recent Commits" tables to prioritize review efforts.

## 🎯 Use Case 7: Continuous Integration

Add to your CI/CD pipeline:

```yaml
# .github/workflows/daily-ai-report.yml
name: Daily AI Report

on:
  schedule:
    - cron: '0 9 * * *'  # Every day at 9 AM

jobs:
  report:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - run: git fetch origin 'refs/notes/*:refs/notes/*'
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - run: npm ci
      - run: npm run build
      
      - name: Generate daily report
        run: |
          npx ts-node generate-dashboard.ts \
            -o daily-report.html \
            -s "24 hours ago" \
            -r "Daily AI Report"
      
      - name: Upload to S3/Cloud Storage
        run: |
          # Upload to your cloud storage
          aws s3 cp daily-report.html s3://your-bucket/reports/$(date +%Y-%m-%d).html
```

## 🎯 Use Case 8: Sprint Planning

At the start of each sprint:

```bash
# Previous sprint analysis
npx ts-node generate-dashboard.ts \
  -o sprint-12-results.html \
  -s "2 weeks ago" \
  -r "Sprint 12 - AI Usage"
```

Use this data to:
- Estimate AI-assisted velocity
- Plan which tasks benefit most from AI
- Set team AI usage goals

## 🎯 Use Case 9: Compliance & Auditing

For organizations that need AI usage tracking:

```bash
# Quarterly compliance report
QUARTER="Q4-2024"
npx ts-node generate-dashboard.ts \
  -o "compliance/ai-audit-${QUARTER}.html" \
  -s "2024-10-01" \
  -r "AI Usage Audit - ${QUARTER}"
```

Share with compliance teams to demonstrate:
- What percentage of code is AI-generated
- Which models are being used
- Human oversight metrics (acceptance rates)

## 🎯 Use Case 10: Public Portfolio

For open source projects showcasing AI adoption:

```bash
# Generate public-facing dashboard
npx ts-node generate-dashboard.ts \
  -o public/ai-transparency.html \
  -r "Our AI Development Journey"
```

Link from your website or README to show:
- Transparency in AI usage
- How AI accelerates development
- Balanced AI-human collaboration

---

## 💡 Pro Tips

### Automation Script

Create a wrapper script for common tasks:

```bash
#!/bin/bash
# ai-reports.sh

case $1 in
  daily)
    npx ts-node generate-dashboard.ts -s "24 hours ago" -o daily.html
    ;;
  weekly)
    npx ts-node generate-dashboard.ts -s "1 week ago" -o weekly.html
    ;;
  monthly)
    npx ts-node generate-dashboard.ts -s "1 month ago" -o monthly.html
    ;;
  all)
    npx ts-node generate-dashboard.ts -o all-time.html
    ;;
  *)
    echo "Usage: $0 {daily|weekly|monthly|all}"
    exit 1
    ;;
esac
```

### Scheduled Local Reports

Add to your crontab:

```bash
# Edit crontab
crontab -e

# Add weekly report generation (every Monday at 9 AM)
0 9 * * 1 cd /path/to/repo && npm run dashboard -- -o ~/reports/weekly-$(date +\%Y-\%m-\%d).html
```

### Compare Time Periods

```bash
# Generate multiple dashboards and compare
for month in {1..6}; do
  npx ts-node generate-dashboard.ts \
    -o "reports/2024-$(printf "%02d" $month).html" \
    -s "2024-$(printf "%02d" $month)-01" \
    -r "2024 Month $month"
done
```

---

## 🔗 Related Documentation

- [Dashboard Guide](DASHBOARD-GUIDE.md) - Complete documentation
- [Quick Start](DASHBOARD-QUICKSTART.md) - Get started in 3 steps
- [Main README](README.md) - Full project documentation

