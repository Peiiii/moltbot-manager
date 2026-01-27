#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${MANAGER_REPO_URL:-}"
MANAGER_API_PORT="${MANAGER_API_PORT:-17321}"
MANAGER_API_HOST="${MANAGER_API_HOST:-0.0.0.0}"

if [[ -z "$REPO_URL" ]]; then
  echo "[manager] MANAGER_REPO_URL is required."
  echo "Example: MANAGER_REPO_URL=git@github.com:your-org/clawdbot-manager.git"
  exit 1
fi

if ! command -v git >/dev/null 2>&1; then
  echo "[manager] git is required."
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "[manager] Node.js >= 22 is required."
  exit 1
fi

if ! command -v pnpm >/dev/null 2>&1; then
  if command -v corepack >/dev/null 2>&1; then
    corepack enable
    corepack prepare pnpm@10.23.0 --activate
  else
    echo "[manager] pnpm is required (install via corepack)."
    exit 1
  fi
fi

if [[ "${EUID:-$(id -u)}" -eq 0 ]]; then
  INSTALL_DIR="${MANAGER_INSTALL_DIR:-/opt/clawdbot-manager}"
  CONFIG_DIR="${MANAGER_CONFIG_DIR:-/etc/clawdbot-manager}"
else
  INSTALL_DIR="${MANAGER_INSTALL_DIR:-$HOME/clawdbot-manager}"
  CONFIG_DIR="${MANAGER_CONFIG_DIR:-$HOME/.clawdbot-manager}"
fi

if [[ -d "$INSTALL_DIR/.git" ]]; then
  echo "[manager] Updating $INSTALL_DIR"
  git -C "$INSTALL_DIR" pull --rebase
else
  echo "[manager] Cloning to $INSTALL_DIR"
  git clone "$REPO_URL" "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"

if [[ -z "${MANAGER_ADMIN_USER:-}" ]]; then
  read -r -p "Admin username: " MANAGER_ADMIN_USER
fi

if [[ -z "${MANAGER_ADMIN_PASS:-}" ]]; then
  read -r -s -p "Admin password: " MANAGER_ADMIN_PASS
  echo ""
fi

pnpm install
pnpm build

node apps/api/scripts/create-admin.mjs \
  --username "$MANAGER_ADMIN_USER" \
  --password "$MANAGER_ADMIN_PASS" \
  --config "$CONFIG_DIR/config.json"

if command -v systemctl >/dev/null 2>&1 && [[ "${EUID:-$(id -u)}" -eq 0 ]]; then
  SERVICE_PATH="/etc/systemd/system/clawdbot-manager.service"
  cat > "$SERVICE_PATH" <<SERVICE
[Unit]
Description=Clawdbot Manager API
After=network.target

[Service]
Type=simple
WorkingDirectory=$INSTALL_DIR
Environment=MANAGER_API_HOST=$MANAGER_API_HOST
Environment=MANAGER_API_PORT=$MANAGER_API_PORT
Environment=MANAGER_WEB_DIST=$INSTALL_DIR/apps/web/dist
Environment=MANAGER_CONFIG_PATH=$CONFIG_DIR/config.json
ExecStart=/usr/bin/env node $INSTALL_DIR/apps/api/dist/index.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
SERVICE

  systemctl daemon-reload
  systemctl enable --now clawdbot-manager
  echo "[manager] Service started."
else
  LOG_PATH="${MANAGER_LOG_PATH:-/tmp/clawdbot-manager.log}"
  nohup env \
    MANAGER_API_HOST="$MANAGER_API_HOST" \
    MANAGER_API_PORT="$MANAGER_API_PORT" \
    MANAGER_WEB_DIST="$INSTALL_DIR/apps/web/dist" \
    MANAGER_CONFIG_PATH="$CONFIG_DIR/config.json" \
    node "$INSTALL_DIR/apps/api/dist/index.js" \
    > "$LOG_PATH" 2>&1 &
  echo "[manager] Started in background (log: $LOG_PATH)."
fi

HOST_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || true)
if [[ -z "$HOST_IP" ]]; then
  HOST_IP="<your-server-ip>"
fi

echo "[manager] Open: http://$HOST_IP:$MANAGER_API_PORT"
