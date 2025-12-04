export interface GitNote {
    commitSha: string;
    note: string;
}
/**
 * Fetches git notes from the remote repository
 * Git notes are stored in refs/notes/* and need to be explicitly fetched
 */
export declare function fetchGitNotes(notesRef?: string): Promise<void>;
/**
 * Gets the git note for a specific commit
 */
export declare function getGitNote(commitSha: string, notesRef?: string): Promise<string | null>;
/**
 * Gets git notes for all commits in a range (e.g., commits in a PR)
 */
export declare function getNotesForCommitRange(baseSha: string, headSha: string, notesRef?: string): Promise<GitNote[]>;
/**
 * Lists all available notes refs in the repository
 */
export declare function listNotesRefs(): Promise<string[]>;
