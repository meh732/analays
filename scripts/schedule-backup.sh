#!/usr/bin/env bash
# ==============================================================================
# TradingView AI Bot - Scheduled Backup Helper (Cron Manager)
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

INTERVAL="${1}"

if [ -z "${INTERVAL}" ]; then
    echo "Usage: $0 <interval_hours_or_cron>"
    echo "Examples:"
    echo "  $0 6          (Every 6 hours)"
    echo "  $0 12         (Every 12 hours)"
    echo "  $0 24         (Once daily at 00:00)"
    echo "  $0 disable    (Remove scheduled backup)"
    exit 1
fi

CRON_CMD="${PROJECT_DIR}/scripts/backup.sh \"بکاپ خودکار دوره‌ای سیستم\" >/dev/null 2>&1"
CURRENT_CRON=$(crontab -l 2>/dev/null || true)
CLEANED_CRON=$(echo "${CURRENT_CRON}" | grep -v "scripts/backup.sh" || true)

if [ "${INTERVAL}" = "disable" ] || [ "${INTERVAL}" = "remove" ]; then
    echo "${CLEANED_CRON}" | crontab -
    echo "🛑 Scheduled automated backups removed from crontab."
    exit 0
fi

case "${INTERVAL}" in
    1)
        CRON_SCHEDULE="0 * * * *"
        DESC="هر ۱ ساعت یکبار"
        ;;
    3)
        CRON_SCHEDULE="0 */3 * * *"
        DESC="هر ۳ ساعت یکبار"
        ;;
    6)
        CRON_SCHEDULE="0 */6 * * *"
        DESC="هر ۶ ساعت یکبار"
        ;;
    12)
        CRON_SCHEDULE="0 */12 * * *"
        DESC="هر ۱۲ ساعت یکبار"
        ;;
    24|daily)
        CRON_SCHEDULE="0 0 * * *"
        DESC="هر ۲۴ ساعت (روزانه ساعت ۰۰:۰۰)"
        ;;
    weekly)
        CRON_SCHEDULE="0 0 * * 0"
        DESC="هر هفته (یکشنبه‌ها ساعت ۰۰:۰۰)"
        ;;
    *)
        CRON_SCHEDULE="${INTERVAL}"
        DESC="برنامه سفارشی: ${INTERVAL}"
        ;;
esac

NEW_CRON="${CLEANED_CRON}
${CRON_SCHEDULE} ${CRON_CMD}"

# Remove leading empty lines
NEW_CRON=$(echo "${NEW_CRON}" | sed '/^\s*$/d')

echo "${NEW_CRON}" | crontab -

echo "✅ زمان‌بندی بکاپ خودکار با موفقیت در کرون‌تب لینوکس ثبت شد!"
echo "⏱️ بازه زمانی: ${DESC}"
echo "📅 زمان‌بندی کرون: ${CRON_SCHEDULE}"
echo "📤 هر بار بکاپ تهیه شده و مستقیماً به تلگرام ادمین ارسال خواهد شد."
