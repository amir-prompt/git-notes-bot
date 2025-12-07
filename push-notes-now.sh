#!/bin/bash

################################################################################
# Push All Git Notes to GitHub
################################################################################
# This script pushes all your existing AI notes to GitHub
# Run this once to sync your existing notes, then the auto-push hook
# will keep them synced automatically on future pushes.
################################################################################

NOTES_REF="refs/notes/ai"

echo "📝 Pushing all git notes to GitHub..."
echo ""

# Push the notes
if git push origin "$NOTES_REF"; then
    echo ""
    echo "✅ SUCCESS! All git notes have been pushed to GitHub"
    echo ""
    echo "Next steps:"
    echo "1. Open or update a PR"
    echo "2. Wait for the GitHub Action to run"
    echo "3. Check your PR for:"
    echo "   - Main comment with AI statistics"
    echo "   - Inline comments on AI-modified files"
    echo ""
    echo "Future pushes will automatically sync notes thanks to the post-push hook!"
else
    echo ""
    echo "❌ Failed to push notes."
    echo ""
    echo "Possible reasons:"
    echo "1. No network connection"
    echo "2. No notes exist yet (make some commits with Cursor/Git AI first)"
    echo "3. Authentication issues"
    echo ""
    echo "Try running: git notes --ref=$NOTES_REF list"
    echo "If that returns nothing, you don't have any notes yet."
fi

