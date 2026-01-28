#!/usr/bin/env bash
set -euo pipefail

DEFAULT_REPO_URL="https://github.com/Peiiii/moltbot-manager.git"
REPO_URL="${MANAGER_REPO_URL:-$DEFAULT_REPO_URL}"
MANAGER_API_PORT="${MANAGER_API_PORT:-17321}"
MANAGER_API_HOST="${MANAGER_API_HOST:-0.0.0.0}"

if [[ -z "${MANAGER_REPO_URL:-}" ]]; then
  echo "[manager] MANAGER_REPO_URL not set. Using default: $REPO_URL"
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

prompt_env() {
  local var_name="$1"
  local prompt="$2"
  local secret="${3:-0}"
  local input=""

  if [[ -n "${!var_name:-}" ]]; then
    return 0
  fi

  if [[ -t 0 ]]; then
    if [[ "$secret" == "1" ]]; then
      read -r -s -p "$prompt" input
      echo ""
    else
      read -r -p "$prompt" input
    fi
  elif [[ -r /dev/tty && -w /dev/tty ]]; then
    if [[ "$secret" == "1" ]]; then
      read -r -s -p "$prompt" input < /dev/tty
      echo "" > /dev/tty
    else
      read -r -p "$prompt" input < /dev/tty
    fi
  else
    echo "[manager] $var_name is required. Set env var or run in a TTY."
    exit 1
  fi

  if [[ -z "$input" ]]; then
    echo "[manager] $var_name is required."
    exit 1
  fi

  printf -v "$var_name" "%s" "$input"
}

prompt_env "MANAGER_ADMIN_USER" "Admin username: " "0"
prompt_env "MANAGER_ADMIN_PASS" "Admin password: " "1"

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

echo "[manager] Open (local): http://localhost:$MANAGER_API_PORT"
echo "[manager] Open (local): http://127.0.0.1:$MANAGER_API_PORT"
echo "[manager] Open (LAN): http://$HOST_IP:$MANAGER_API_PORT"
