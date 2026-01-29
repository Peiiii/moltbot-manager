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

prompt_confirm() {
  local prompt="$1"
  if command -v gum >/dev/null 2>&1; then
    gum confirm "$prompt"
    return $?
  fi
  if [[ -t 0 ]]; then
    read -r -p "$prompt [y/N]: " reply
  elif [[ -r /dev/tty && -w /dev/tty ]]; then
    read -r -p "$prompt [y/N]: " reply < /dev/tty
  else
    return 1
  fi
  case "$reply" in
    [yY]|[yY][eE][sS]) return 0 ;;
    *) return 1 ;;
  esac
}

run_as_root() {
  if [[ "${EUID:-$(id -u)}" -eq 0 ]]; then
    "$@"
    return $?
  fi
  if command -v sudo >/dev/null 2>&1; then
    sudo -E "$@"
    return $?
  fi
  echo "[manager] sudo is required to install Node.js."
  return 1
}

get_node_major() {
  local version
  version="$(node -v 2>/dev/null || true)"
  version="${version#v}"
  echo "${version%%.*}"
}

install_node_with_nvm() {
  if ! command -v curl >/dev/null 2>&1; then
    echo "[manager] curl is required to install Node.js."
    return 1
  fi
  echo "[manager] Installing Node.js via nvm..."
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  export NVM_DIR="$HOME/.nvm"
  # shellcheck disable=SC1090
  . "$NVM_DIR/nvm.sh"
  nvm install 22
  nvm use 22
}

install_node() {
  echo "[manager] Installing Node.js >= 22..."
  if command -v apt-get >/dev/null 2>&1; then
    if ! command -v curl >/dev/null 2>&1; then
      run_as_root apt-get update -y
      run_as_root apt-get install -y curl
    fi
    curl -fsSL https://deb.nodesource.com/setup_22.x | run_as_root bash -
    run_as_root apt-get install -y nodejs
    return 0
  fi
  if command -v dnf >/dev/null 2>&1; then
    if ! command -v curl >/dev/null 2>&1; then
      run_as_root dnf install -y curl
    fi
    curl -fsSL https://rpm.nodesource.com/setup_22.x | run_as_root bash -
    run_as_root dnf install -y nodejs
    return 0
  fi
  if command -v yum >/dev/null 2>&1; then
    if ! command -v curl >/dev/null 2>&1; then
      run_as_root yum install -y curl
    fi
    curl -fsSL https://rpm.nodesource.com/setup_22.x | run_as_root bash -
    run_as_root yum install -y nodejs
    return 0
  fi
  install_node_with_nvm
}

if ! command -v node >/dev/null 2>&1; then
  echo "[manager] Node.js >= 22 is required."
  if [[ "${MANAGER_AUTO_INSTALL_NODE:-}" == "1" ]]; then
    install_node || exit 1
  else
    if prompt_confirm "Node.js not found. Install automatically?"; then
      install_node || exit 1
    else
      exit 1
    fi
  fi
else
  NODE_MAJOR="$(get_node_major)"
  if [[ -z "$NODE_MAJOR" || "$NODE_MAJOR" -lt 22 ]]; then
    echo "[manager] Node.js >= 22 is required (current: v${NODE_MAJOR})."
    if [[ "${MANAGER_AUTO_INSTALL_NODE:-}" == "1" ]]; then
      install_node || exit 1
    else
      if prompt_confirm "Node.js version is too low. Upgrade automatically?"; then
        install_node || exit 1
      else
        exit 1
      fi
    fi
  fi
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
  PID_FILE="$CONFIG_DIR/manager.pid"
  nohup env \
    MANAGER_API_HOST="$MANAGER_API_HOST" \
    MANAGER_API_PORT="$MANAGER_API_PORT" \
    MANAGER_WEB_DIST="$INSTALL_DIR/apps/web/dist" \
    MANAGER_CONFIG_PATH="$CONFIG_DIR/config.json" \
    node "$INSTALL_DIR/apps/api/dist/index.js" \
    > "$LOG_PATH" 2>&1 &
  echo $! > "$PID_FILE"
  echo "[manager] Started in background (log: $LOG_PATH)."
  echo "[manager] PID saved to $PID_FILE."
fi

HOST_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || true)
if [[ -z "$HOST_IP" ]]; then
  HOST_IP="<your-server-ip>"
fi

PUBLIC_HOST="${MANAGER_PUBLIC_HOST:-}"
if [[ -z "$PUBLIC_HOST" ]] && command -v curl >/dev/null 2>&1; then
  PUBLIC_HOST="$(curl -fsS https://api.ipify.org 2>/dev/null || true)"
fi

echo "[manager] Open (local): http://localhost:$MANAGER_API_PORT"
echo "[manager] Open (local): http://127.0.0.1:$MANAGER_API_PORT"
echo "[manager] Open (LAN): http://$HOST_IP:$MANAGER_API_PORT"
if [[ -n "$PUBLIC_HOST" ]]; then
  echo "[manager] Open (public): http://$PUBLIC_HOST:$MANAGER_API_PORT"
else
  echo "[manager] Open (public): set MANAGER_PUBLIC_HOST to print public URL"
fi
