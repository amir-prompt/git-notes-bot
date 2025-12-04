#!/bin/bash

################################################################################
# Add AI Note to Git Commit
################################################################################
# Description:
#   Manually adds AI participation metadata to a git commit as a git note.
#   Git notes are metadata attached to commits without modifying the commit.
#
# Usage:
#   ./add-ai-note.sh [commit-sha] [ai-percentage] [additional-info]
#
# Arguments:
#   commit-sha       - Commit SHA, branch name, or HEAD (default: HEAD)
#   ai-percentage    - AI participation percentage 0-100 (default: "Unknown")
#   additional-info  - Optional extra information (default: empty)
#
# Examples:
#   ./add-ai-note.sh HEAD 85 "AI wrote the tests"
#   ./add-ai-note.sh abc1234 100 "Fully AI generated"
#   ./add-ai-note.sh main 50
#
# Notes:
#   - Uses the -f flag to force-overwrite existing notes
#   - Stores notes in refs/notes/ai namespace
#   - Remember to push notes: git push origin refs/notes/ai
################################################################################

# Parse command-line arguments with defaults
COMMIT_SHA=${1:-HEAD}           # Default to current commit (HEAD)
AI_PERCENTAGE=${2:-"Unknown"}   # Default to "Unknown" if not specified
ADDITIONAL_INFO=${3:-""}        # Optional additional information

# Resolve the commit reference to a full SHA hash
# This converts HEAD, branch names, or short SHAs to full 40-character SHAs
FULL_SHA=$(git rev-parse "$COMMIT_SHA")

# Build the note content with AI participation percentage
NOTE_CONTENT="AI Participation: ${AI_PERCENTAGE}%"

# Append additional information if provided
if [ -n "$ADDITIONAL_INFO" ]; then
  NOTE_CONTENT="${NOTE_CONTENT}\n${ADDITIONAL_INFO}"
fi

# Add the note to the specified commit
# --ref=refs/notes/ai  : Store in the 'ai' notes namespace
# add                  : Add a note (or fail if one exists)
# -f                   : Force overwrite if note already exists
# -F -                 : Read note content from stdin
# "$FULL_SHA"          : Target commit
echo -e "$NOTE_CONTENT" | git notes --ref=refs/notes/ai add -f -F - "$FULL_SHA"

# Display success message with truncated SHA (first 7 characters)
echo "✅ Added AI note to commit ${FULL_SHA:0:7}"
echo "Note: $NOTE_CONTENT"
echo ""
echo "To push notes to GitHub, run:"
echo "  git push origin refs/notes/ai"

