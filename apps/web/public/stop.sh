#!/usr/bin/env bash
set -euo pipefail

MANAGER_API_PORT="${MANAGER_API_PORT:-17321}"

if [[ "${EUID:-$(id -u)}" -eq 0 ]]; then
  CONFIG_DIR="${MANAGER_CONFIG_DIR:-/etc/clawdbot-manager}"
  INSTALL_DIR="${MANAGER_INSTALL_DIR:-/opt/clawdbot-manager}"
else
  CONFIG_DIR="${MANAGER_CONFIG_DIR:-$HOME/.clawdbot-manager}"
  INSTALL_DIR="${MANAGER_INSTALL_DIR:-$HOME/clawdbot-manager}"
fi

PID_FILE="$CONFIG_DIR/manager.pid"
SERVICE_NAME="clawdbot-manager"

if command -v systemctl >/dev/null 2>&1 && [[ -f "/etc/systemd/system/${SERVICE_NAME}.service" ]]; then
  systemctl stop "$SERVICE_NAME"
  echo "[manager] Service stopped."
  exit 0
fi

if [[ -f "$PID_FILE" ]]; then
  PID=$(cat "$PID_FILE" 2>/dev/null || true)
  if [[ -n "$PID" ]] && kill -0 "$PID" 2>/dev/null; then
    kill "$PID"
    echo "[manager] Stopped PID $PID."
    rm -f "$PID_FILE"
    exit 0
  fi
fi

if command -v pgrep >/dev/null 2>&1; then
  MATCH="$INSTALL_DIR/apps/api/dist/index.js"
  PIDS=$(pgrep -f "$MATCH" || true)
  if [[ -n "$PIDS" ]]; then
    echo "$PIDS" | xargs kill
    echo "[manager] Stopped processes: $PIDS."
    exit 0
  fi
fi

if command -v lsof >/dev/null 2>&1; then
  PIDS=$(lsof -nP -iTCP:"$MANAGER_API_PORT" -sTCP:LISTEN -t 2>/dev/null || true)
  if [[ -n "$PIDS" ]]; then
    echo "$PIDS" | xargs kill
    echo "[manager] Stopped processes on port $MANAGER_API_PORT: $PIDS."
    exit 0
  fi
fi

echo "[manager] No running process found."
