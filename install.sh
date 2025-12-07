#!/bin/bash

################################################################################
# Git Notes Bot - Full Installation Script
################################################################################
# Description:
#   Installs all dependencies and hooks required for the git-notes-bot to work.
#
# What it installs:
#   1. git-ai - AI-assisted git commit tool
#   2. Post-commit hook - Automatically adds AI participation notes to commits
#   3. Post-push hook - Automatically syncs git notes to GitHub after pushes
#   4. Cursor rules - Configuration for Cursor AI editor
#   5. GitHub Actions - Workflows for PR comments and dashboard generation
#
# Usage:
#   ./install.sh [options]
#
# Options:
#   --skip-git-ai     Skip git-ai installation
#   --skip-hooks      Skip git hooks installation
#   --skip-cursor     Skip Cursor configuration
#   --skip-actions    Skip GitHub Actions installation
#   --uninstall       Remove all installed components
#   -h, --help        Show this help message
#
# Requirements:
#   - Git repository (must run from within a git repo)
#   - Bash shell
#   - curl (for git-ai installation)
################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NOTES_REF="refs/notes/commits"  # Default namespace for git-ai
ALT_NOTES_REF="refs/notes/ai"   # Alternative namespace

# Parse command line arguments
SKIP_GIT_AI=false
SKIP_HOOKS=false
SKIP_CURSOR=false
SKIP_ACTIONS=false
UNINSTALL=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-git-ai)
            SKIP_GIT_AI=true
            shift
            ;;
        --skip-hooks)
            SKIP_HOOKS=true
            shift
            ;;
        --skip-cursor)
            SKIP_CURSOR=true
            shift
            ;;
        --skip-actions)
            SKIP_ACTIONS=true
            shift
            ;;
        --uninstall)
            UNINSTALL=true
            shift
            ;;
        -h|--help)
            head -40 "$0" | tail -35
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

################################################################################
# Helper Functions
################################################################################

print_header() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

check_git_repo() {
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        print_error "Not a git repository. Please run this from within a git repo."
        exit 1
    fi
}

################################################################################
# Uninstall Function
################################################################################

uninstall() {
    print_header "Uninstalling Git Notes Bot Components"

    # Remove hooks
    if [ -f ".git/hooks/post-commit" ]; then
        rm -f ".git/hooks/post-commit"
        print_success "Removed post-commit hook"
    else
        print_info "post-commit hook not found"
    fi

    if [ -f ".git/hooks/post-push" ]; then
        rm -f ".git/hooks/post-push"
        print_success "Removed post-push hook"
    else
        print_info "post-push hook not found"
    fi

    # Note: We don't uninstall git-ai as it may be used by other repos
    print_warning "git-ai was not uninstalled (may be used by other repositories)"
    print_info "To manually uninstall git-ai, remove it from your PATH"

    # Note: We don't remove .cursorrules as user may have customized it
    if [ -f ".cursorrules" ]; then
        print_warning ".cursorrules file was not removed (may contain custom rules)"
        print_info "To remove: rm .cursorrules"
    fi

    # Remove GitHub Actions workflows
    if [ -f ".github/workflows/git-notes-comment.yml" ]; then
        rm -f ".github/workflows/git-notes-comment.yml"
        print_success "Removed git-notes-comment.yml workflow"
    fi
    if [ -f ".github/workflows/generate-dashboard.yml" ]; then
        rm -f ".github/workflows/generate-dashboard.yml"
        print_success "Removed generate-dashboard.yml workflow"
    fi

    echo ""
    print_success "Uninstallation complete!"
    exit 0
}

################################################################################
# Installation Functions
################################################################################

install_git_ai() {
    print_header "Installing git-ai"

    # Check if git-ai is already installed
    if command -v git-ai &> /dev/null; then
        print_info "git-ai is already installed"
        git-ai --version 2>/dev/null || true
        return 0
    fi

    print_info "Downloading and installing git-ai..."

    if ! command -v curl &> /dev/null; then
        print_error "curl is required but not installed"
        exit 1
    fi

    # Install git-ai
    curl -sSL https://raw.githubusercontent.com/acunniffe/git-ai/main/install.sh | bash

    if command -v git-ai &> /dev/null; then
        print_success "git-ai installed successfully"
    else
        print_warning "git-ai may have been installed but is not in PATH"
        print_info "You may need to restart your terminal or add git-ai to your PATH"
    fi
}

