"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const git_notes_1 = require("./git-notes");
/**
 * Creates a visual progress bar using Unicode characters
 */
function createProgressBar(value, total, width = 20) {
    const percentage = total > 0 ? (value / total) * 100 : 0;
    const filled = Math.round((value / total) * width);
    const empty = width - filled;
    return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${percentage.toFixed(0)}%`;
}
/**
 * Creates a circular pie chart representation using Unicode
 */
function createPieChart(percentage) {
    // Use circle emojis to represent pie chart
    if (percentage >= 87.5)
        return '🟢'; // 7/8 - 8/8
    if (percentage >= 75)
        return '🔵'; // 6/8 - 7/8
    if (percentage >= 62.5)
        return '🟡'; // 5/8 - 6/8
    if (percentage >= 50)
        return '🟠'; // 4/8 - 5/8
    if (percentage >= 37.5)
        return '🟠'; // 3/8 - 4/8
    if (percentage >= 25)
        return '🔴'; // 2/8 - 3/8
    if (percentage >= 12.5)
        return '🔴'; // 1/8 - 2/8
    return '⚪'; // 0 - 1/8
}
/**
 * Creates a visual donut chart for AI vs Human contributions
 */
function createDonutChart(aiPercent) {
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
function formatTimestamp(timestamp) {
    try {
        const date = new Date(timestamp);
        const options = {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        };
        return date.toLocaleString('en-US', options);
    }
    catch {
        return timestamp;
    }
}
/**
 * Calculates duration between two timestamps and formats it
 */
function formatDuration(startTime, endTime) {
    try {
        const start = new Date(startTime).getTime();
        const end = new Date(endTime).getTime();
        const diffMs = end - start;
        if (diffMs < 0)
            return 'N/A';
        const seconds = Math.floor(diffMs / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        if (days > 0) {
            const remainingHours = hours % 24;
            return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
        }
        else if (hours > 0) {
            const remainingMinutes = minutes % 60;
            return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
        }
        else if (minutes > 0) {
            const remainingSeconds = seconds % 60;
            return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
        }
        else {
            return `${seconds}s`;
        }
    }
    catch {
        return 'N/A';
    }
}
/**
 * Formats AI authorship data in a graphical way
 */
function formatAIAuthorship(note) {
    try {
        // Extract file paths from the beginning of the note
        const lines = note.split('\n');
        const filePaths = [];
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
        const data = JSON.parse(jsonMatch[0]);
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
                    .filter(t => t !== undefined);
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
                    if (msg.type === 'user')
                        userMessages++;
                    else if (msg.type === 'assistant')
                        assistantMessages++;
                    else if (msg.type === 'tool_use')
                        toolUses++;
                }
                output += `- 👤 User messages: ${userMessages}\n`;
                output += `- 🤖 Assistant messages: ${assistantMessages}\n`;
                output += `- 🔧 Tool uses: ${toolUses}\n\n`;
                output += `<details>\n<summary>View full conversation</summary>\n\n`;
                for (const msg of prompt.messages) {
                    const timestamp = msg.timestamp ? ` *(${formatTimestamp(msg.timestamp)})*` : '';
                    if (msg.type === 'user') {
                        output += `**👤 User:**${timestamp} ${msg.text}\n\n`;
                    }
                    else if (msg.type === 'assistant' && msg.text) {
                        output += `**🤖 Assistant:**${timestamp} ${msg.text}\n\n`;
                    }
                    else if (msg.type === 'tool_use' && msg.name) {
                        output += `*🔧 Used tool: ${msg.name}*${timestamp}\n\n`;
                    }
                }
                output += `</details>\n\n`;
            }
            output += `---\n\n`;
        }
        return output;
    }
    catch (error) {
        // If parsing fails, return as plain text
        return `\`\`\`\n${note}\n\`\`\`\n\n`;
    }
}
/**
 * Calculates aggregate statistics from all notes
 */
function calculateAggregateStats(notes) {
    let totalAdditions = 0;
    let totalDeletions = 0;
    let totalAccepted = 0;
    let totalOverridden = 0;
    let aiPercentSum = 0;
    let validCommits = 0;
    const totalFiles = new Set();
    for (const { note } of notes) {
        try {
            const lines = note.split('\n');
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line === '---' || line.startsWith('{'))
                    break;
                if (line && !line.match(/^[a-f0-9\s\-]+$/)) {
                    totalFiles.add(line.split(/\s+/)[0]);
                }
            }
            const jsonMatch = note.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const data = JSON.parse(jsonMatch[0]);
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
        }
        catch { }
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
function formatNotesAsComment(notes, notesRef) {
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
            if (!isLast)
                comment += `│\n`;
        }
        comment += `\`\`\`\n\n`;
    }
    // Individual commit details
    comment += `## 📋 Detailed Breakdown\n\n`;
    for (const { commitSha, note } of notes) {
        const shortSha = commitSha.substring(0, 7);
        comment += `### 📝 Commit \`${shortSha}\`\n\n`;
        comment += formatAIAuthorship(note);
    }
    comment += `---\n*Posted by git-notes-bot*`;
    return comment;
}
/**
 * Finds an existing comment by the bot using a hidden identifier
 */
async function findExistingComment(octokit, owner, repo, prNumber, identifier) {
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
async function postComment(octokit, owner, repo, prNumber, body, options) {
    const commentBody = `<!-- ${options.commentIdentifier} -->\n${body}`;
    if (options.updateExisting) {
        const existingCommentId = await findExistingComment(octokit, owner, repo, prNumber, options.commentIdentifier);
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
async function run() {
    try {
        // Get inputs
        const token = core.getInput('github-token', { required: true });
        const notesRef = core.getInput('notes-ref') || 'refs/notes/commits';
        const updateExisting = core.getInput('update-existing') === 'true';
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
        // Fetch git notes from remote
        core.info('Fetching git notes from remote...');
        await (0, git_notes_1.fetchGitNotes)(notesRef);
        // Get notes for commits in the PR
        core.info('Reading git notes for PR commits...');
        const notes = await (0, git_notes_1.getNotesForCommitRange)(baseSha, headSha, notesRef);
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
    }
    catch (error) {
        if (error instanceof Error) {
            core.setFailed(error.message);
        }
        else {
            core.setFailed('An unexpected error occurred');
        }
    }
}
run();
