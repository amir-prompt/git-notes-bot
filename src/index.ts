import * as core from '@actions/core';
import * as github from '@actions/github';
import { fetchGitNotes, getNotesForCommitRange, GitNote } from './git-notes';

interface CommentOptions {
  updateExisting: boolean;
  commentIdentifier: string;
}

/**
 * Formats git notes into a markdown comment for the PR
 */
function formatNotesAsComment(notes: GitNote[], notesRef: string): string {
  if (notes.length === 0) {
    return '';
  }

  let comment = `## 📝 Git Notes\n\n`;
  comment += `*Notes from \`${notesRef}\`*\n\n`;

  for (const { commitSha, note } of notes) {
    const shortSha = commitSha.substring(0, 7);
    comment += `### Commit \`${shortSha}\`\n\n`;
    comment += '```\n';
    comment += note;
    comment += '\n```\n\n';
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
