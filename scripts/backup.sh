#!/usr/bin/env bash
# ==============================================================================
# TradingView AI Bot - Dedicated Telegram Backup Script
# Automatically creates compressed backup and sends to Admin Telegram
# ==============================================================================

set -e

# Detect Script & Project Directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PROJECT_DIR}"

BACKUP_DIR="${PROJECT_DIR}/backups"
mkdir -p "${BACKUP_DIR}"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
HUMAN_DATE=$(date +"%Y-%m-%d %H:%M:%S")
BACKUP_NAME="tv_bot_backup_${TIMESTAMP}.tar.gz"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"
REASON="${1:-Scheduled Automatic Backup}"

# Load .env variables if present
if [ -f "${PROJECT_DIR}/.env" ]; then
    # Export without breaking on comments
    set -a
    # shellcheck disable=SC1091
    source "${PROJECT_DIR}/.env" 2>/dev/null || true
    set +a
fi

TG_TOKEN="${TELEGRAM_BOT_TOKEN}"
TG_CHAT_ID="${TELEGRAM_CHAT_ID}"

echo "======================================================"
echo "📦 Starting TradingView Bot Backup: ${TIMESTAMP}"
echo "🔹 Reason: ${REASON}"
echo "======================================================"

# Create temporary staging directory
STAGING_DIR=$(mktemp -d)
mkdir -p "${STAGING_DIR}/data"

# Copy essential configuration and state files
[ -f "${PROJECT_DIR}/.env" ] && cp "${PROJECT_DIR}/.env" "${STAGING_DIR}/data/.env"
[ -f "${PROJECT_DIR}/package.json" ] && cp "${PROJECT_DIR}/package.json" "${STAGING_DIR}/data/package.json"
[ -f "${PROJECT_DIR}/metadata.json" ] && cp "${PROJECT_DIR}/metadata.json" "${STAGING_DIR}/data/metadata.json"

# Write system snapshot metadata
cat <<EOF > "${STAGING_DIR}/data/metadata.info"
Backup Timestamp: ${TIMESTAMP}
Backup Date: ${HUMAN_DATE}
Reason: ${REASON}
Hostname: $(hostname)
OS: $(uname -s) $(uname -r)
Node Version: $(node -v 2>/dev/null || echo "N/A")
Uptime: $(uptime -p 2>/dev/null || uptime)
EOF

# Create tar.gz archive
tar -czf "${BACKUP_PATH}" -C "${STAGING_DIR}/data" .
rm -rf "${STAGING_DIR}"

BACKUP_SIZE=$(du -h "${BACKUP_PATH}" | cut -f1)
echo "✅ Backup archive created: ${BACKUP_PATH} (${BACKUP_SIZE})"

# Send to Telegram Admin if token and chatId are available
if [ -n "${TG_TOKEN}" ] && [ -n "${TG_CHAT_ID}" ]; then
    echo "📤 Uploading backup document to Telegram Admin (${TG_CHAT_ID})..."
    
    CAPTION=$(cat <<EOF
📦 *پشتیبان‌گیری خودکار سیستم تریدینگ‌ویو (Backup Archive)*

🔹 *دلیل:* ${REASON}
📅 *زمان:* ${HUMAN_DATE}
🖥️ *سرور:* $(hostname)
📦 *فایل:* \`${BACKUP_NAME}\` (${BACKUP_SIZE})
⏱️ *آپ‌تایم سرور:* $(uptime -p 2>/dev/null || uptime)

🔒 _این فایل شامل تنظیمات، متغیرهای محیطی و کلیدهای ربات است و برای بازیابی سریع استفاده می‌شود._
EOF
)

    SEND_RESULT=$(curl -s -X POST "https://api.telegram.org/bot${TG_TOKEN}/sendDocument" \
        -F "chat_id=${TG_CHAT_ID}" \
        -F "document=@${BACKUP_PATH}" \
        -F "caption=${CAPTION}" \
        -F "parse_mode=Markdown")

    if echo "${SEND_RESULT}" | grep -q '"ok":true'; then
        echo "✅ Backup successfully sent to Admin Telegram!"
    else
        echo "⚠️ Telegram upload error: ${SEND_RESULT}"
        # Fallback message
        curl -s -X POST "https://api.telegram.org/bot${TG_TOKEN}/sendMessage" \
            -d "chat_id=${TG_CHAT_ID}" \
            -d "text=⚠️ بکاپ محلی ${BACKUP_NAME} ساخته شد اما ارسال فایل به تلگرام با خطا مواجه شد." >/dev/null 2>&1 || true
    fi
else
    echo "ℹ️ TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not configured in .env; backup stored locally."
fi

# Keep only the last 20 local backups to save disk space
find "${BACKUP_DIR}" -name "tv_bot_backup_*.tar.gz" -type f -mtime +15 -delete 2>/dev/null || true

echo "🎉 Backup workflow finished successfully."
