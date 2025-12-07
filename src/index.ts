import * as core from '@actions/core';
import * as github from '@actions/github';
import { fetchGitNotes, getNotesForCommitRange, GitNote } from './git-notes';

interface CommentOptions {
  updateExisting: boolean;
  commentIdentifier: string;
}

interface AIAuthorshipNote {
  schema_version?: string;
  git_ai_version?: string;
  base_commit_sha?: string;
  prompts?: {
    [key: string]: {
      agent_id?: {
        tool?: string;
        id?: string;
        model?: string;
      };
      human_author?: string;
      messages?: Array<{
        type: string;
        text?: string;
        timestamp?: string;
        name?: string;
        // Future: line_ranges?: Array<{ start: number, end: number, file: string }>;
      }>;
      total_additions?: number;
      total_deletions?: number;
      accepted_lines?: number;
      overriden_lines?: number;
      // Future: file_line_map?: { [filepath: string]: number[] };
    };
  };
}

interface FileAIInfo {
  filepath: string;
  aiPercent: number;
  acceptedLines: number;
  totalLines: number;
  model?: string;
  tool?: string;
  commitSha?: string;
  promptId?: string;
  userPrompt?: string;  // The actual user message that created this
}

/**
 * Creates a visual progress bar using Unicode characters
 */
function createProgressBar(value: number, total: number, width: number = 20): string {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  const filled = Math.round((value / total) * width);
  const empty = width - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${percentage.toFixed(0)}%`;
}

/**
 * Creates a circular pie chart representation using Unicode
 */
function createPieChart(percentage: number): string {
  // Use circle emojis to represent pie chart
  if (percentage >= 87.5) return '🟢'; // 7/8 - 8/8
  if (percentage >= 75) return '🔵'; // 6/8 - 7/8
  if (percentage >= 62.5) return '🟡'; // 5/8 - 6/8
  if (percentage >= 50) return '🟠'; // 4/8 - 5/8
  if (percentage >= 37.5) return '🟠'; // 3/8 - 4/8
  if (percentage >= 25) return '🔴'; // 2/8 - 3/8
  if (percentage >= 12.5) return '🔴'; // 1/8 - 2/8
  return '⚪'; // 0 - 1/8
}

/**
 * Creates a visual donut chart for AI vs Human contributions
 */
function createDonutChart(aiPercent: number): string {
  const blocks = ['⬜', '🟦', '🟦', '🟦', '🟦'];
  const steps = Math.round(aiPercent / 25);
  return '```\n' +
    '     AI vs Human\n' +
    '    ┌─────────┐\n' +
    `    │ ${aiPercent}% AI  │\n` +
    '    └─────────┘\n' +
    `    ${'🤖'.repeat(Math.min(steps, 5))}${'👤'.repeat(Math.max(0, 5 - steps))}\n` +
    '```';
}

/**
 * Formats a timestamp into a human-readable format
 */
function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    };
    return date.toLocaleString('en-US', options);
  } catch {
    return timestamp;
  }
}

/**
 * Calculates duration between two timestamps and formats it
 */
function formatDuration(startTime: string, endTime: string): string {
  try {
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    const diffMs = end - start;
    
    if (diffMs < 0) return 'N/A';
    
    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      const remainingHours = hours % 24;
      return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
    } else if (hours > 0) {
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    } else if (minutes > 0) {
      const remainingSeconds = seconds % 60;
      return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
    } else {
      return `${seconds}s`;
    }
  } catch {
    return 'N/A';
  }
}

/**
 * Extracts file-level AI information from notes with prompt context
 */