install_post_commit_hook() {
    print_info "Installing post-commit hook..."

    HOOK_FILE=".git/hooks/post-commit"

    # Check if hook already exists
    if [ -f "$HOOK_FILE" ]; then
        print_warning "post-commit hook already exists"
        read -p "Overwrite? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Skipping post-commit hook"
            return 0
        fi
    fi

    cat > "$HOOK_FILE" << 'EOF'
#!/bin/bash

################################################################################
# Post-Commit Hook: AI Participation Notes
################################################################################
# This hook runs after every commit and adds AI participation metadata.
# It works with git-ai, Cursor, and other AI coding tools.
################################################################################

COMMIT_SHA=$(git rev-parse HEAD)

# Check if git-ai created a note (it does this automatically)
if git notes --ref=refs/notes/commits show "$COMMIT_SHA" 2>/dev/null; then
    echo "📝 AI note already exists for commit ${COMMIT_SHA:0:7}"
    exit 0
fi

# If no git-ai note exists, add a basic note for AI-assisted commits
# This catches commits made with Cursor or other AI tools
AI_NOTE="Commit created with AI assistance"
AI_NOTE="${AI_NOTE}\nTimestamp: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"

# Try to detect AI tool from environment or git config
if [ -n "$CURSOR_SESSION" ] || [ -n "$CURSOR_WORKSPACE" ]; then
    AI_NOTE="Commit created with Cursor AI\nTimestamp: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
fi

# Add the note to both refs for compatibility
echo -e "$AI_NOTE" | git notes --ref=refs/notes/commits add -f -F - "$COMMIT_SHA" 2>/dev/null
echo -e "$AI_NOTE" | git notes --ref=refs/notes/ai add -f -F - "$COMMIT_SHA" 2>/dev/null

echo "✅ AI note added to commit ${COMMIT_SHA:0:7}"
EOF

    chmod +x "$HOOK_FILE"
    print_success "post-commit hook installed"
}

install_post_push_hook() {
    print_info "Installing post-push hook..."

    HOOK_FILE=".git/hooks/post-push"

    # Check if hook already exists
    if [ -f "$HOOK_FILE" ]; then
        print_warning "post-push hook already exists"
        read -p "Overwrite? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Skipping post-push hook"
            return 0
        fi
    fi

    cat > "$HOOK_FILE" << 'EOF'
#!/bin/bash

################################################################################
# Post-Push Hook: Automatic Git Notes Sync
################################################################################
# This hook runs after every successful 'git push' command.
# It pushes git notes to keep AI authorship data synchronized with GitHub.
################################################################################

# Push notes from both common refs
echo ""
echo "📝 Syncing git notes to GitHub..."

# Push refs/notes/commits (git-ai default)
if git show-ref --verify --quiet "refs/notes/commits"; then
    if git push origin refs/notes/commits 2>/dev/null; then
        echo "✅ refs/notes/commits synced"
    else
        echo "⚠️  refs/notes/commits already up to date or push failed"
    fi
fi

# Push refs/notes/ai (alternative namespace)
if git show-ref --verify --quiet "refs/notes/ai"; then
    if git push origin refs/notes/ai 2>/dev/null; then
        echo "✅ refs/notes/ai synced"
    else
        echo "⚠️  refs/notes/ai already up to date or push failed"
    fi
fi

echo "✅ Git notes sync complete"
EOF

    chmod +x "$HOOK_FILE"
    print_success "post-push hook installed"
}

install_hooks() {
    print_header "Installing Git Hooks"

    # Ensure hooks directory exists
    mkdir -p .git/hooks

    install_post_commit_hook
    install_post_push_hook
}

setup_cursor_rules() {
    print_header "Setting Up Cursor Configuration"

    RULES_FILE=".cursorrules"

    if [ -f "$RULES_FILE" ]; then
        print_warning ".cursorrules already exists"
        print_info "Appending git-notes configuration..."

        # Check if our rules are already present
        if grep -q "git-notes-bot" "$RULES_FILE" 2>/dev/null; then
            print_info "git-notes-bot rules already present in .cursorrules"
            return 0
        fi

        # Append our rules
        cat >> "$RULES_FILE" << 'EOF'

# ==============================================================================
# Git Notes Bot - AI Authorship Tracking
# ==============================================================================
# When making commits, AI participation data will be automatically tracked.
# - Use `git-ai commit` instead of `git commit` for detailed AI statistics
# - Or let the post-commit hook add basic tracking automatically
# ==============================================================================
EOF
        print_success "Added git-notes configuration to .cursorrules"
    else
        # Create new .cursorrules file
        cat > "$RULES_FILE" << 'EOF'
# ==============================================================================
# Git Notes Bot - AI Authorship Tracking
# ==============================================================================
# This project uses git-notes-bot to track AI participation in commits.
#
# When making commits:
# - Use `git-ai commit` instead of `git commit` for detailed AI statistics
# - Or use regular `git commit` - the post-commit hook will add basic tracking
#
# Git notes are automatically pushed to GitHub via the post-push hook.
# ==============================================================================
EOF
        print_success "Created .cursorrules file"
    fi
}

