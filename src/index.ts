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
      }>;
      total_additions?: number;
      total_deletions?: number;
      accepted_lines?: number;
      overriden_lines?: number;
    };
  };
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
 * Formats AI authorship data in a graphical way
 */
function formatAIAuthorship(note: string): string {
  try {
    const data: AIAuthorshipNote = JSON.parse(note);
    
    if (!data.prompts) {
      return `\`\`\`\n${note}\n\`\`\`\n\n`;
    }

    let output = '';
    
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
          if (msg.type === 'user') userMessages++;
          else if (msg.type === 'assistant') assistantMessages++;
          else if (msg.type === 'tool_use') toolUses++;
        }
        
        output += `- 👤 User messages: ${userMessages}\n`;
        output += `- 🤖 Assistant messages: ${assistantMessages}\n`;
        output += `- 🔧 Tool uses: ${toolUses}\n\n`;
        
        output += `<details>\n<summary>View full conversation</summary>\n\n`;
        
        for (const msg of prompt.messages) {
          if (msg.type === 'user') {
            output += `**👤 User:** ${msg.text}\n\n`;
          } else if (msg.type === 'assistant' && msg.text) {
            output += `**🤖 Assistant:** ${msg.text}\n\n`;
          } else if (msg.type === 'tool_use' && msg.name) {
            output += `*🔧 Used tool: ${msg.name}*\n\n`;
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
 * Formats git notes into a markdown comment for the PR
 */
function formatNotesAsComment(notes: GitNote[], notesRef: string): string {
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

async function run(): Promise<void> {
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

  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed('An unexpected error occurred');
    }
  }
}

run();