function extractFileAIInfo(note: string, commitSha: string): FileAIInfo[] {
  const fileInfos: FileAIInfo[] = [];
  
  try {
    // Extract file paths from the beginning of the note
    const lines = note.split('\n');
    const filePaths: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line === '---' || line.startsWith('{')) {
        break;
      }
      if (line && !line.match(/^[a-f0-9\s\-]+$/)) {
        filePaths.push(line.split(/\s+/)[0]);
      }
    }
    
    // Extract JSON from note
    const jsonMatch = note.match(/\{[\s\S]*\}/);
    if (!jsonMatch || filePaths.length === 0) {
      return fileInfos;
    }
    
    const data: AIAuthorshipNote = JSON.parse(jsonMatch[0]);
    if (!data.prompts) {
      return fileInfos;
    }
    
    // Get aggregate stats for these files
    for (const [promptId, prompt] of Object.entries(data.prompts)) {
      const totalLines = prompt.total_additions || 0;
      const acceptedLines = prompt.accepted_lines || 0;
      const aiPercent = totalLines > 0 ? Math.round((acceptedLines / totalLines) * 100) : 0;
      
      // Extract the first user message as the initiating prompt
      let userPrompt = '';
      if (prompt.messages && prompt.messages.length > 0) {
        const firstUserMsg = prompt.messages.find(m => m.type === 'user');
        if (firstUserMsg && firstUserMsg.text) {
          // Truncate to first 100 chars for inline display
          userPrompt = firstUserMsg.text.length > 100 
            ? firstUserMsg.text.substring(0, 100) + '...' 
            : firstUserMsg.text;
        }
      }
      
      // Associate this info with all files in this commit
      for (const filepath of filePaths) {
        fileInfos.push({
          filepath,
          aiPercent,
          acceptedLines,
          totalLines,
          model: prompt.agent_id?.model,
          tool: prompt.agent_id?.tool,
          commitSha,
          promptId,
          userPrompt
        });
      }
    }
  } catch {}
  
  return fileInfos;
}

/**
 * Formats AI authorship data in a graphical way
 */
