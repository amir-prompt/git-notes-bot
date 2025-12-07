#!/bin/bash

# AI Authorship Dashboard Generator
# Wrapper script for easy usage

set -e

echo "🤖 AI Authorship Dashboard Generator"
echo ""

# Check if we're in a git repository
if [ ! -d .git ]; then
    echo "❌ Error: Not a git repository"
    echo "   Please run this script from the root of your git repository"
    exit 1
fi

# Default values
OUTPUT="ai-dashboard.html"
NOTES_REF="refs/notes/commits"
SINCE=""
REPO_NAME=$(basename "$(git rev-parse --show-toplevel)")

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -o|--output)
            OUTPUT="$2"
            shift 2
            ;;
        -n|--notes-ref)
            NOTES_REF="$2"
            shift 2
            ;;
        -s|--since)
            SINCE="$2"
            shift 2
            ;;
        -r|--repo-name)
            REPO_NAME="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  -o, --output <file>       Output HTML file (default: ai-dashboard.html)"
            echo "  -n, --notes-ref <ref>     Git notes ref (default: refs/notes/commits)"
            echo "  -s, --since <date>        Only commits since date (e.g., '6 months ago')"
            echo "  -r, --repo-name <name>    Repository name for dashboard"
            echo "  -h, --help                Show this help"
            echo ""
            echo "Examples:"
            echo "  $0 --since '6 months ago'"
            echo "  $0 -o dashboard.html -r 'My Project'"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use -h or --help for usage information"
            exit 1
            ;;
    esac
done

# Check if TypeScript and dependencies are available
if [ ! -f "node_modules/.bin/ts-node" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Build the command
CMD="npx ts-node generate-dashboard.ts --output '$OUTPUT' --notes-ref '$NOTES_REF' --repo-name '$REPO_NAME'"

if [ -n "$SINCE" ]; then
    CMD="$CMD --since '$SINCE'"
fi

# Run the generator
eval $CMD

# Open in browser if on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🌐 Opening in browser..."
    open "$OUTPUT"
elif command -v xdg-open &> /dev/null; then
    echo "🌐 Opening in browser..."
    xdg-open "$OUTPUT"
fi

