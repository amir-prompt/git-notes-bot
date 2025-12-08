import * as exec from '@actions/exec';

export interface DashboardData {
  // Overview stats
  totalCommits: number;
  totalFiles: number;
  totalLines: number;
  aiLines: number;
  humanLines: number;
  aiPercentage: number;
  
  // Timeline data
  commitsByDate: Map<string, CommitStats>;
  
  // Model usage
  modelUsage: Map<string, ModelStats>;
  
  // Tool usage
  toolUsage: Map<string, ToolStats>;
  
  // Author stats
  authorStats: Map<string, AuthorStats>;
  
  // File stats
  fileStats: Map<string, FileStats>;
  
  // Acceptance rates over time
  acceptanceRates: Array<{ date: string; rate: number }>;
  
  // Recent activity
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
  totalLines: number;
  aiLines: number;
  model?: string;
  tool?: string;
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
 * Gets all commits with git notes in the repository
 */
async function getAllCommitsWithNotes(notesRef: string, since?: string): Promise<Array<{ sha: string; note: string; date: string; author: string; message: string }>> {
  const commits: Array<{ sha: string; note: string; date: string; author: string; message: string }> = [];
  
  // Get all commits
  let commitsOutput = '';
  const args = ['log', '--format=%H|%aI|%an|%s', '--notes=' + notesRef];
  if (since) {
    args.push(`--since=${since}`);
  }
  
  await exec.exec('git', args, {
    listeners: {
      stdout: (data: Buffer) => {
        commitsOutput += data.toString();
      }
    },
    ignoreReturnCode: true
  });
  
  const commitLines = commitsOutput.trim().split('\n').filter(Boolean);
  
  for (const line of commitLines) {
    const [sha, date, author, ...messageParts] = line.split('|');
    const message = messageParts.join('|');
    
    // Try to get the note for this commit
    let noteOutput = '';
    try {
      await exec.exec('git', ['notes', '--ref', notesRef, 'show', sha], {
        listeners: {
          stdout: (data: Buffer) => {
            noteOutput += data.toString();
          }
        },
        ignoreReturnCode: true
      });
      
      if (noteOutput.trim()) {
        commits.push({
          sha,
          note: noteOutput.trim(),
          date,
          author,
          message
        });
      }
    } catch {
      // No note for this commit
    }
  }
  
  return commits;
}

/**
 * Parses an AI authorship note and extracts metrics
 */
function parseAINote(note: string): {
  files: string[];
  totalAdditions: number;
  totalDeletions: number;
  acceptedLines: number;
  overriddenLines: number;
  model?: string;
  tool?: string;
  author?: string;
} | null {
  try {
    const lines = note.split('\n');
    const filePaths: string[] = [];
    
    // Extract file paths
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line === '---' || line.startsWith('{')) break;
      // Skip empty lines and lines that look like commit hashes (16 hex chars)
      if (line && !line.match(/^[a-f0-9]{16}$/)) {
        filePaths.push(line.split(/\s+/)[0]);
      }
    }
    
    // Extract JSON
    const jsonMatch = note.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    
    const data: AIAuthorshipNote = JSON.parse(jsonMatch[0]);
    if (!data.prompts) return null;
    
    // Aggregate data from all prompts
    let totalAdditions = 0;
    let totalDeletions = 0;
    let acceptedLines = 0;
    let overriddenLines = 0;
    let model: string | undefined;
    let tool: string | undefined;
    let author: string | undefined;
    
    for (const prompt of Object.values(data.prompts)) {
      totalAdditions += prompt.total_additions || 0;
      totalDeletions += prompt.total_deletions || 0;
      acceptedLines += prompt.accepted_lines || 0;
      overriddenLines += prompt.overriden_lines || 0;
      
      if (!model && prompt.agent_id?.model) model = prompt.agent_id.model;
      if (!tool && prompt.agent_id?.tool) tool = prompt.agent_id.tool;
      if (!author && prompt.human_author) author = prompt.human_author;
    }
    
    return {
      files: filePaths,
      totalAdditions,
      totalDeletions,
      acceptedLines,
      overriddenLines,
      model,
      tool,
      author
    };
  } catch {
    return null;
  }
}

/**
 * Aggregates all git notes data into dashboard statistics
 */
