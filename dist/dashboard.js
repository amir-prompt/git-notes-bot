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
exports.aggregateDashboardData = aggregateDashboardData;
const exec = __importStar(require("@actions/exec"));
/**
 * Gets all commits with git notes in the repository
 */
async function getAllCommitsWithNotes(notesRef, since) {
    const commits = [];
    // Get all commits
    let commitsOutput = '';
    const args = ['log', '--format=%H|%aI|%an|%s', '--notes=' + notesRef];
    if (since) {
        args.push(`--since=${since}`);
    }
    await exec.exec('git', args, {
        listeners: {
            stdout: (data) => {
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
                    stdout: (data) => {
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
        }
        catch {
            // No note for this commit
        }
    }
    return commits;
}
/**
 * Gets the actual additions/deletions for a commit from git diff
 */
async function getCommitStats(sha) {
    let output = '';
    try {
        await exec.exec('git', ['show', '--shortstat', '--format=', sha], {
            listeners: {
                stdout: (data) => {
                    output += data.toString();
                }
            },
            ignoreReturnCode: true
        });
        // Parse output like: " 1 file changed, 67 insertions(+)"
        const match = output.match(/(\d+) insertion[s]?\(\+\)[,]?\s*(?:(\d+) deletion[s]?\(-\))?/);
        if (match) {
            return {
                additions: parseInt(match[1]) || 0,
                deletions: parseInt(match[2]) || 0
            };
        }
    }
    catch {
        // Ignore errors
    }
    return { additions: 0, deletions: 0 };
}
/**
 * Parses an AI authorship note and extracts metrics
 */
function parseAINote(note) {
    try {
        const lines = note.split('\n');
        const filePaths = [];
        // Extract file paths
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line === '---' || line.startsWith('{'))
                break;
            // Skip empty lines and lines that look like commit hashes (16 hex chars)
            if (line && !line.match(/^[a-f0-9]{16}$/)) {
                filePaths.push(line.split(/\s+/)[0]);
            }
        }
        // Extract JSON
        const jsonMatch = note.match(/\{[\s\S]*\}/);
        if (!jsonMatch)
            return null;
        const data = JSON.parse(jsonMatch[0]);
        if (!data.prompts)
            return null;
        // Aggregate data from all prompts
        let totalAdditions = 0;
        let totalDeletions = 0;
        let acceptedLines = 0;
        let overriddenLines = 0;
        let model;
        let tool;
        let author;
        for (const prompt of Object.values(data.prompts)) {
            totalAdditions += prompt.total_additions || 0;
            totalDeletions += prompt.total_deletions || 0;
            acceptedLines += prompt.accepted_lines || 0;
            overriddenLines += prompt.overriden_lines || 0;
            if (!model && prompt.agent_id?.model)
                model = prompt.agent_id.model;
            if (!tool && prompt.agent_id?.tool)
                tool = prompt.agent_id.tool;
            if (!author && prompt.human_author)
                author = prompt.human_author;
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
    }
    catch {
        return null;
    }
}
/**
 * Aggregates all git notes data into dashboard statistics
 */
async function aggregateDashboardData(notesRef = 'refs/notes/commits', since) {
    const commits = await getAllCommitsWithNotes(notesRef, since);
    const data = {
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
    const fileSet = new Set();
    for (const commit of commits) {
        const parsed = parseAINote(commit.note);
        if (!parsed)
            continue;
        const commitDate = commit.date.split('T')[0];
        // If the note has no additions recorded (manual commit), get real stats from git
        let totalLines = parsed.totalAdditions;
        let totalDeletions = parsed.totalDeletions;
        if (totalLines === 0 && !parsed.model) {
            // Manual commit - get actual stats from git
            const stats = await getCommitStats(commit.sha);
            totalLines = stats.additions;
            totalDeletions = stats.deletions;
        }
        // Measure code written: only count additions (lines of code added)
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
            }
            else {
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
        }
        else {
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
            }
            else {
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
            }
            else {
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
            }
            else {
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
                model: parsed.model,
                tool: parsed.tool
            });
        }
    }
    data.totalFiles = fileSet.size;
    data.humanLines = data.totalLines - data.aiLines;
    data.aiPercentage = data.totalLines > 0 ? (data.aiLines / data.totalLines) * 100 : 0;
    // Calculate acceptance rates over time
    const sortedDates = Array.from(data.commitsByDate.values()).sort((a, b) => a.date.localeCompare(b.date));
    data.acceptanceRates = sortedDates.map(d => ({
        date: d.date,
        rate: d.aiPercent
    }));
    return data;
}
