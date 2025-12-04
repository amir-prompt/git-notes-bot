#!/bin/bash

# Setup script to install a post-push hook that automatically pushes git notes
# This ensures notes are always synced with GitHub

HOOK_FILE=".git/hooks/post-push"

echo "🔧 Setting up automatic git notes push..."

# Create the post-push hook
cat > "$HOOK_FILE" << 'EOF'
#!/bin/bash

# Automatically push git notes after every push
# This ensures AI authorship data is always synced to GitHub

NOTES_REF="refs/notes/ai"

# Check if notes ref exists locally
if git show-ref --verify --quiet "refs/notes/ai"; then
  echo ""
  echo "📝 Pushing git notes to keep GitHub in sync..."
  
  # Push notes to the same remote
  if git push origin "$NOTES_REF" 2>/dev/null; then
    echo "✅ Git notes synced successfully"
  else
    echo "⚠️  Could not push git notes (they may already be up to date)"
  fi
else
  echo "ℹ️  No git notes to push"
fi
EOF

# Make the hook executable
chmod +x "$HOOK_FILE"

echo "✅ Post-push hook installed at $HOOK_FILE"
echo ""
echo "Now whenever you run 'git push', your git notes will automatically"
echo "be pushed too, keeping GitHub PR comments in sync with local data!"
echo ""
echo "To disable: rm .git/hooks/post-push"

