#!/usr/bin/env bash
set -euo pipefail

REPO="https://github.com/m-a-b-d-u-h/autopost.git"
APP_DIR="$HOME/autopost"
ENV_FILE="$APP_DIR/.env"

echo "[1/6] Checking prerequisites..."
command -v node &>/dev/null || { echo "Node.js not found"; exit 1; }
command -v ffmpeg &>/dev/null || { echo "ffmpeg not found, installing..."; apt-get install -y ffmpeg; }
command -v ffprobe &>/dev/null || { echo "ffprobe not found"; exit 1; }
echo "   node $(node -v), ffmpeg $(ffmpeg -version | head -1 | awk '{print $3}')"
npm install -g pm2

echo "[2/6] Cloning repo..."
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" pull
elif [ -d "$APP_DIR" ]; then
  echo ">>> $APP_DIR exists but not a git repo. Remove it and re-run."
  exit 1
else
  git clone "$REPO" "$APP_DIR"
fi

cd "$APP_DIR"

echo "[3/6] Installing dependencies..."
npm ci --omit=dev

echo "[4/6] Setting up assets and env..."
mkdir -p assets/fonts assets/backgrounds assets/music assets/logo output

if [ ! -f "$ENV_FILE" ]; then
  if [ -f .env.example ]; then
    cp .env.example "$ENV_FILE"
    echo ">>> Edit $ENV_FILE with your secrets, then re-run this script."
    exit 1
  else
    echo ">>> WARNING: No .env.example found. Create $ENV_FILE manually."
  fi
fi

echo "[5/6] Starting app with PM2..."
pm2 start ecosystem.config.cjs
pm2 save

echo "[6/6] Enabling PM2 on boot..."
pm2 startup systemd -u "$(whoami)" --hp "$HOME"

echo ""
echo "✓ Setup complete!"
echo "   App:  $APP_DIR"
echo "   PM2:  pm2 list"
echo "   Logs: pm2 logs autopost"
echo "   Dashboard: http://localhost:8001"
