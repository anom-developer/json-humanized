#!/usr/bin/env bash
echo "========================================================"
echo "  json-humanized - Starting Web UI..."
echo "  Open in your browser to transform JSON into human prose!"
echo "========================================================"
echo ""

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

if command -v node >/dev/null 2>&1; then
    echo "Starting local server with Node.js..."
    node "$DIR/bin/cli.js" --ui
else
    echo "Node.js not detected, opening standalone HTML app..."
    if command -v xdg-open >/dev/null 2>&1; then
        xdg-open "$DIR/docs/index.html"
    elif command -v open >/dev/null 2>&1; then
        open "$DIR/docs/index.html"
    else
        echo "Please open $DIR/docs/index.html in your web browser."
    fi
fi
