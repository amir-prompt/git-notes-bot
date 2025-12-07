#!/usr/bin/env node

/**
 * CLI tool to generate an AI authorship dashboard from git notes
 * Usage: npx ts-node generate-dashboard.ts [options]
 */

import * as fs from 'fs';
import * as path from 'path';
import { aggregateDashboardData } from './src/dashboard';
import { generateDashboardHTML } from './src/dashboard-html';

interface Options {
  output: string;
  notesRef: string;
  since?: string;
  repoName?: string;
}

function parseArgs(): Options {
  const args = process.argv.slice(2);
  const options: Options = {
    output: 'ai-dashboard.html',
    notesRef: 'refs/notes/commits'
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
    
    if (arg === '--output' || arg === '-o') {
      options.output = args[++i];
    } else if (arg === '--notes-ref' || arg === '-n') {
      options.notesRef = args[++i];
    } else if (arg === '--since' || arg === '-s') {
      options.since = args[++i];
    } else if (arg === '--repo-name' || arg === '-r') {
      options.repoName = args[++i];
    }
  }
  
  return options;
}

function printHelp(): void {
  console.log(`
🤖 AI Authorship Dashboard Generator

Generate a beautiful HTML dashboard with AI code contribution statistics.

Usage:
  npx ts-node generate-dashboard.ts [options]

Options:
  -o, --output <file>       Output HTML file (default: ai-dashboard.html)
  -n, --notes-ref <ref>     Git notes ref to read (default: refs/notes/commits)
  -s, --since <date>        Only include commits since this date (e.g., "6 months ago", "2024-01-01")
  -r, --repo-name <name>    Repository name to display in dashboard
  -h, --help                Show this help message

Examples:
  # Generate dashboard for last 6 months
  npx ts-node generate-dashboard.ts --since "6 months ago"
  
  # Custom output file and repo name
  npx ts-node generate-dashboard.ts -o my-dashboard.html -r "My Project"
  
  # Specific notes reference
  npx ts-node generate-dashboard.ts -n refs/notes/ai
  
  # Combine options
  npx ts-node generate-dashboard.ts -o report.html -s "2024-01-01" -r "MyRepo"

Note: This tool must be run from within a git repository with git notes.
  `);
}

async function main(): Promise<void> {
  console.log('🤖 AI Authorship Dashboard Generator\n');
  
  // Parse command line arguments
  const options = parseArgs();
  
  console.log('📋 Configuration:');
  console.log(`   Output file: ${options.output}`);
  console.log(`   Notes ref: ${options.notesRef}`);
  if (options.since) {
    console.log(`   Since: ${options.since}`);
  }
  if (options.repoName) {
    console.log(`   Repository: ${options.repoName}`);
  }
  console.log();
  
  try {
    // Check if we're in a git repository
    if (!fs.existsSync('.git')) {
      console.error('❌ Error: Not a git repository. Please run this command from the root of your git repository.');
      process.exit(1);
    }
    
    console.log('📊 Aggregating data from git notes...');
    
    // Aggregate dashboard data
    const data = await aggregateDashboardData(options.notesRef, options.since);
    
    console.log(`✅ Found ${data.totalCommits} commits with AI authorship data`);
    console.log(`   ${data.totalFiles} files modified`);
    console.log(`   ${data.totalLines.toLocaleString()} total lines`);
    console.log(`   ${data.aiPercentage.toFixed(1)}% AI contribution\n`);
    
    if (data.totalCommits === 0) {
      console.warn('⚠️  No commits with AI authorship data found.');
      console.log('   Make sure:');
      console.log('   1. You have git notes attached to commits');
      console.log('   2. Notes are in the correct format (Git AI / Cursor format)');
      console.log(`   3. The notes ref "${options.notesRef}" exists\n`);
      console.log('   Run: git log --show-notes to check for notes');
      process.exit(1);
    }
    
    console.log('🎨 Generating HTML dashboard...');
    
    // Generate HTML
    const html = generateDashboardHTML(data, options.repoName);
    
    // Write to file
    const outputPath = path.resolve(options.output);
    fs.writeFileSync(outputPath, html, 'utf-8');
    
    console.log(`✅ Dashboard generated successfully!`);
    console.log(`   File: ${outputPath}`);
    console.log(`   Size: ${(html.length / 1024).toFixed(2)} KB\n`);
    console.log('🌐 Open the file in your browser to view the dashboard:');
    console.log(`   open ${outputPath}`);
    console.log(`   # or`);
    console.log(`   file://${outputPath}\n`);
    
  } catch (error) {
    console.error('❌ Error generating dashboard:');
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
      if (error.stack) {
        console.error('\nStack trace:');
        console.error(error.stack);
      }
    } else {
      console.error('   Unknown error occurred');
    }
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main };