function formatAIAuthorship(note: string): string {
  try {
    // Extract file paths from the beginning of the note
    const lines = note.split('\n');
    const filePaths: string[] = [];
    let jsonStartIndex = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line === '---' || line.startsWith('{')) {
        jsonStartIndex = i;
        break;
      }
      if (line && !line.match(/^[a-f0-9\s\-]+$/)) {
        // This looks like a file path (not just hex/numbers/dashes)
        filePaths.push(line.split(/\s+/)[0]);
      }
    }
    
    // Extract JSON from note
    const jsonMatch = note.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return `\`\`\`\n${note}\n\`\`\`\n\n`;
    }
    
    const data: AIAuthorshipNote = JSON.parse(jsonMatch[0]);
    
    if (!data.prompts) {
      return `\`\`\`\n${note}\n\`\`\`\n\n`;
    }

    let output = '';
    
    // Show affected files
    if (filePaths.length > 0) {
      output += `#### 📁 Files Modified\n\n`;
      for (const filepath of filePaths) {
        output += `- \`${filepath}\`\n`;
      }
      output += `\n`;
    }
    
    for (const [promptId, prompt] of Object.entries(data.prompts)) {
      // Calculate commit duration if messages exist
      if (prompt.messages && prompt.messages.length > 0) {
        const timestamps = prompt.messages
          .map(m => m.timestamp)
          .filter(t => t !== undefined) as string[];
        
        if (timestamps.length >= 2) {
          const firstTimestamp = timestamps[0];
          const lastTimestamp = timestamps[timestamps.length - 1];
          const duration = formatDuration(firstTimestamp, lastTimestamp);
          
          output += `#### ⏱️ Commit Duration\n\n`;
          output += `**${duration}** (from first change to commit)\n\n`;
        }
      }
      
      // AI Agent Info
      output += `#### 🤖 AI Assistant\n\n`;
      if (prompt.agent_id) {
        output += `- **Tool:** ${prompt.agent_id.tool || 'Unknown'}\n`;
        output += `- **Model:** ${prompt.agent_id.model || 'Unknown'}\n`;
      }
      output += `- **Human Author:** ${prompt.human_author || 'Unknown'}\n\n`;

      // AI vs Human Contribution Bar
      const totalLines = (prompt.total_additions || 0);
      const aiLines = (prompt.accepted_lines || 0);
      const humanLines = totalLines - aiLines;
      const humanPercent = totalLines > 0 ? Math.round((humanLines / totalLines) * 100) : 0;
      const aiPercent = totalLines > 0 ? Math.round((aiLines / totalLines) * 100) : 0;
      
      const barWidth = 40;
      const humanWidth = totalLines > 0 ? Math.round((humanLines / totalLines) * barWidth) : 0;
      const aiWidth = barWidth - humanWidth;
      
      output += `#### 👥 Authorship\n\n`;
      output += `<table><tr><td>\n\n`;
      output += `\`\`\`\n`;
      output += `┌────────────────────────────────────────┐\n`;
      output += `│  you  ${'█'.repeat(humanWidth)}${'░'.repeat(aiWidth)} ai  │\n`;
      output += `│       ${humanPercent}%${' '.repeat(barWidth - humanPercent.toString().length - aiPercent.toString().length - 1)}${aiPercent}%       │\n`;
      output += `├────────────────────────────────────────┤\n`;
      
      const acceptanceRate = totalLines > 0 ? Math.round((aiLines / totalLines) * 100) : 0;
      output += `│   ${createPieChart(acceptanceRate)} ${acceptanceRate}% AI code accepted        │\n`;
      output += `└────────────────────────────────────────┘\n`;
      output += `\`\`\`\n\n`;
      output += `</td><td>\n\n`;
      
      // Add visual representation
      const aiIconCount = Math.round(aiPercent / 10);
      const humanIconCount = Math.round(humanPercent / 10);
      output += `**Visual Breakdown**\n\n`;
      output += `🤖 AI: ${'▓'.repeat(aiIconCount)}${'░'.repeat(10 - aiIconCount)}\n\n`;
      output += `👤 You: ${'▓'.repeat(humanIconCount)}${'░'.repeat(10 - humanIconCount)}\n\n`;
      output += `</td></tr></table>\n\n`;

      // Code Statistics with enhanced visuals
      const totalChanges = (prompt.total_additions || 0) + (prompt.total_deletions || 0);
      output += `#### 📊 Code Changes\n\n`;
      output += `<table>\n`;
      output += `<tr><th>Metric</th><th>Count</th><th>Visualization</th><th>Impact</th></tr>\n`;
      
      const addPercent = totalChanges > 0 ? ((prompt.total_additions || 0) / totalChanges * 100).toFixed(0) : 0;
      const delPercent = totalChanges > 0 ? ((prompt.total_deletions || 0) / totalChanges * 100).toFixed(0) : 0;
      const accPercent = (prompt.total_additions || 0) > 0 ? ((prompt.accepted_lines || 0) / (prompt.total_additions || 1) * 100).toFixed(0) : 0;
      const ovPercent = (prompt.total_additions || 0) > 0 ? ((prompt.overriden_lines || 0) / (prompt.total_additions || 1) * 100).toFixed(0) : 0;
      
      output += `<tr><td>➕ Additions</td><td><b>${prompt.total_additions || 0}</b></td><td>${createProgressBar(prompt.total_additions || 0, totalChanges)}</td><td>🟢 ${addPercent}%</td></tr>\n`;
      output += `<tr><td>➖ Deletions</td><td><b>${prompt.total_deletions || 0}</b></td><td>${createProgressBar(prompt.total_deletions || 0, totalChanges)}</td><td>🔴 ${delPercent}%</td></tr>\n`;
      output += `<tr><td>✅ Accepted</td><td><b>${prompt.accepted_lines || 0}</b></td><td>${createProgressBar(prompt.accepted_lines || 0, prompt.total_additions || 1)}</td><td>💚 ${accPercent}%</td></tr>\n`;
      output += `<tr><td>🔄 Overridden</td><td><b>${prompt.overriden_lines || 0}</b></td><td>${createProgressBar(prompt.overriden_lines || 0, prompt.total_additions || 1)}</td><td>🟡 ${ovPercent}%</td></tr>\n`;
      output += `</table>\n\n`;
      
      // Add a sparkline summary
      output += `**Change Pattern:** `;
      const pattern = totalChanges > 0 ? 
        `${'▁'.repeat(Math.min(3, Math.round((prompt.total_deletions || 0) / totalChanges * 10)))}` +
        `${'▃'.repeat(Math.min(3, Math.round((prompt.accepted_lines || 0) / totalChanges * 10)))}` +
        `${'▅'.repeat(Math.min(3, Math.round((prompt.overriden_lines || 0) / totalChanges * 10)))}` : '▁';
      output += `\`${pattern}\` (deletions → accepted → modified)\n\n`;

      // Conversation Summary
      if (prompt.messages && prompt.messages.length > 0) {
        output += `#### 💬 Conversation\n\n`;
        
        let userMessages = 0;
        let assistantMessages = 0;
        let toolUses = 0;
        
        for (const msg of prompt.messages) {
          if (msg.type === 'user') userMessages++;
          else if (msg.type === 'assistant') assistantMessages++;
          else if (msg.type === 'tool_use') toolUses++;
        }
        
        output += `- 👤 User messages: ${userMessages}\n`;
        output += `- 🤖 Assistant messages: ${assistantMessages}\n`;
        output += `- 🔧 Tool uses: ${toolUses}\n\n`;
        
        output += `<details>\n<summary>View full conversation</summary>\n\n`;
        
        for (const msg of prompt.messages) {
          const timestamp = msg.timestamp ? ` *(${formatTimestamp(msg.timestamp)})*` : '';
          if (msg.type === 'user') {
            output += `**👤 User:**${timestamp} ${msg.text}\n\n`;
          } else if (msg.type === 'assistant' && msg.text) {
            output += `**🤖 Assistant:**${timestamp} ${msg.text}\n\n`;
          } else if (msg.type === 'tool_use' && msg.name) {
            output += `*🔧 Used tool: ${msg.name}*${timestamp}\n\n`;
          }
        }
        
        output += `</details>\n\n`;
      }
      
      output += `---\n\n`;
    }
    
    return output;
  } catch (error) {
    // If parsing fails, return as plain text
    return `\`\`\`\n${note}\n\`\`\`\n\n`;
  }
}

