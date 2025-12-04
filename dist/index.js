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
 * Formats git notes into a markdown comment for the PR
 */
function formatNotesAsComment(notes, notesRef) {
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
