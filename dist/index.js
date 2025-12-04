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
            output += `\`\`\`\n`;
            output += `you  ${'█'.repeat(humanWidth)}${'░'.repeat(aiWidth)} ai\n`;
            output += `     ${humanPercent}%${' '.repeat(barWidth - humanPercent.toString().length - aiPercent.toString().length - 1)}${aiPercent}%\n`;
            const acceptanceRate = totalLines > 0 ? Math.round((aiLines / totalLines) * 100) : 0;
            output += `     ${acceptanceRate}% AI code accepted\n`;
            output += `\`\`\`\n\n`;
            // Code Statistics
            const totalChanges = (prompt.total_additions || 0) + (prompt.total_deletions || 0);
            output += `#### 📊 Code Changes\n\n`;
            output += `| Metric | Count | Visualization |\n`;
            output += `|--------|-------|---------------|\n`;
            output += `| ➕ Additions | ${prompt.total_additions || 0} | ${createProgressBar(prompt.total_additions || 0, totalChanges)} |\n`;
            output += `| ➖ Deletions | ${prompt.total_deletions || 0} | ${createProgressBar(prompt.total_deletions || 0, totalChanges)} |\n`;
            output += `| ✅ Accepted | ${prompt.accepted_lines || 0} | ${createProgressBar(prompt.accepted_lines || 0, prompt.total_additions || 1)} |\n`;
            output += `| 🔄 Overridden | ${prompt.overriden_lines || 0} | ${createProgressBar(prompt.overriden_lines || 0, prompt.total_additions || 1)} |\n\n`;
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
                    if (msg.type === 'user') {
                        output += `**👤 User:** ${msg.text}\n\n`;
                    }
                    else if (msg.type === 'assistant' && msg.text) {
                        output += `**🤖 Assistant:** ${msg.text}\n\n`;
                    }
                    else if (msg.type === 'tool_use' && msg.name) {
                        output += `*🔧 Used tool: ${msg.name}*\n\n`;
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
 * Formats git notes into a markdown comment for the PR
 */
function formatNotesAsComment(notes, notesRef) {
    if (notes.length === 0) {
        return '';
    }
    let comment = `## 🤖 AI Authorship Report\n\n`;
    comment += `*AI contributions from \`${notesRef}\`*\n\n`;
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