/**
 * Calculates aggregate statistics from all notes
 */
function calculateAggregateStats(notes: GitNote[]): {
  totalAdditions: number;
  totalDeletions: number;
  totalAccepted: number;
  totalOverridden: number;
  avgAIPercent: number;
  totalFiles: Set<string>;
  commitCount: number;
} {
  let totalAdditions = 0;
  let totalDeletions = 0;
  let totalAccepted = 0;
  let totalOverridden = 0;
  let aiPercentSum = 0;
  let validCommits = 0;
  const totalFiles = new Set<string>();

  for (const { note } of notes) {
    try {
      const lines = note.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === '---' || line.startsWith('{')) break;
        if (line && !line.match(/^[a-f0-9\s\-]+$/)) {
          totalFiles.add(line.split(/\s+/)[0]);
        }
      }

      const jsonMatch = note.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data: AIAuthorshipNote = JSON.parse(jsonMatch[0]);
        if (data.prompts) {
          for (const prompt of Object.values(data.prompts)) {
            totalAdditions += prompt.total_additions || 0;
            totalDeletions += prompt.total_deletions || 0;
            totalAccepted += prompt.accepted_lines || 0;
            totalOverridden += prompt.overriden_lines || 0;
            
            const lines = prompt.total_additions || 0;
            if (lines > 0) {
              aiPercentSum += ((prompt.accepted_lines || 0) / lines) * 100;
              validCommits++;
            }
          }
        }
      }
    } catch {}
  }

  return {
    totalAdditions,
    totalDeletions,
    totalAccepted,
    totalOverridden,
    avgAIPercent: validCommits > 0 ? aiPercentSum / validCommits : 0,
    totalFiles,
    commitCount: notes.length
  };
}

/**
 * Formats git notes into a markdown comment for the PR
 */
function formatNotesAsComment(notes: GitNote[], notesRef: string): string {
  if (notes.length === 0) {
    return '';
  }

  const stats = calculateAggregateStats(notes);

  let comment = `## 🤖 AI Authorship Report\n\n`;
  
  // Add visual summary card
  comment += `<div align="center">\n\n`;
  comment += `### 📊 Summary Dashboard\n\n`;
  comment += `\`\`\`\n`;
  comment += `╔═══════════════════════════════════════════════════════════╗\n`;
  comment += `║                    PR STATISTICS                          ║\n`;
  comment += `╠═══════════════════════════════════════════════════════════╣\n`;
  comment += `║  📝 Commits: ${stats.commitCount.toString().padEnd(10)} 📁 Files: ${stats.totalFiles.size.toString().padEnd(16)} ║\n`;
  comment += `║  ➕ Added: ${stats.totalAdditions.toString().padEnd(12)} ➖ Removed: ${stats.totalDeletions.toString().padEnd(13)} ║\n`;
  comment += `║  ✅ Accepted: ${stats.totalAccepted.toString().padEnd(9)} 🔄 Modified: ${stats.totalOverridden.toString().padEnd(11)} ║\n`;
  comment += `╠═══════════════════════════════════════════════════════════╣\n`;
  comment += `║            🤖 AI Contribution: ${Math.round(stats.avgAIPercent)}%${' '.repeat(19 - Math.round(stats.avgAIPercent).toString().length)}║\n`;
  comment += `║            ${createProgressBar(stats.totalAccepted, stats.totalAdditions, 30).padEnd(39)}║\n`;
  comment += `╚═══════════════════════════════════════════════════════════╝\n`;
  comment += `\`\`\`\n\n`;
  comment += `</div>\n\n`;

  comment += `*Details from \`${notesRef}\`*\n\n`;

  // Add timeline if multiple commits
  if (notes.length > 1) {
    comment += `### 📅 Commit Timeline\n\n`;
    comment += `\`\`\`\n`;
    for (let i = 0; i < notes.length; i++) {
      const { commitSha } = notes[i];
      const shortSha = commitSha.substring(0, 7);
      const isLast = i === notes.length - 1;
      comment += `${isLast ? '└─' : '├─'} 📝 ${shortSha}\n`;
      if (!isLast) comment += `│\n`;
    }
    comment += `\`\`\`\n\n`;
  }

  // Individual commit details
  comment += `## 📋 Detailed Breakdown\n\n`;
  
  for (const { commitSha, note } of notes) {
    const shortSha = commitSha.substring(0, 7);
    // Add anchor for linking from inline comments
    comment += `<a name="commit-${shortSha}"></a>\n\n`;
    comment += `### 📝 Commit \`${shortSha}\`\n\n`;
    comment += formatAIAuthorship(note);
  }

  comment += `---\n*Posted by git-notes-bot*`;
  return comment;
}