export async function aggregateDashboardData(
  notesRef: string = 'refs/notes/commits',
  since?: string
): Promise<DashboardData> {
  const commits = await getAllCommitsWithNotes(notesRef, since);
  
  const data: DashboardData = {
    totalCommits: commits.length,
    totalFiles: 0,
    totalLines: 0,
    aiLines: 0,
    humanLines: 0,
    aiPercentage: 0,
    commitsByDate: new Map(),
    modelUsage: new Map(),
    toolUsage: new Map(),
    authorStats: new Map(),
    fileStats: new Map(),
    acceptanceRates: [],
    recentCommits: []
  };
  
  const fileSet = new Set<string>();
  
  for (const commit of commits) {
    const parsed = parseAINote(commit.note);
    if (!parsed) continue;
    
    const commitDate = commit.date.split('T')[0];
    
    // Use data from git notes for consistency
    // total_additions from note = total lines added that were tracked
    // accepted_lines from note = lines that came from AI
    const totalLines = parsed.totalAdditions;
    const aiLines = parsed.acceptedLines;
    const aiPercent = totalLines > 0 ? (aiLines / totalLines) * 100 : 0;
    
    // Track files - divide stats evenly among files in the commit
    const fileCount = parsed.files.length || 1;
    const linesPerFile = totalLines / fileCount;
    const aiLinesPerFile = aiLines / fileCount;
    
    for (const file of parsed.files) {
      fileSet.add(file);
      
      const existing = data.fileStats.get(file);
      if (existing) {
        existing.modifications++;
        existing.aiLines += aiLinesPerFile;
        existing.totalLines += linesPerFile;
        existing.lastModified = commit.date;
      } else {
        data.fileStats.set(file, {
          filepath: file,
          modifications: 1,
          aiLines: aiLinesPerFile,
          totalLines: linesPerFile,
          lastModified: commit.date
        });
      }
    }
    
    // Aggregate totals
    data.totalLines += totalLines;
    data.aiLines += aiLines;
    
    // Track by date
    const dateStats = data.commitsByDate.get(commitDate);
    if (dateStats) {
      dateStats.count++;
      dateStats.aiLines += aiLines;
      dateStats.totalLines += totalLines;
      dateStats.aiPercent = dateStats.totalLines > 0 
        ? (dateStats.aiLines / dateStats.totalLines) * 100 
        : 0;
    } else {
      data.commitsByDate.set(commitDate, {
        date: commitDate,
        count: 1,
        aiLines,
        totalLines,
        aiPercent
      });
    }
    
    // Track model usage
    if (parsed.model) {
      const modelStats = data.modelUsage.get(parsed.model);
      if (modelStats) {
        modelStats.commits++;
        modelStats.lines += totalLines;
        modelStats.acceptedLines += aiLines;
        modelStats.acceptanceRate = modelStats.lines > 0
          ? (modelStats.acceptedLines / modelStats.lines) * 100
          : 0;
      } else {
        data.modelUsage.set(parsed.model, {
          model: parsed.model,
          commits: 1,
          lines: totalLines,
          acceptedLines: aiLines,
          acceptanceRate: totalLines > 0 ? (aiLines / totalLines) * 100 : 0
        });
      }
    }
    
    // Track tool usage
    if (parsed.tool) {
      const toolStats = data.toolUsage.get(parsed.tool);
      if (toolStats) {
        toolStats.commits++;
        toolStats.lines += totalLines;
      } else {
        data.toolUsage.set(parsed.tool, {
          tool: parsed.tool,
          commits: 1,
          lines: totalLines
        });
      }
    }
    
    // Track author stats
    if (parsed.author) {
      const authorStats = data.authorStats.get(parsed.author);
      if (authorStats) {
        authorStats.commits++;
        authorStats.totalLines += totalLines;
        authorStats.aiAssistedLines += aiLines;
        authorStats.aiUsagePercent = authorStats.totalLines > 0
          ? (authorStats.aiAssistedLines / authorStats.totalLines) * 100
          : 0;
      } else {
        data.authorStats.set(parsed.author, {
          author: parsed.author,
          commits: 1,
          totalLines,
          aiAssistedLines: aiLines,
          aiUsagePercent: totalLines > 0 ? (aiLines / totalLines) * 100 : 0
        });
      }
    }
    
    // Add to recent commits (limit to 20)
    if (data.recentCommits.length < 20) {
      data.recentCommits.push({
        sha: commit.sha,
        shortSha: commit.sha.substring(0, 7),
        date: commit.date,
        author: commit.author,
        message: commit.message,
        aiPercent,
        totalLines,
        aiLines,
        model: parsed.model,
        tool: parsed.tool
      });
    }
  }
  
  data.totalFiles = fileSet.size;
  data.humanLines = data.totalLines - data.aiLines;
  data.aiPercentage = data.totalLines > 0 ? (data.aiLines / data.totalLines) * 100 : 0;
  
  // Calculate acceptance rates over time
  const sortedDates = Array.from(data.commitsByDate.values()).sort((a, b) => 
    a.date.localeCompare(b.date)
  );
  data.acceptanceRates = sortedDates.map(d => ({
    date: d.date,
    rate: d.aiPercent
  }));
  
  return data;
}

