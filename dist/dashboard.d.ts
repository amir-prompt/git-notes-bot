export interface DashboardData {
    totalCommits: number;
    totalFiles: number;
    totalLines: number;
    aiLines: number;
    humanLines: number;
    aiPercentage: number;
    commitsByDate: Map<string, CommitStats>;
    modelUsage: Map<string, ModelStats>;
    toolUsage: Map<string, ToolStats>;
    authorStats: Map<string, AuthorStats>;
    fileStats: Map<string, FileStats>;
    acceptanceRates: Array<{
        date: string;
        rate: number;
    }>;
    recentCommits: Array<CommitDetail>;
}
export interface CommitStats {
    date: string;
    count: number;
    aiLines: number;
    totalLines: number;
    aiPercent: number;
}
export interface ModelStats {
    model: string;
    commits: number;
    lines: number;
    acceptedLines: number;
    acceptanceRate: number;
}
export interface ToolStats {
    tool: string;
    commits: number;
    lines: number;
}
export interface AuthorStats {
    author: string;
    commits: number;
    totalLines: number;
    aiAssistedLines: number;
    aiUsagePercent: number;
}
export interface FileStats {
    filepath: string;
    modifications: number;
    aiLines: number;
    totalLines: number;
    lastModified: string;
}
export interface CommitDetail {
    sha: string;
    shortSha: string;
    date: string;
    author: string;
    message: string;
    aiPercent: number;
    model?: string;
    tool?: string;
}
/**
 * Aggregates all git notes data into dashboard statistics
 */
export declare function aggregateDashboardData(notesRef?: string, since?: string): Promise<DashboardData>;
