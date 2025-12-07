import { DashboardData } from './dashboard';

/**
 * Generates a beautiful HTML dashboard with charts
 */
export function generateDashboardHTML(data: DashboardData, repoName?: string): string {
  const topModels = Array.from(data.modelUsage.values())
    .sort((a, b) => b.commits - a.commits)
    .slice(0, 5);
  
  const topFiles = Array.from(data.fileStats.values())
    .sort((a, b) => b.modifications - a.modifications)
    .slice(0, 10);
  
  const topAuthors = Array.from(data.authorStats.values())
    .sort((a, b) => b.commits - a.commits)
    .slice(0, 10);
  
  // Prepare chart data
  const timelineLabels = Array.from(data.commitsByDate.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(d => d.date);
  
  const timelineData = Array.from(data.commitsByDate.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(d => d.count);
  
  const aiPercentTimeline = Array.from(data.commitsByDate.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(d => d.aiPercent.toFixed(1));
  
  const modelLabels = topModels.map(m => m.model);
  const modelData = topModels.map(m => m.commits);
  const modelAcceptance = topModels.map(m => m.acceptanceRate.toFixed(1));
  
  const toolLabels = Array.from(data.toolUsage.values()).map(t => t.tool);
  const toolData = Array.from(data.toolUsage.values()).map(t => t.commits);
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Authorship Dashboard${repoName ? ' - ' + repoName : ''}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
      color: #333;
    }
    
    .container {
      max-width: 1400px;
      margin: 0 auto;
    }
    
    header {
      text-align: center;
      color: white;
      margin-bottom: 40px;
    }
    
    h1 {
      font-size: 3em;
      margin-bottom: 10px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
    }
    
    .subtitle {
      font-size: 1.2em;
      opacity: 0.9;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    
    .stat-card {
      background: white;
      border-radius: 15px;
      padding: 25px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
    
    .stat-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 15px 40px rgba(0,0,0,0.15);
    }
    
    .stat-icon {
      font-size: 2.5em;
      margin-bottom: 10px;
    }
    
    .stat-label {
      font-size: 0.9em;
      color: #666;
      margin-bottom: 5px;
    }
    
    .stat-value {
      font-size: 2.5em;
      font-weight: bold;
      color: #667eea;
    }
    
    .chart-container {
      background: white;
      border-radius: 15px;
      padding: 30px;
      margin-bottom: 30px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    }
    
    .chart-title {
      font-size: 1.5em;
      margin-bottom: 20px;
      color: #333;
      font-weight: 600;
    }
    
    .chart-wrapper {
      position: relative;
      height: 400px;
    }
    
    .chart-wrapper.small {
      height: 300px;
    }
    
    .grid-2 {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
      gap: 30px;
      margin-bottom: 30px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
    }
    
    th {
      background: #f8f9fa;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      color: #666;
      border-bottom: 2px solid #dee2e6;
    }
    
    td {
      padding: 12px;
      border-bottom: 1px solid #f0f0f0;
    }
    
    tr:hover {
      background: #f8f9fa;
    }
    
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 0.85em;
      font-weight: 600;
    }
    
    .badge-success {
      background: #d4edda;
      color: #155724;
    }
    
    .badge-warning {
      background: #fff3cd;
      color: #856404;
    }
    
    .badge-info {
      background: #d1ecf1;
      color: #0c5460;
    }
    
    .progress-bar {
      height: 8px;
      background: #e9ecef;
      border-radius: 4px;
      overflow: hidden;
      margin-top: 5px;
    }
    
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      transition: width 0.3s ease;
    }
    
    footer {
      text-align: center;
      color: white;
      margin-top: 50px;
      padding: 20px;
      opacity: 0.8;
    }
    
    .emoji {
      font-style: normal;
    }
    
    .tooltip-icon {
      display: inline-block;
      margin-left: 8px;
      color: #999;
      cursor: help;
      font-size: 0.85em;
      position: relative;
    }
    
    .tooltip-icon:hover {
      color: #667eea;
    }
    
    .tooltip-text {
      visibility: hidden;
      width: 280px;
      background-color: #333;
      color: #fff;
      text-align: left;
      border-radius: 8px;
      padding: 12px;
      position: absolute;
      z-index: 1000;
      bottom: 125%;
      left: 50%;
      margin-left: -140px;
      opacity: 0;
      transition: opacity 0.3s;
      font-size: 0.85em;
      line-height: 1.4;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
    
    .tooltip-text::after {
      content: "";
      position: absolute;
      top: 100%;
      left: 50%;
      margin-left: -5px;
      border-width: 5px;
      border-style: solid;
      border-color: #333 transparent transparent transparent;
    }
    
    .tooltip-icon:hover .tooltip-text {
      visibility: visible;
      opacity: 1;
    }
    
    @media (max-width: 768px) {
      h1 {
        font-size: 2em;
      }
      
      .grid-2 {
        grid-template-columns: 1fr;
      }
      
      .chart-wrapper {
        height: 300px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🤖 AI Authorship Dashboard</h1>
      <p class="subtitle">${repoName || 'Repository'} - AI Code Contribution Analytics</p>
    </header>
    
    <!-- Summary Stats -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">📝</div>
        <div class="stat-label">
          Total Commits
          <span class="tooltip-icon">ℹ️
            <span class="tooltip-text">Total number of commits in the repository history</span>
          </span>
        </div>
        <div class="stat-value">${data.totalCommits}</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">📁</div>
        <div class="stat-label">
          Files Modified
          <span class="tooltip-icon">ℹ️
            <span class="tooltip-text">Unique count of files that have been modified across all commits</span>
          </span>
        </div>
        <div class="stat-value">${data.totalFiles}</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">➕</div>
        <div class="stat-label">
          Total Lines
          <span class="tooltip-icon">ℹ️
            <span class="tooltip-text">Sum of all lines added and deleted across all commits (additions + deletions)</span>
          </span>
        </div>
        <div class="stat-value">${data.totalLines.toLocaleString()}</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">🤖</div>
        <div class="stat-label">
          AI Contribution
          <span class="tooltip-icon">ℹ️
            <span class="tooltip-text">Percentage of total lines that were contributed by AI (AI lines / Total lines × 100)</span>
          </span>
        </div>
        <div class="stat-value">${data.aiPercentage.toFixed(1)}%</div>
      </div>
    </div>
    
    <!-- Main Charts -->
    <div class="chart-container">
      <h2 class="chart-title">
        📈 Commit Activity Over Time
        <span class="tooltip-icon">ℹ️
          <span class="tooltip-text">Number of commits grouped by date, showing the repository's commit frequency over time</span>
        </span>
      </h2>
      <div class="chart-wrapper">
        <canvas id="timelineChart"></canvas>
      </div>
    </div>
    
    <div class="chart-container">
      <h2 class="chart-title">
        🎯 AI Acceptance Rate Timeline
        <span class="tooltip-icon">ℹ️
          <span class="tooltip-text">Percentage of AI-contributed lines that were accepted per day (AI lines / Total lines × 100)</span>
        </span>
      </h2>
      <div class="chart-wrapper">
        <canvas id="acceptanceChart"></canvas>
      </div>
    </div>
    
    <div class="grid-2">
      <div class="chart-container">
        <h2 class="chart-title">
          🧠 Model Usage
          <span class="tooltip-icon">ℹ️
            <span class="tooltip-text">Distribution of commits by AI model used, showing which models contributed most frequently</span>
          </span>
        </h2>
        <div class="chart-wrapper small">
          <canvas id="modelChart"></canvas>
        </div>
      </div>
      
      <div class="chart-container">
        <h2 class="chart-title">
          🔧 Tool Distribution
          <span class="tooltip-icon">ℹ️
            <span class="tooltip-text">Distribution of commits by tool used (e.g., Cursor, Claude), showing which development tools were used</span>
          </span>
        </h2>
        <div class="chart-wrapper small">
          <canvas id="toolChart"></canvas>
        </div>
      </div>
    </div>
    
    <div class="chart-container">
      <h2 class="chart-title">
        👥 AI vs Human Contribution
        <span class="tooltip-icon">ℹ️
          <span class="tooltip-text">Comparison of total lines contributed by AI versus human authors (based on AI metadata in git notes)</span>
        </span>
      </h2>
      <div class="chart-wrapper small">
        <canvas id="contributionChart"></canvas>
      </div>
    </div>
    
    <!-- Tables -->
    <div class="grid-2">
      <div class="chart-container">
        <h2 class="chart-title">
          🏆 Top AI Models
          <span class="tooltip-icon">ℹ️
            <span class="tooltip-text">Top 5 AI models by commit count. Acceptance Rate = (AI lines / Total lines) for commits using each model</span>
          </span>
        </h2>
        <table>
          <thead>
            <tr>
              <th>Model</th>
              <th>Commits</th>
              <th>Acceptance Rate</th>
            </tr>
          </thead>
          <tbody>
            ${topModels.map(m => `
              <tr>
                <td><strong>${m.model}</strong></td>
                <td>${m.commits}</td>
                <td>
                  <span class="badge ${m.acceptanceRate >= 80 ? 'badge-success' : m.acceptanceRate >= 60 ? 'badge-warning' : 'badge-info'}">
                    ${m.acceptanceRate.toFixed(1)}%
                  </span>
                  <div class="progress-bar">
                    <div class="progress-fill" style="width: ${m.acceptanceRate}%"></div>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      
      <div class="chart-container">
        <h2 class="chart-title">
          📂 Most Modified Files
          <span class="tooltip-icon">ℹ️
            <span class="tooltip-text">Top 10 files by number of modifications. AI % = (AI lines / Total lines) for each file</span>
          </span>
        </h2>
        <table>
          <thead>
            <tr>
              <th>File</th>
              <th>Changes</th>
              <th>AI %</th>
            </tr>
          </thead>
          <tbody>
            ${topFiles.map(f => {
              const aiPercent = f.totalLines > 0 ? (f.aiLines / f.totalLines) * 100 : 0;
              return `
                <tr>
                  <td title="${f.filepath}"><code>${f.filepath.split('/').pop() || f.filepath}</code></td>
                  <td>${f.modifications}</td>
                  <td>
                    <span class="badge badge-info">${aiPercent.toFixed(0)}%</span>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
    
    ${topAuthors.length > 0 ? `
    <div class="chart-container">
      <h2 class="chart-title">
        👤 Author Statistics
        <span class="tooltip-icon">ℹ️
          <span class="tooltip-text">Top 10 authors by commit count. AI Usage = (AI lines / Total lines) across all commits by each author</span>
        </span>
      </h2>
      <table>
        <thead>
          <tr>
            <th>Author</th>
            <th>Commits</th>
            <th>Total Lines</th>
            <th>AI Usage</th>
          </tr>
        </thead>
        <tbody>
          ${topAuthors.map(a => `
            <tr>
              <td><strong>${a.author}</strong></td>
              <td>${a.commits}</td>
              <td>${a.totalLines.toLocaleString()}</td>
              <td>
                <span class="badge ${a.aiUsagePercent >= 70 ? 'badge-success' : a.aiUsagePercent >= 40 ? 'badge-warning' : 'badge-info'}">
                  ${a.aiUsagePercent.toFixed(1)}%
                </span>
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${a.aiUsagePercent}%"></div>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}
    
    <div class="chart-container">
      <h2 class="chart-title">
        ⏱️ Recent AI-Assisted Commits
        <span class="tooltip-icon">ℹ️
          <span class="tooltip-text">Most recent commits with AI metadata. AI % = (AI lines / Total lines) for each commit</span>
        </span>
      </h2>
      <table>
        <thead>
          <tr>
            <th>SHA</th>
            <th>Author</th>
            <th>Message</th>
            <th>AI %</th>
            <th>Model</th>
          </tr>
        </thead>
        <tbody>
          ${data.recentCommits.map(c => `
            <tr>
              <td><code>${c.shortSha}</code></td>
              <td>${c.author}</td>
              <td title="${c.message}">${c.message.substring(0, 50)}${c.message.length > 50 ? '...' : ''}</td>
              <td>
                <span class="badge ${c.aiPercent >= 80 ? 'badge-success' : c.aiPercent >= 50 ? 'badge-warning' : 'badge-info'}">
                  ${c.aiPercent.toFixed(0)}%
                </span>
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${c.aiPercent}%"></div>
                </div>
              </td>
              <td><small>${c.model || 'N/A'}</small></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    
    <footer>
      <p>Generated by <strong>git-notes-bot</strong> 🤖</p>
      <p><small>Last updated: ${new Date().toLocaleString()}</small></p>
    </footer>
  </div>
  
  <script>
    // Chart.js configuration
    Chart.defaults.font.family = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    Chart.defaults.color = '#666';
    
    const chartColors = {
      primary: '#667eea',
      secondary: '#764ba2',
      success: '#48bb78',
      warning: '#ed8936',
      danger: '#f56565',
      info: '#4299e1'
    };
    
    // Timeline Chart
    new Chart(document.getElementById('timelineChart'), {
      type: 'line',
      data: {
        labels: ${JSON.stringify(timelineLabels)},
        datasets: [{
          label: 'Commits',
          data: ${JSON.stringify(timelineData)},
          borderColor: chartColors.primary,
          backgroundColor: chartColors.primary + '20',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0
            }
          }
        }
      }
    });
    
    // Acceptance Rate Chart
    new Chart(document.getElementById('acceptanceChart'), {
      type: 'line',
      data: {
        labels: ${JSON.stringify(timelineLabels)},
        datasets: [{
          label: 'AI Acceptance Rate (%)',
          data: ${JSON.stringify(aiPercentTimeline)},
          borderColor: chartColors.success,
          backgroundColor: chartColors.success + '20',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              callback: function(value) {
                return value + '%';
              }
            }
          }
        }
      }
    });
    
    // Model Chart
    new Chart(document.getElementById('modelChart'), {
      type: 'doughnut',
      data: {
        labels: ${JSON.stringify(modelLabels)},
        datasets: [{
          data: ${JSON.stringify(modelData)},
          backgroundColor: [
            chartColors.primary,
            chartColors.secondary,
            chartColors.success,
            chartColors.warning,
            chartColors.info
          ]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    });
    
    // Tool Chart
    new Chart(document.getElementById('toolChart'), {
      type: 'pie',
      data: {
        labels: ${JSON.stringify(toolLabels)},
        datasets: [{
          data: ${JSON.stringify(toolData)},
          backgroundColor: [
            chartColors.primary,
            chartColors.success,
            chartColors.warning,
            chartColors.info
          ]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    });
    
    // Contribution Chart
    new Chart(document.getElementById('contributionChart'), {
      type: 'bar',
      data: {
        labels: ['AI Lines', 'Human Lines'],
        datasets: [{
          label: 'Lines of Code',
          data: [${data.aiLines}, ${data.humanLines}],
          backgroundColor: [chartColors.primary, chartColors.success]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  </script>
</body>
</html>`;
}

