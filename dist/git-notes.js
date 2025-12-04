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
exports.fetchGitNotes = fetchGitNotes;
exports.getGitNote = getGitNote;
exports.getNotesForCommitRange = getNotesForCommitRange;
exports.listNotesRefs = listNotesRefs;
const exec = __importStar(require("@actions/exec"));
/**
 * Fetches git notes from the remote repository
 * Git notes are stored in refs/notes/* and need to be explicitly fetched
 */
async function fetchGitNotes(notesRef = 'refs/notes/commits') {
    try {
        await exec.exec('git', ['fetch', 'origin', `${notesRef}:${notesRef}`]);
    }
    catch (error) {
        // Notes ref might not exist, which is fine
        console.log(`Note: Could not fetch ${notesRef} - it may not exist yet`);
    }
}
/**
 * Gets the git note for a specific commit
 */
async function getGitNote(commitSha, notesRef) {
    let output = '';
    let errorOutput = '';
    const args = ['notes'];
    if (notesRef) {
        args.push('--ref', notesRef);
    }
    args.push('show', commitSha);
    try {
        await exec.exec('git', args, {
            listeners: {
                stdout: (data) => {
                    output += data.toString();
                },
                stderr: (data) => {
                    errorOutput += data.toString();
                }
            },
            ignoreReturnCode: true
        });
        if (output.trim()) {
            return output.trim();
        }
        return null;
    }
    catch {
        return null;
    }
}
/**
 * Gets git notes for all commits in a range (e.g., commits in a PR)
 */
async function getNotesForCommitRange(baseSha, headSha, notesRef) {
    const notes = [];
    // Get list of commits in the range
    let commitsOutput = '';
    await exec.exec('git', ['rev-list', `${baseSha}..${headSha}`], {
        listeners: {
            stdout: (data) => {
                commitsOutput += data.toString();
            }
        }
    });
    const commits = commitsOutput.trim().split('\n').filter(Boolean);
    for (const commitSha of commits) {
        const note = await getGitNote(commitSha, notesRef);
        if (note) {
            notes.push({ commitSha, note });
        }
    }
    return notes;
}
/**
 * Lists all available notes refs in the repository
 */
async function listNotesRefs() {
    let output = '';
    try {
        await exec.exec('git', ['notes', '--list'], {
            listeners: {
                stdout: (data) => {
                    output += data.toString();
                }
            },
            ignoreReturnCode: true
        });
    }
    catch {
        // No notes exist
    }
    // Also check for other notes refs
    let refsOutput = '';
    try {
        await exec.exec('git', ['for-each-ref', '--format=%(refname)', 'refs/notes/'], {
            listeners: {
                stdout: (data) => {
                    refsOutput += data.toString();
                }
            },
            ignoreReturnCode: true
        });
    }
    catch {
        // No refs found
    }
    return refsOutput.trim().split('\n').filter(Boolean);
}