/**
 * Finds an existing comment by the bot using a hidden identifier
 */
async function findExistingComment(
  octokit: ReturnType<typeof github.getOctokit>,
  owner: string,
  repo: string,
  prNumber: number,
  identifier: string
): Promise<number | null> {
  const { data: comments } = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: prNumber
  });

  for (const comment of comments) {
    if (comment.body?.includes(identifier)) {
      return comment.id;
    }
  }

  return null;
}

/**
 * Posts or updates a comment on the PR with the git notes
 */
async function postComment(
  octokit: ReturnType<typeof github.getOctokit>,
  owner: string,
  repo: string,
  prNumber: number,
  body: string,
  options: CommentOptions
): Promise<void> {
  const commentBody = `<!-- ${options.commentIdentifier} -->\n${body}`;

  if (options.updateExisting) {
    const existingCommentId = await findExistingComment(
      octokit,
      owner,
      repo,
      prNumber,
      options.commentIdentifier
    );

    if (existingCommentId) {
      await octokit.rest.issues.updateComment({
        owner,
        repo,
        comment_id: existingCommentId,
        body: commentBody
      });
      core.info(`Updated existing comment ${existingCommentId}`);
      return;
    }
  }

  await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: prNumber,
    body: commentBody
  });
  core.info('Created new comment');
}

/**
 * Adds inline review comments to PR files that were AI-modified
 * Links back to the specific prompts that created the changes
 */
