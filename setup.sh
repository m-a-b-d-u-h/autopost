#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

echo "=== Autopost Setup ==="

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "Node.js is required. Install from https://nodejs.org"; exit 1; }
command -v ffmpeg >/dev/null 2>&1 || { echo "ffmpeg is required"; exit 1; }
command -v ffprobe >/dev/null 2>&1 || { echo "ffprobe is required"; exit 1; }

echo "[1/4] Creating directories..."
mkdir -p assets/fonts assets/backgrounds assets/music assets/logo output

echo "[2/4] Installing npm dependencies..."
npm install

echo "[3/4] Setting up .env..."
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    echo "  Created .env from .env.example"
    echo "  => Edit .env with your API keys before running the server"
  else
    echo "  WARNING: No .env.example found. Create .env manually."
  fi
else
  echo "  .env already exists, skipping"
fi

echo "[4/4] Checking assets..."
[ "$(ls -A assets/fonts/ 2>/dev/null)" ] || echo "  WARNING: assets/fonts/ is empty — place .ttf files here"
[ "$(ls -A assets/backgrounds/ 2>/dev/null)" ] || echo "  WARNING: assets/backgrounds/ is empty — place video backgrounds here"
[ "$(ls -A assets/music/ 2>/dev/null)" ] || echo "  WARNING: assets/music/ is empty — place background music here"
[ "$(ls -A assets/logo/ 2>/dev/null)" ] || echo "  WARNING: assets/logo/ is empty — place profile photo here"

echo ""
echo "=== Setup complete ==="
echo "Run: node server.js"
echo "Dashboard: http://localhost:8001"
