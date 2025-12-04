#!/bin/bash

# Helper script to add AI participation stats as git notes
# Usage: ./add-ai-note.sh [commit-sha] [ai-percentage] [additional-info]

COMMIT_SHA=${1:-HEAD}
AI_PERCENTAGE=${2:-"Unknown"}
ADDITIONAL_INFO=${3:-""}

# Get the actual commit SHA if HEAD or branch name was provided
FULL_SHA=$(git rev-parse "$COMMIT_SHA")

# Create the note content
NOTE_CONTENT="AI Participation: ${AI_PERCENTAGE}%"

if [ -n "$ADDITIONAL_INFO" ]; then
  NOTE_CONTENT="${NOTE_CONTENT}\n${ADDITIONAL_INFO}"
fi

# Add the note to refs/notes/ai
echo -e "$NOTE_CONTENT" | git notes --ref=refs/notes/ai add -f -F - "$FULL_SHA"

echo "✅ Added AI note to commit ${FULL_SHA:0:7}"
echo "Note: $NOTE_CONTENT"
echo ""
echo "To push notes to GitHub, run:"
echo "  git push origin refs/notes/ai"