async function addInlineComments(
  octokit: ReturnType<typeof github.getOctokit>,
  owner: string,
  repo: string,
  prNumber: number,
  notes: GitNote[]
): Promise<void> {
  try {
    // Extract all file AI info from notes
    const fileAIMap = new Map<string, FileAIInfo>();
    
    for (const { note, commitSha } of notes) {
      const fileInfos = extractFileAIInfo(note, commitSha);
      for (const info of fileInfos) {
        // Keep the highest AI percentage if file appears multiple times
        const existing = fileAIMap.get(info.filepath);
        if (!existing || info.aiPercent > existing.aiPercent) {
          fileAIMap.set(info.filepath, info);
        }
      }
    }

    if (fileAIMap.size === 0) {
      core.info('No file-level AI info found for inline comments');
      return;
    }

    // Get PR files to find which files are in the diff
    const { data: prFiles } = await octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: prNumber
    });

    // Build review comments for matching files
    const comments: Array<{
      path: string;
      body: string;
      line: number;
    }> = [];

    for (const prFile of prFiles) {
      const aiInfo = fileAIMap.get(prFile.filename);
      if (!aiInfo || aiInfo.aiPercent === 0) {
        continue;
      }

      // Create a comment on the first line of the file's changes
      // GitHub API requires us to comment on a line that was changed
      const targetLine = prFile.additions > 0 ? 1 : prFile.changes;
      
      if (targetLine > 0) {
        const emoji = aiInfo.aiPercent >= 80 ? '🤖' : aiInfo.aiPercent >= 50 ? '🔵' : '🟡';
        const toolInfo = aiInfo.tool && aiInfo.model ? ` (${aiInfo.tool}/${aiInfo.model})` : '';
        const shortSha = aiInfo.commitSha ? aiInfo.commitSha.substring(0, 7) : '';
        
        let commentBody = `${emoji} **AI-Modified File** - ${aiInfo.aiPercent}% AI contribution${toolInfo}\n\n`;
        commentBody += `📊 ${aiInfo.acceptedLines} of ${aiInfo.totalLines} AI-suggested lines accepted\n\n`;
        
        // Add link to the commit details with conversation
        if (shortSha) {
          commentBody += `🔗 [View full conversation and details for commit \`${shortSha}\`](#commit-${shortSha})\n\n`;
        }
        
        // Add the user prompt that created this
        if (aiInfo.userPrompt) {
          commentBody += `💬 **Original Prompt:**\n> ${aiInfo.userPrompt}\n\n`;
        }
        
        commentBody += `---\n*💡 Click the commit link above to see the complete AI conversation and detailed statistics*`;
        
        comments.push({
          path: prFile.filename,
          line: targetLine,
          body: commentBody
        });
      }
    }

    if (comments.length === 0) {
      core.info('No matching files found for inline comments');
      return;
    }

    // Check if we already have a review with these comments
    const { data: existingReviews } = await octokit.rest.pulls.listReviews({
      owner,
      repo,
      pull_number: prNumber
    });

    const botReview = existingReviews.find(review => 
      review.body?.includes('🤖 AI-Modified Files')
    );

    if (botReview) {
      core.info(`Found existing review ${botReview.id}, skipping inline comments to avoid duplicates`);
      return;
    }

    // Create a review with inline comments
    await octokit.rest.pulls.createReview({
      owner,
      repo,
      pull_number: prNumber,
      event: 'COMMENT',
      body: '🤖 **AI-Modified Files Review**\n\n' +
            'This PR includes AI-generated code. See inline comments on each file for:\n' +
            '- 💬 The original prompt that created the changes\n' +
            '- 📊 AI contribution statistics\n' +
            '- 🔗 Links to full conversation details\n\n' +
            '*Scroll down to the main bot comment for complete conversation history and detailed breakdown.*',
      comments: comments.map(c => ({
        path: c.path,
        body: c.body,
        line: c.line
      }))
    });

    core.info(`Added ${comments.length} inline comment(s) to AI-modified files with prompt links`);
  } catch (error) {
    core.warning(`Failed to add inline comments: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function run(): Promise<void> {
  try {
    // Get inputs
    const token = core.getInput('github-token', { required: true });
    const notesRef = core.getInput('notes-ref') || 'refs/notes/commits';
    const updateExisting = core.getInput('update-existing') === 'true';
    const addInlineCommentsFlag = core.getInput('add-inline-comments') === 'true';

    // Get PR context
    const context = github.context;

    if (!context.payload.pull_request) {
      core.setFailed('This action only works on pull request events');
      return;
    }

    const prNumber = context.payload.pull_request.number;
    const baseSha = context.payload.pull_request.base.sha;
    const headSha = context.payload.pull_request.head.sha;
    const owner = context.repo.owner;
    const repo = context.repo.repo;

    core.info(`Processing PR #${prNumber}`);
    core.info(`Base SHA: ${baseSha}`);
    core.info(`Head SHA: ${headSha}`);
    core.info(`Notes ref: ${notesRef}`);
    core.info(`Inline comments: ${addInlineCommentsFlag ? 'enabled' : 'disabled'}`);

    // Fetch git notes from remote
    core.info('Fetching git notes from remote...');
    await fetchGitNotes(notesRef);

    // Get notes for commits in the PR
    core.info('Reading git notes for PR commits...');
    const notes = await getNotesForCommitRange(baseSha, headSha, notesRef);

    if (notes.length === 0) {
      core.info('No git notes found for commits in this PR');
      core.setOutput('notes-found', 'false');
      core.setOutput('notes-count', '0');
      return;
    }

    core.info(`Found ${notes.length} commit(s) with notes`);
    core.setOutput('notes-found', 'true');
    core.setOutput('notes-count', notes.length.toString());

    // Format and post comment
    const octokit = github.getOctokit(token);
    const commentBody = formatNotesAsComment(notes, notesRef);

    await postComment(octokit, owner, repo, prNumber, commentBody, {
      updateExisting,
      commentIdentifier: 'git-notes-bot'
    });

    core.info('Successfully posted git notes to PR');

    // Add inline comments if enabled
    if (addInlineCommentsFlag) {
      core.info('Adding inline comments to AI-modified files...');
      await addInlineComments(octokit, owner, repo, prNumber, notes);
    }

  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed('An unexpected error occurred');
    }
  }
}

run();