install_github_actions() {
    print_header "Installing GitHub Actions Workflows"

    # Create .github/workflows directory if it doesn't exist
    mkdir -p .github/workflows

    # Install git-notes-comment.yml workflow
    WORKFLOW_FILE=".github/workflows/git-notes-comment.yml"
    if [ -f "$WORKFLOW_FILE" ]; then
        print_warning "git-notes-comment.yml already exists"
        read -p "Overwrite? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Skipping git-notes-comment.yml"
        else
            create_git_notes_workflow
        fi
    else
        create_git_notes_workflow
    fi

    # Install generate-dashboard.yml workflow
    WORKFLOW_FILE=".github/workflows/generate-dashboard.yml"
    if [ -f "$WORKFLOW_FILE" ]; then
        print_warning "generate-dashboard.yml already exists"
        read -p "Overwrite? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Skipping generate-dashboard.yml"
        else
            create_dashboard_workflow
        fi
    else
        create_dashboard_workflow
    fi
}

create_git_notes_workflow() {
    print_info "Creating git-notes-comment.yml workflow..."

    cat > ".github/workflows/git-notes-comment.yml" << 'EOF'
name: Post Git Notes to PR

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  post-notes:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Fetch git notes
        run: |
          git fetch origin 'refs/notes/*:refs/notes/*' || true

      - name: Post Git Notes
        uses: amir-prompt/git-notes-bot@main
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          notes-ref: 'refs/notes/commits'
          update-existing: 'true'
          add-inline-comments: 'false'
EOF

    print_success "Created git-notes-comment.yml workflow"
}

create_dashboard_workflow() {
    print_info "Creating generate-dashboard.yml workflow..."

    cat > ".github/workflows/generate-dashboard.yml" << 'EOF'
name: Generate AI Dashboard

on:
  push:
    branches: [main]
  schedule:
    # Run every Sunday at midnight UTC
    - cron: '0 0 * * 0'
  workflow_dispatch:
    inputs:
      since:
        description: 'Time range (e.g., "6 months ago")'
        required: false
        default: ''

permissions:
  contents: write

jobs:
  generate-dashboard:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Fetch all git notes
        run: |
          git fetch origin 'refs/notes/*:refs/notes/*' || true

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install git-notes-bot
        run: npm install -g git-notes-bot || npx git-notes-bot --version || true

      - name: Generate dashboard
        run: |
          npx git-notes-bot dashboard --output ai-dashboard.html

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: .
          publish_branch: gh-pages
          keep_files: true
          destination_dir: .
          enable_jekyll: false
EOF

    print_success "Created generate-dashboard.yml workflow"
}

################################################################################
# Main Installation
################################################################################

main() {
    print_header "Git Notes Bot - Installation Script"

    echo "This script will install:"
    echo "  • git-ai - AI-assisted git commit tool"
    echo "  • post-commit hook - Adds AI participation notes"
    echo "  • post-push hook - Auto-syncs notes to GitHub"
    echo "  • Cursor configuration - .cursorrules file"
    echo "  • GitHub Actions - PR comments and dashboard workflows"
    echo ""

    # Check we're in a git repo
    check_git_repo
    print_success "Git repository detected"

    # Handle uninstall
    if [ "$UNINSTALL" = true ]; then
        uninstall
    fi

    # Install git-ai
    if [ "$SKIP_GIT_AI" = false ]; then
        install_git_ai
    else
        print_info "Skipping git-ai installation (--skip-git-ai)"
    fi

    # Install hooks
    if [ "$SKIP_HOOKS" = false ]; then
        install_hooks
    else
        print_info "Skipping hooks installation (--skip-hooks)"
    fi

    # Setup Cursor
    if [ "$SKIP_CURSOR" = false ]; then
        setup_cursor_rules
    else
        print_info "Skipping Cursor configuration (--skip-cursor)"
    fi

    # Install GitHub Actions
    if [ "$SKIP_ACTIONS" = false ]; then
        install_github_actions
    else
        print_info "Skipping GitHub Actions installation (--skip-actions)"
    fi

    # Final summary
    print_header "Installation Complete!"

    echo "What was installed:"
    echo "  📦 git-ai - Use 'git-ai commit' for AI-tracked commits"
    echo "  🪝 post-commit hook - Auto-adds AI notes to commits"
    echo "  🪝 post-push hook - Auto-syncs notes to GitHub"
    echo "  📝 .cursorrules - Cursor AI configuration"
    echo "  🤖 GitHub Actions - PR comments and dashboard generation"
    echo ""
    echo "Next steps:"
    echo "  1. Commit the new workflow files: git add .github/workflows && git commit"
    echo "  2. Push to GitHub to enable the workflows"
    echo "  3. Make commits using 'git-ai commit' or regular 'git commit'"
    echo "  4. Open a PR to see AI participation comments"
    echo ""
    echo "To uninstall:"
    echo "  ./install.sh --uninstall"
    echo ""
    print_success "Setup complete! Happy coding with AI!"
}

# Run main function
main
