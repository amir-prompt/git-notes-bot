#!/bin/bash

################################################################################
# Setup Script: Auto-Push Git Notes
################################################################################
# Description:
#   Installs a post-push git hook that automatically pushes git notes to the
#   remote repository after every regular push operation.
#
# Purpose:
#   Solves the common problem where git notes (containing AI authorship data)
#   are stored locally but not synced to GitHub, causing discrepancies between
#   local and remote data.
#
# Usage:
#   ./setup-auto-push-notes.sh
#
# What it does:
#   1. Creates a post-push hook in .git/hooks/
#   2. Makes the hook executable
#   3. The hook runs automatically after every 'git push'
#
# To uninstall:
#   rm .git/hooks/post-push
################################################################################

# Define the path to the git hook file
HOOK_FILE=".git/hooks/post-push"

echo "🔧 Setting up automatic git notes push..."

# Create the post-push hook by writing to the hook file
# The 'EOF' delimiter with quotes prevents variable expansion in the heredoc
cat > "$HOOK_FILE" << 'EOF'
#!/bin/bash

################################################################################
# Post-Push Hook: Automatic Git Notes Sync
################################################################################
# This hook runs automatically after every successful 'git push' command.
# It pushes git notes to keep AI authorship data synchronized with GitHub.
################################################################################

# The git notes reference namespace where AI participation data is stored
NOTES_REF="refs/notes/ai"

# Verify that the notes reference exists locally before attempting to push
# The --verify flag ensures we're checking for exact ref name
# The --quiet flag suppresses output
if git show-ref --verify --quiet "refs/notes/ai"; then
  echo ""
  echo "📝 Pushing git notes to keep GitHub in sync..."
  
  # Attempt to push notes to the origin remote
  # 2>/dev/null suppresses error messages (e.g., when notes are already synced)
  if git push origin "$NOTES_REF" 2>/dev/null; then
    echo "✅ Git notes synced successfully"
  else
    echo "⚠️  Could not push git notes (they may already be up to date)"
  fi
else
  # No notes exist locally, so there's nothing to push
  echo "ℹ️  No git notes to push"
fi
EOF

# Make the hook file executable so git can run it
# Without execute permissions, git hooks are ignored
chmod +x "$HOOK_FILE"

# Success message with usage information
echo "✅ Post-push hook installed at $HOOK_FILE"
echo ""
echo "Now whenever you run 'git push', your git notes will automatically"
echo "be pushed too, keeping GitHub PR comments in sync with local data!"
echo ""
echo "To disable: rm .git/hooks/post-push"

