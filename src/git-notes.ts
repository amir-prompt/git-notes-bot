import * as exec from '@actions/exec';

export interface GitNote {
  commitSha: string;
  note: string;
}

/**
 * Fetches git notes from the remote repository
 * Git notes are stored in refs/notes/* and need to be explicitly fetched
 */
export async function fetchGitNotes(notesRef: string = 'refs/notes/commits'): Promise<void> {
  try {
    await exec.exec('git', ['fetch', 'origin', `${notesRef}:${notesRef}`]);
  } catch (error) {
    // Notes ref might not exist, which is fine
    console.log(`Note: Could not fetch ${notesRef} - it may not exist yet`);
  }
}

/**
 * Gets the git note for a specific commit
 */
export async function getGitNote(commitSha: string, notesRef?: string): Promise<string | null> {
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
        stdout: (data: Buffer) => {
          output += data.toString();
        },
        stderr: (data: Buffer) => {
          errorOutput += data.toString();
        }
      },
      ignoreReturnCode: true
    });

    if (output.trim()) {
      return output.trim();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Gets git notes for all commits in a range (e.g., commits in a PR)
 */
export async function getNotesForCommitRange(baseSha: string, headSha: string, notesRef?: string): Promise<GitNote[]> {
  const notes: GitNote[] = [];

  // Get list of commits in the range
  let commitsOutput = '';
  await exec.exec('git', ['rev-list', `${baseSha}..${headSha}`], {
    listeners: {
      stdout: (data: Buffer) => {
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
export async function listNotesRefs(): Promise<string[]> {
  let output = '';

  try {
    await exec.exec('git', ['notes', '--list'], {
      listeners: {
        stdout: (data: Buffer) => {
          output += data.toString();
        }
      },
      ignoreReturnCode: true
    });
  } catch {
    // No notes exist
  }

  // Also check for other notes refs
  let refsOutput = '';
  try {
    await exec.exec('git', ['for-each-ref', '--format=%(refname)', 'refs/notes/'], {
      listeners: {
        stdout: (data: Buffer) => {
          refsOutput += data.toString();
        }
      },
      ignoreReturnCode: true
    });
  } catch {
    // No refs found
  }

  return refsOutput.trim().split('\n').filter(Boolean);
}
