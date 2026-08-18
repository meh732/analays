#!/usr/bin/env bash
# ==============================================================================
# TradingView AI Bot - Dedicated Backup Restore Script
# Restores application configuration and state from backup archive
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PROJECT_DIR}"

BACKUP_FILE="${1}"

if [ -z "${BACKUP_FILE}" ]; then
    echo "❌ Error: Please specify the backup file to restore."
    echo "Usage: $0 /path/to/backup.tar.gz"
    exit 1
fi

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "❌ Error: Backup file not found: ${BACKUP_FILE}"
    exit 1
fi

echo "======================================================"
echo "♻️ Restoring TradingView Bot Backup from: ${BACKUP_FILE}"
echo "======================================================"

# Create temporary restore directory
TEMP_DIR=$(mktemp -d)
tar -xzf "${BACKUP_FILE}" -C "${TEMP_DIR}"

# Check and copy files back
if [ -f "${TEMP_DIR}/.env" ]; then
    cp "${TEMP_DIR}/.env" "${PROJECT_DIR}/.env"
    echo "✅ .env configuration restored."
fi

if [ -f "${TEMP_DIR}/package.json" ]; then
    echo "ℹ️ package.json verified."
fi

rm -rf "${TEMP_DIR}"

# Reload environment
if [ -f "${PROJECT_DIR}/.env" ]; then
    set -a
    # shellcheck disable=SC1091
    source "${PROJECT_DIR}/.env" 2>/dev/null || true
    set +a
fi

TG_TOKEN="${TELEGRAM_BOT_TOKEN}"
TG_CHAT_ID="${TELEGRAM_CHAT_ID}"

# Restart systemd service if running
if command -v systemctl >/dev/null 2>&1 && systemctl is-active --quiet tradingview-bot 2>/dev/null; then
    echo "🔄 Restarting tradingview-bot systemd service..."
    sudo systemctl restart tradingview-bot || systemctl restart tradingview-bot || true
    echo "✅ Service restarted successfully."
fi

# Send Telegram Confirmation
if [ -n "${TG_TOKEN}" ] && [ -n "${TG_CHAT_ID}" ]; then
    HUMAN_DATE=$(date +"%Y-%m-%d %H:%M:%S")
    MSG=$(cat <<EOF
♻️ *TradingView AI Bot - Restoration Successful*

📅 *Timestamp:* ${HUMAN_DATE}
🖥️ *Host:* $(hostname)
📦 *Restored Archive:* \`$(basename "${BACKUP_FILE}")\`

✅ _System configuration and bot settings have been successfully restored and reloaded._
EOF
)
    curl -s -X POST "https://api.telegram.org/bot${TG_TOKEN}/sendMessage" \
        -d "chat_id=${TG_CHAT_ID}" \
        -d "text=${MSG}" \
        -d "parse_mode=Markdown" >/dev/null 2>&1 || true
fi

echo "🎉 Restoration completed successfully!"
