import { DashboardData } from './dashboard';

/**
 * Generates a beautiful HTML dashboard with charts
 */
export function generateDashboardHTML(data: DashboardData, repoName?: string): string {
  // Serialize data for client-side filtering
  const allCommitsByDate = Array.from(data.commitsByDate.values())
    .sort((a, b) => a.date.localeCompare(b.date));
  
  const allModels = Array.from(data.modelUsage.values())
    .sort((a, b) => b.commits - a.commits);
  
  const allTools = Array.from(data.toolUsage.values())
    .sort((a, b) => b.commits - a.commits);
  
  const allAuthors = Array.from(data.authorStats.values())
    .sort((a, b) => b.commits - a.commits);
  
  const allFiles = Array.from(data.fileStats.values())
    .sort((a, b) => b.modifications - a.modifications);
  
  const topModels = Array.from(data.modelUsage.values())
    .sort((a, b) => b.commits - a.commits)
    .slice(0, 5);
  
  const topFiles = Array.from(data.fileStats.values())
    .sort((a, b) => b.modifications - a.modifications)
    .slice(0, 10);
  
  const topAuthors = Array.from(data.authorStats.values())
    .sort((a, b) => b.commits - a.commits);
  
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
  
  const aiLinesTimeline = Array.from(data.commitsByDate.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(d => d.aiLines);
  
  const humanLinesTimeline = Array.from(data.commitsByDate.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(d => d.totalLines - d.aiLines);
  
  const modelLabels = topModels.map(m => m.model);
  const modelData = topModels.map(m => m.commits);
  const modelAcceptance = topModels.map(m => m.acceptanceRate.toFixed(1));
  
  const toolLabels = Array.from(data.toolUsage.values()).map(t => t.tool);
  const toolData = Array.from(data.toolUsage.values()).map(t => t.commits);
  
  // Get unique authors from recent commits (these have just the name, not email)
  const authorLabels = [...new Set(data.recentCommits.map(c => c.author))].sort();
  
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
    
    .filters-container {
      background: white;
      border-radius: 15px;
      padding: 25px;
      margin-bottom: 30px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    }
    
    .filters-title {
      font-size: 1.3em;
      font-weight: 600;
      margin-bottom: 20px;
      color: #333;
    }
    
    .filters-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
    }
    
    .filter-group {
      display: flex;
      flex-direction: column;
    }
    
    .filter-label {
      font-size: 0.9em;
      font-weight: 600;
      color: #666;
      margin-bottom: 8px;
    }
    
    .filter-select {
      padding: 10px 15px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 1em;
      background: white;
      cursor: pointer;
      transition: border-color 0.3s ease;
    }
    
    .filter-select:hover {
      border-color: #667eea;
    }
    
    .filter-select:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }
    
    .filter-button {
      padding: 10px 20px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 1em;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.3s ease, transform 0.1s ease;
      margin-top: auto;
    }
    
    .filter-button:hover {
      background: #5568d3;
      transform: translateY(-2px);
    }
    
    .filter-button:active {
      transform: translateY(0);
    }
    
    .active-filters {
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px solid #e0e0e0;
      font-size: 0.9em;
      color: #666;
    }
    
    .filter-tag {
      display: inline-block;
      padding: 5px 12px;
      margin: 5px 5px 0 0;
      background: #e8eaf6;
      color: #667eea;
      border-radius: 15px;
      font-size: 0.85em;
      font-weight: 600;
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
      
      .filters-grid {
        grid-template-columns: 1fr;
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
    
    <!-- Filters -->
    <div class="filters-container">
      <h2 class="filters-title">🔍 Filters</h2>
      <div class="filters-grid">
        <div class="filter-group">
          <label class="filter-label" for="timeFilter">Time Range</label>
          <select id="timeFilter" class="filter-select">
            <option value="all">All Time</option>
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
            <option value="180">Last 6 Months</option>
            <option value="365">Last Year</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label class="filter-label" for="toolFilter">Tool</label>
          <select id="toolFilter" class="filter-select">
            <option value="all">All Tools</option>
            ${toolLabels.map(tool => `<option value="${tool}">${tool}</option>`).join('')}
          </select>
        </div>
        
        <div class="filter-group">
          <label class="filter-label" for="modelFilter">AI Model</label>
          <select id="modelFilter" class="filter-select">
            <option value="all">All Models</option>
            ${modelLabels.map(model => `<option value="${model}">${model}</option>`).join('')}
          </select>
        </div>
        
        <div class="filter-group">
          <label class="filter-label" for="authorFilter">Author</label>
          <select id="authorFilter" class="filter-select">
            <option value="all">All Authors</option>
            ${authorLabels.map(author => `<option value="${author}">${author}</option>`).join('')}
          </select>
        </div>
        
        <div class="filter-group">
          <button id="applyFilters" class="filter-button">Apply Filters</button>
        </div>
      </div>
      <div id="activeFilters" class="active-filters" style="display: none;">
        <strong>Active Filters:</strong>
        <div id="filterTags"></div>
      </div>
    </div>
    
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
        <div class="stat-value" id="statTotalCommits">${data.totalCommits}</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">📁</div>
        <div class="stat-label">
          Files Modified
          <span class="tooltip-icon">ℹ️
            <span class="tooltip-text">Unique count of files that have been modified across all commits</span>
          </span>
        </div>
        <div class="stat-value" id="statTotalFiles">${data.totalFiles}</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">➕</div>
        <div class="stat-label">
          Total Lines
          <span class="tooltip-icon">ℹ️
            <span class="tooltip-text">Sum of all lines added and deleted across all commits (additions + deletions)</span>
          </span>
        </div>
        <div class="stat-value" id="statTotalLines">${data.totalLines.toLocaleString()}</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">🤖</div>
        <div class="stat-label">
          AI Contribution
          <span class="tooltip-icon">ℹ️
            <span class="tooltip-text">Percentage of total lines that were contributed by AI (AI lines / Total lines × 100)</span>
          </span>
        </div>
        <div class="stat-value" id="statAIPercentage">${data.aiPercentage.toFixed(1)}%</div>
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
    
    <div class="grid-2">
      <div class="chart-container">
        <h2 class="chart-title">
          🤖 AI vs Human Contribution
          <span class="tooltip-icon">ℹ️
            <span class="tooltip-text">Overall distribution of lines contributed by AI versus human authors across all commits</span>
          </span>
        </h2>
        <div class="chart-wrapper small">
          <canvas id="aiHumanPieChart"></canvas>
        </div>
      </div>
      
      <div class="chart-container">
        <h2 class="chart-title">
          📊 Contribution Summary
          <span class="tooltip-icon">ℹ️
            <span class="tooltip-text">Quick overview of AI and human contribution metrics</span>
          </span>
        </h2>
        <div style="padding: 20px;">
          <div style="margin-bottom: 20px;">
            <div style="font-size: 1.2em; color: #667eea; font-weight: bold;">AI Contribution</div>
            <div style="font-size: 2.5em; font-weight: bold; color: #667eea;" id="summaryAILines">${data.aiLines.toLocaleString()}</div>
            <div style="color: #666;" id="summaryAIPercent">lines (${data.aiPercentage.toFixed(1)}%)</div>
          </div>
          <div>
            <div style="font-size: 1.2em; color: #48bb78; font-weight: bold;">Human Contribution</div>
            <div style="font-size: 2.5em; font-weight: bold; color: #48bb78;" id="summaryHumanLines">${data.humanLines.toLocaleString()}</div>
            <div style="color: #666;" id="summaryHumanPercent">lines (${(100 - data.aiPercentage).toFixed(1)}%)</div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="chart-container">
      <h2 class="chart-title">
        👥 AI vs Human Contribution Over Time
        <span class="tooltip-icon">ℹ️
          <span class="tooltip-text">Timeline showing lines contributed by AI versus human authors per day (based on AI metadata in git notes)</span>
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
        <tbody id="authorStatsTable">
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
        <tbody id="recentCommitsTable">
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
      type: 'line',
      data: {
        labels: ${JSON.stringify(timelineLabels)},
        datasets: [{
          label: 'AI Lines',
          data: ${JSON.stringify(aiLinesTimeline)},
          borderColor: chartColors.primary,
          backgroundColor: chartColors.primary + '20',
          tension: 0.4,
          fill: false
        }, {
          label: 'Human Lines',
          data: ${JSON.stringify(humanLinesTimeline)},
          borderColor: chartColors.success,
          backgroundColor: chartColors.success + '20',
          tension: 0.4,
          fill: false
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
            beginAtZero: true
          }
        }
      }
    });
    
    // AI vs Human Pie Chart
    new Chart(document.getElementById('aiHumanPieChart'), {
      type: 'pie',
      data: {
        labels: ['AI Contribution', 'Human Contribution'],
        datasets: [{
          data: [${data.aiLines}, ${data.humanLines}],
          backgroundColor: [
            chartColors.primary,
            chartColors.success
          ],
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.parsed || 0;
                const total = ${data.totalLines};
                const percentage = ((value / total) * 100).toFixed(1);
                return label + ': ' + value.toLocaleString() + ' lines (' + percentage + '%)';
              }
            }
          }
        }
      }
    });
    
    // Store raw data for filtering
    const rawData = {
      commits: ${JSON.stringify(data.recentCommits)},
      commitsByDate: ${JSON.stringify(allCommitsByDate)},
      models: ${JSON.stringify(allModels)},
      tools: ${JSON.stringify(allTools)},
      authors: ${JSON.stringify(allAuthors)},
      files: ${JSON.stringify(allFiles)},
      totalCommits: ${data.totalCommits},
      totalFiles: ${data.totalFiles},
      totalLines: ${data.totalLines},
      aiLines: ${data.aiLines},
      humanLines: ${data.humanLines},
      aiPercentage: ${data.aiPercentage}
    };
    
    // Store chart instances
    let charts = {
      timeline: null,
      acceptance: null,
      model: null,
      tool: null,
      contribution: null,
      aiHumanPie: null
    };
    
    // Initialize charts (already created above)
    charts.timeline = Chart.getChart('timelineChart');
    charts.acceptance = Chart.getChart('acceptanceChart');
    charts.model = Chart.getChart('modelChart');
    charts.tool = Chart.getChart('toolChart');
    charts.contribution = Chart.getChart('contributionChart');
    charts.aiHumanPie = Chart.getChart('aiHumanPieChart');
    
    // Filter data function
    function filterData(timeFilter, toolFilter, modelFilter, authorFilter) {
      let filtered = { ...rawData };
      let filteredCommits = [...rawData.commits];
      
      // Apply time filter
      if (timeFilter !== 'all') {
        const days = parseInt(timeFilter);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const cutoffStr = cutoffDate.toISOString().split('T')[0];
        
        filteredCommits = filteredCommits.filter(c => c.date.split('T')[0] >= cutoffStr);
      }
      
      // Apply tool filter
      if (toolFilter !== 'all') {
        filteredCommits = filteredCommits.filter(c => c.tool === toolFilter);
        filtered.tools = rawData.tools.filter(t => t.tool === toolFilter);
      }
      
      // Apply model filter
      if (modelFilter !== 'all') {
        filteredCommits = filteredCommits.filter(c => c.model === modelFilter);
        filtered.models = rawData.models.filter(m => m.model === modelFilter);
      }
      
      // Apply author filter
      if (authorFilter !== 'all') {
        filteredCommits = filteredCommits.filter(c => c.author === authorFilter);
      }
      
      filtered.commits = filteredCommits;

      // Rebuild commitsByDate from filtered commits using actual commit data
      const dateMap = new Map();
      for (const commit of filteredCommits) {
        const dateStr = commit.date.split('T')[0];
        if (!dateMap.has(dateStr)) {
          dateMap.set(dateStr, {
            date: dateStr,
            count: 0,
            aiLines: 0,
            totalLines: 0,
            aiPercent: 0
          });
        }
        const dateData = dateMap.get(dateStr);

        // Use actual commit line data instead of approximating from date averages
        dateData.count++;
        dateData.totalLines += commit.totalLines || 0;
        dateData.aiLines += commit.aiLines || 0;
      }

      // Calculate AI percentages for each date
      for (const dateData of dateMap.values()) {
        dateData.aiPercent = dateData.totalLines > 0
          ? (dateData.aiLines / dateData.totalLines) * 100
          : 0;
      }

      filtered.commitsByDate = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));

      // Recalculate totals from filtered commits directly
      filtered.totalCommits = filtered.commits.length;
      filtered.totalLines = filteredCommits.reduce((sum, c) => sum + (c.totalLines || 0), 0);
      filtered.aiLines = filteredCommits.reduce((sum, c) => sum + (c.aiLines || 0), 0);
      filtered.humanLines = filtered.totalLines - filtered.aiLines;
      filtered.aiPercentage = filtered.totalLines > 0 ? (filtered.aiLines / filtered.totalLines) * 100 : 0;

      // Recalculate file count from filtered commits
      const filesSet = new Set();
      for (const file of rawData.files) {
        // Include files that appear in our filtered commits
        filesSet.add(file.filepath);
      }
      filtered.totalFiles = filesSet.size;

      // Rebuild author statistics from filtered commits using actual commit data
      const authorMap = new Map();
      for (const commit of filteredCommits) {
        // Find matching author in rawData to get full author string with email
        const fullAuthor = rawData.authors.find(a => a.author.startsWith(commit.author));
        const authorKey = fullAuthor ? fullAuthor.author : commit.author;

        if (!authorMap.has(authorKey)) {
          authorMap.set(authorKey, {
            author: authorKey,
            commits: 0,
            totalLines: 0,
            aiAssistedLines: 0,
            aiUsagePercent: 0
          });
        }

        const authorData = authorMap.get(authorKey);
        authorData.commits++;
        authorData.totalLines += commit.totalLines || 0;
        authorData.aiAssistedLines += commit.aiLines || 0;
      }

      // Calculate AI usage percentages for each author
      for (const authorData of authorMap.values()) {
        authorData.aiUsagePercent = authorData.totalLines > 0
          ? (authorData.aiAssistedLines / authorData.totalLines) * 100
          : 0;
      }

      filtered.authors = Array.from(authorMap.values()).sort((a, b) => b.commits - a.commits);
      
      return filtered;
    }
    
    // Update dashboard function
    function updateDashboard(filtered) {
      // Update stats
      document.getElementById('statTotalCommits').textContent = filtered.totalCommits;
      document.getElementById('statTotalFiles').textContent = filtered.totalFiles;
      document.getElementById('statTotalLines').textContent = filtered.totalLines.toLocaleString();
      document.getElementById('statAIPercentage').textContent = filtered.aiPercentage.toFixed(1) + '%';
      
      // Update summary cards
      document.getElementById('summaryAILines').textContent = filtered.aiLines.toLocaleString();
      document.getElementById('summaryAIPercent').textContent = 'lines (' + filtered.aiPercentage.toFixed(1) + '%)';
      document.getElementById('summaryHumanLines').textContent = filtered.humanLines.toLocaleString();
      document.getElementById('summaryHumanPercent').textContent = 'lines (' + (100 - filtered.aiPercentage).toFixed(1) + '%)';
      
      // Update timeline chart
      const timelineLabels = filtered.commitsByDate.map(d => d.date);
      const timelineData = filtered.commitsByDate.map(d => d.count);
      charts.timeline.data.labels = timelineLabels;
      charts.timeline.data.datasets[0].data = timelineData;
      charts.timeline.update();
      
      // Update acceptance rate chart
      const aiPercentData = filtered.commitsByDate.map(d => d.aiPercent.toFixed(1));
      charts.acceptance.data.labels = timelineLabels;
      charts.acceptance.data.datasets[0].data = aiPercentData;
      charts.acceptance.update();
      
      // Update contribution chart
      const aiLinesData = filtered.commitsByDate.map(d => d.aiLines);
      const humanLinesData = filtered.commitsByDate.map(d => d.totalLines - d.aiLines);
      charts.contribution.data.labels = timelineLabels;
      charts.contribution.data.datasets[0].data = aiLinesData;
      charts.contribution.data.datasets[1].data = humanLinesData;
      charts.contribution.update();
      
      // Update model chart
      const topModels = filtered.models.sort((a, b) => b.commits - a.commits).slice(0, 5);
      charts.model.data.labels = topModels.map(m => m.model);
      charts.model.data.datasets[0].data = topModels.map(m => m.commits);
      charts.model.update();
      
      // Update tool chart
      charts.tool.data.labels = filtered.tools.map(t => t.tool);
      charts.tool.data.datasets[0].data = filtered.tools.map(t => t.commits);
      charts.tool.update();
      
      // Update AI vs Human pie chart
      charts.aiHumanPie.data.datasets[0].data = [filtered.aiLines, filtered.humanLines];
      charts.aiHumanPie.update();
      
      // Update Recent AI-Assisted Commits table
      const recentCommitsTable = document.getElementById('recentCommitsTable');
      if (recentCommitsTable) {
        recentCommitsTable.innerHTML = filtered.commits.map(c => {
          const badgeClass = c.aiPercent >= 80 ? 'badge-success' : c.aiPercent >= 50 ? 'badge-warning' : 'badge-info';
          const messageShort = c.message.substring(0, 50) + (c.message.length > 50 ? '...' : '');
          return \`
            <tr>
              <td><code>\${c.shortSha}</code></td>
              <td>\${c.author}</td>
              <td title="\${c.message}">\${messageShort}</td>
              <td>
                <span class="badge \${badgeClass}">
                  \${c.aiPercent.toFixed(0)}%
                </span>
                <div class="progress-bar">
                  <div class="progress-fill" style="width: \${c.aiPercent}%"></div>
                </div>
              </td>
              <td><small>\${c.model || 'N/A'}</small></td>
            </tr>
          \`;
        }).join('');
      }
      
      // Update Author Statistics table
      const authorStatsTable = document.getElementById('authorStatsTable');
      console.log('Updating author stats:', filtered.authors);
      if (authorStatsTable) {
        if (filtered.authors && filtered.authors.length > 0) {
          authorStatsTable.innerHTML = filtered.authors.map(a => {
            const badgeClass = a.aiUsagePercent >= 70 ? 'badge-success' : a.aiUsagePercent >= 40 ? 'badge-warning' : 'badge-info';
            return \`
              <tr>
                <td><strong>\${a.author}</strong></td>
                <td>\${a.commits}</td>
                <td>\${Math.round(a.totalLines).toLocaleString()}</td>
                <td>
                  <span class="badge \${badgeClass}">
                    \${a.aiUsagePercent.toFixed(1)}%
                  </span>
                  <div class="progress-bar">
                    <div class="progress-fill" style="width: \${a.aiUsagePercent}%"></div>
                  </div>
                </td>
              </tr>
            \`;
          }).join('');
        } else {
          authorStatsTable.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">No authors found for selected filters</td></tr>';
        }
      }
    }
    
    // Filter button handler
    const applyFiltersBtn = document.getElementById('applyFilters');
    const activeFiltersDiv = document.getElementById('activeFilters');
    const filterTagsDiv = document.getElementById('filterTags');
    
    applyFiltersBtn.addEventListener('click', function() {
      const timeFilter = document.getElementById('timeFilter').value;
      const toolFilter = document.getElementById('toolFilter').value;
      const modelFilter = document.getElementById('modelFilter').value;
      const authorFilter = document.getElementById('authorFilter').value;
      
      const filterTags = [];
      if (timeFilter !== 'all') {
        filterTags.push('Time: Last ' + timeFilter + ' days');
      }
      if (toolFilter !== 'all') {
        filterTags.push('Tool: ' + toolFilter);
      }
      if (modelFilter !== 'all') {
        filterTags.push('Model: ' + modelFilter);
      }
      if (authorFilter !== 'all') {
        filterTags.push('Author: ' + authorFilter);
      }
      
      if (filterTags.length > 0) {
        filterTagsDiv.innerHTML = filterTags.map(tag => 
          '<span class="filter-tag">' + tag + '</span>'
        ).join('');
        activeFiltersDiv.style.display = 'block';
      } else {
        activeFiltersDiv.style.display = 'none';
      }
      
      // Apply filters and update dashboard
      const filtered = filterData(timeFilter, toolFilter, modelFilter, authorFilter);
      updateDashboard(filtered);
    });
  </script>
</body>
</html>`;
}

