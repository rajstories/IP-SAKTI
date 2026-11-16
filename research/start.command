#!/bin/bash
set -e
cd "$(dirname "$0")/.."
if [ ! -x .research-runtime/venv/bin/python ]; then
  echo "Please complete the setup in research/README.md first."
  exit 1
fi
.research-runtime/venv/bin/python research/server.py &
research_server_pid=$!
trap 'kill "$research_server_pid" 2>/dev/null || true' EXIT INT TERM
echo "Keep this window open. Open the Local URL printed below, then Research workspace."
cd prototype
npm run dev -- --host 127.0.0.1
