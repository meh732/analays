#!/usr/bin/env bash
# ==============================================================================
# 🤖 TradingView AI Bot - Linux Master Installer, Updater & Backup Manager
# Supports: Ubuntu, Debian, CentOS, AlmaLinux, RockyLinux, Fedora, Arch
# ==============================================================================

set -e

# ANSI Color Codes for Beautiful Terminal UI
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Determine Paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${SCRIPT_DIR}"
SERVICE_NAME="tradingview-bot"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

cd "${PROJECT_DIR}"

# Ensure helper scripts have execution permissions
chmod +x "${PROJECT_DIR}/scripts/"*.sh 2>/dev/null || true

# Header Banner
show_banner() {
    clear
    echo -e "${CYAN}====================================================================${NC}"
    echo -e "${BOLD}${WHITE}    🚀 TRADINGVIEW AI BOT & FUTURES SCANNER - LINUX MANAGER        ${NC}"
    echo -e "${CYAN}====================================================================${NC}"
    echo -e "${YELLOW}  Version: 2.5.0 | Multi-Market (Crypto, Forex, Gold, US Stocks)  ${NC}"
    echo -e "${BLUE}  Integrated with Telegram, Bale, Risk Engine & Auto-Backup       ${NC}"
    echo -e "${CYAN}====================================================================${NC}\n"
}

# Check if running as root / sudo capability
check_root_or_sudo() {
    if [ "$EUID" -ne 0 ]; then
        if ! command -v sudo >/dev/null 2>&1; then
            echo -e "${RED}❌ Please run this script as root or install sudo.${NC}"
            exit 1
        fi
    fi
}

# Run command with sudo if needed
run_elevated() {
    if [ "$EUID" -eq 0 ]; then
        "$@"
    else
        sudo "$@"
    fi
}

# Check Node.js and dependencies
check_and_install_dependencies() {
    echo -e "${BLUE}🔍 Checking system prerequisites...${NC}"

    # Check curl, git, tar, gzip
    for pkg in curl git tar gzip; do
        if ! command -v $pkg >/dev/null 2>&1; then
            echo -e "${YELLOW}📦 Installing missing utility: $pkg...${NC}"
            if command -v apt-get >/dev/null 2>&1; then
                run_elevated apt-get update -y && run_elevated apt-get install -y $pkg
            elif command -v dnf >/dev/null 2>&1; then
                run_elevated dnf install -y $pkg
            elif command -v yum >/dev/null 2>&1; then
                run_elevated yum install -y $pkg
            fi
        fi
    done

    # Check Node.js version
    NEED_NODE_INSTALL=false
    if command -v node >/dev/null 2>&1; then
        NODE_VER=$(node -v | tr -d 'v' | cut -d'.' -f1)
        if [ "$NODE_VER" -lt 18 ]; then
            echo -e "${YELLOW}⚠️ Node.js version is older than 18 (current: $(node -v)). Upgrading...${NC}"
            NEED_NODE_INSTALL=true
        else
            echo -e "${GREEN}✅ Node.js $(node -v) is installed.${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️ Node.js is not installed.${NC}"
        NEED_NODE_INSTALL=true
    fi

    if [ "$NEED_NODE_INSTALL" = true ]; then
        echo -e "${CYAN}📥 Installing Node.js 20 LTS...${NC}"
        if command -v apt-get >/dev/null 2>&1; then
            curl -fsSL https://deb.nodesource.com/setup_20.x | run_elevated bash -
            run_elevated apt-get install -y nodejs build-essential
        elif command -v dnf >/dev/null 2>&1; then
            curl -fsSL https://rpm.nodesource.com/setup_20.x | run_elevated bash -
            run_elevated dnf install -y nodejs
        elif command -v yum >/dev/null 2>&1; then
            curl -fsSL https://rpm.nodesource.com/setup_20.x | run_elevated bash -
            run_elevated yum install -y nodejs
        else
            echo -e "${RED}❌ Unable to automatically install Node.js on this OS. Please install Node.js 18+ manually.${NC}"
            exit 1
        fi
    fi
}

# Setup or Edit .env configuration
configure_environment() {
    echo -e "\n${PURPLE}⚙️ پیکربندی متغیرهای محیطی، توکن‌ها و پورت سرور (.env):${NC}"
    
    CURR_GEMINI=""
    CURR_TG_TOKEN=""
    CURR_TG_CHAT=""
    CURR_BALE_TOKEN=""
    CURR_BALE_CHAT=""
    CURR_PORT="3000"

    if [ -f "${PROJECT_DIR}/.env" ]; then
        set -a
        # shellcheck disable=SC1091
        source "${PROJECT_DIR}/.env" 2>/dev/null || true
        set +a
        CURR_GEMINI="${GEMINI_API_KEY}"
        CURR_TG_TOKEN="${TELEGRAM_BOT_TOKEN}"
        CURR_TG_CHAT="${TELEGRAM_CHAT_ID}"
        CURR_BALE_TOKEN="${BALE_BOT_TOKEN}"
        CURR_BALE_CHAT="${BALE_CHAT_ID}"
        CURR_PORT="${PORT:-3000}"
    fi

    echo -e "${YELLOW}برای تایید مقدار پیش‌فرض/فعلی، کلید [Enter] را فشار دهید.${NC}\n"

    # 1. Telegram Bot Token
    read -r -p "1. توکن ربات تلگرام (Telegram Bot Token) [${CURR_TG_TOKEN:0:8}...]: " INPUT_TG_TOKEN
    TELEGRAM_BOT_TOKEN="${INPUT_TG_TOKEN:-$CURR_TG_TOKEN}"

    # 2. Admin Telegram Chat ID
    read -r -p "2. آیدی عددی ادمین تلگرام (Admin Chat ID جهت ارسال بکاپ‌ها و مدیریت) [${CURR_TG_CHAT}]: " INPUT_TG_CHAT
    TELEGRAM_CHAT_ID="${INPUT_TG_CHAT:-$CURR_TG_CHAT}"

    # 3. Custom Server Port
    read -r -p "3. پورت اختصاصی نصب و سرور (Port) [${CURR_PORT}]: " INPUT_PORT
    PORT="${INPUT_PORT:-$CURR_PORT}"
    # Validate port number
    if ! [[ "$PORT" =~ ^[0-9]+$ ]] || [ "$PORT" -lt 1 ] || [ "$PORT" -gt 65535 ]; then
        echo -e "${YELLOW}⚠️ پورت نامعتبر است؛ مقدار پیش‌فرض ۳۰۰۰ انتخاب شد.${NC}"
        PORT=3000
    fi

    # 4. Gemini API Key
    read -r -p "4. کلید هوش مصنوعی جمینای (Gemini API Key) [${CURR_GEMINI:0:8}...]: " INPUT_GEMINI
    GEMINI_API_KEY="${INPUT_GEMINI:-$CURR_GEMINI}"

    # 5. Bale Bot Token & Chat ID (Optional)
    read -r -p "5. توکن ربات بله (Bale Token - اختیاری) [${CURR_BALE_TOKEN:0:8}...]: " INPUT_BALE_TOKEN
    BALE_BOT_TOKEN="${INPUT_BALE_TOKEN:-$CURR_BALE_TOKEN}"

    read -r -p "6. چت‌آیدی پیام‌رسان بله (Bale Chat ID - اختیاری) [${CURR_BALE_CHAT}]: " INPUT_BALE_CHAT
    BALE_CHAT_ID="${INPUT_BALE_CHAT:-$CURR_BALE_CHAT}"

    cat <<EOF > "${PROJECT_DIR}/.env"
# TradingView AI Bot Environment Configuration
GEMINI_API_KEY=${GEMINI_API_KEY}
TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
TELEGRAM_CHAT_ID=${TELEGRAM_CHAT_ID}
BALE_BOT_TOKEN=${BALE_BOT_TOKEN}
BALE_CHAT_ID=${BALE_CHAT_ID}
PORT=${PORT}
NODE_ENV=production
EOF

    echo -e "${GREEN}✅ فایل .env با موفقیت ذخیره شد (پورت انتخابی: ${PORT}).${NC}"
}

# Create and configure systemd service
setup_systemd_service() {
    TARGET_PORT="${PORT:-3000}"
    echo -e "${BLUE}🔧 Configuring Linux systemd service (${SERVICE_NAME}.service on port ${TARGET_PORT})...${NC}"

    RUN_USER=$(whoami)
    if [ "$RUN_USER" = "root" ] && [ -n "$SUDO_USER" ]; then
        RUN_USER="$SUDO_USER"
    fi

    SERVICE_CONTENT="[Unit]
Description=TradingView AI Bot & Signal Service
After=network.target

[Service]
Type=simple
User=${RUN_USER}
WorkingDirectory=${PROJECT_DIR}
ExecStart=$(which npm) run start
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=${TARGET_PORT}
EnvironmentFile=-${PROJECT_DIR}/.env

[Install]
WantedBy=multi-user.target"

    echo "${SERVICE_CONTENT}" | run_elevated tee "${SERVICE_FILE}" >/dev/null

    run_elevated systemctl daemon-reload
    run_elevated systemctl enable "${SERVICE_NAME}"
    run_elevated systemctl restart "${SERVICE_NAME}"

    echo -e "${GREEN}✅ systemd service created and started on port ${TARGET_PORT}!${NC}"
}

# Configure Firewall for custom port
configure_firewall() {
    TARGET_PORT="${PORT:-3000}"
    if command -v ufw >/dev/null 2>&1; then
        if ufw status | grep -q "Status: active"; then
            echo -e "${BLUE}🛡️ Opening Port ${TARGET_PORT} on UFW Firewall...${NC}"
            run_elevated ufw allow "${TARGET_PORT}/tcp" >/dev/null 2>&1 || true
        fi
    fi
    if command -v firewall-cmd >/dev/null 2>&1; then
        if firewall-cmd --state >/dev/null 2>&1; then
            echo -e "${BLUE}🛡️ Opening Port ${TARGET_PORT} on firewalld...${NC}"
            run_elevated firewall-cmd --add-port="${TARGET_PORT}/tcp" --permanent >/dev/null 2>&1 || true
            run_elevated firewall-cmd --reload >/dev/null 2>&1 || true
        fi
    fi
}


# Action 1: Install
action_install() {
    echo -e "${GREEN}${BOLD}🚀 Starting Full Installation...${NC}\n"
    check_root_or_sudo
    check_and_install_dependencies

    echo -e "\n${BLUE}📦 Installing npm dependencies...${NC}"
    npm install

    configure_environment

    echo -e "\n${BLUE}🏗️ Compiling and building production bundle...${NC}"
    npm run build

    setup_systemd_service
    configure_firewall

    # Send confirmation to Telegram Admin
    if [ -f "${PROJECT_DIR}/scripts/backup.sh" ]; then
        bash "${PROJECT_DIR}/scripts/backup.sh" "نصب اولیه و راه‌اندازی موفقیت‌آمیز سرور"
    fi

    TARGET_PORT="${PORT:-3000}"
    echo -e "\n${CYAN}======================================================${NC}"
    echo -e "${GREEN}🎉 نصب با موفقیت کامل انجام شد!${NC}"
    echo -e "${WHITE}آدرس سرور:${NC} http://localhost:${TARGET_PORT}"
    echo -e "${WHITE}وضعیت سرویس:${NC} sudo systemctl status ${SERVICE_NAME}"
    echo -e "${CYAN}======================================================${NC}"

    read -r -p "آیا مایلید بکاپ خودکار دوره‌ای (مثلاً هر ۱۲ ساعت) فعال شود؟ (y/N): " SCHED_RESP
    if [[ "$SCHED_RESP" =~ ^[Yy]$ ]]; then
        action_schedule_backup
    fi
}

# Action 2: Update (With Automatic Telegram Backup Before Update)
action_update() {
    echo -e "${YELLOW}${BOLD}🔄 Starting Update Workflow...${NC}\n"
    check_root_or_sudo

    # MANDATORY BACKUP BEFORE UPDATE
    echo -e "${PURPLE}📦 STEP 1: Creating automatic backup before update and sending to Admin Telegram...${NC}"
    if [ -f "${PROJECT_DIR}/scripts/backup.sh" ]; then
        bash "${PROJECT_DIR}/scripts/backup.sh" "بکاپ خودکار قبل از اجرای آپدیت سرور"
    else
        echo -e "${YELLOW}⚠️ Backup script not found, proceeding with caution...${NC}"
    fi

    # Pull git updates if git repo
    if [ -d "${PROJECT_DIR}/.git" ]; then
        echo -e "\n${BLUE}📥 STEP 2: Pulling latest changes from repository...${NC}"
        git pull || echo -e "${YELLOW}⚠️ Git pull skipped or encountered merge flags.${NC}"
    fi

    echo -e "\n${BLUE}📦 STEP 3: Updating dependencies...${NC}"
    npm install

    echo -e "\n${BLUE}🏗️ STEP 4: Rebuilding production bundle...${NC}"
    npm run build

    echo -e "\n${BLUE}🔄 STEP 5: Restarting systemd service...${NC}"
    run_elevated systemctl restart "${SERVICE_NAME}"

    echo -e "\n${GREEN}✅ آپدیت با موفقیت انجام شد و سرویس ری‌استارت گردید!${NC}"
    echo -e "${WHITE}بکاپ کامل قبل از آپدیت به تلگرام ادمین ارسال شده است.${NC}"
}

# Action 3: Uninstall (With Final Emergency Backup to Telegram)
action_uninstall() {
    echo -e "${RED}${BOLD}⚠️ Starting Uninstallation Workflow...${NC}\n"
    check_root_or_sudo

    echo -e "${RED}هشدار: این عملیات سرویس ربات را متوقف، غیرفعال و از سرور حذف خواهد کرد.${NC}"
    read -r -p "آیا از حذف ربات اطمینان کامل دارید؟ (yes/no): " CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
        echo -e "${YELLOW}عملیات لغو شد.${NC}"
        return
    fi

    # MANDATORY EMERGENCY BACKUP BEFORE UNINSTALL
    echo -e "\n${PURPLE}📦 STEP 1: Creating final emergency backup and sending to Admin Telegram...${NC}"
    if [ -f "${PROJECT_DIR}/scripts/backup.sh" ]; then
        bash "${PROJECT_DIR}/scripts/backup.sh" "بکاپ اضطراری نهایی قبل از حذف کامل ربات"
    fi

    echo -e "\n${BLUE}🛑 STEP 2: Stopping and disabling systemd service...${NC}"
    run_elevated systemctl stop "${SERVICE_NAME}" 2>/dev/null || true
    run_elevated systemctl disable "${SERVICE_NAME}" 2>/dev/null || true

    if [ -f "${SERVICE_FILE}" ]; then
        run_elevated rm -f "${SERVICE_FILE}"
        run_elevated systemctl daemon-reload
        echo -e "${GREEN}✅ systemd service file removed.${NC}"
    fi

    # Clean cron jobs
    if [ -f "${PROJECT_DIR}/scripts/schedule-backup.sh" ]; then
        bash "${PROJECT_DIR}/scripts/schedule-backup.sh" disable >/dev/null 2>&1 || true
    fi

    echo -e "\n${CYAN}======================================================${NC}"
    echo -e "${GREEN}✅ ربات با موفقیت از سیستم حذف شد.${NC}"
    echo -e "${WHITE}آخرین بکاپ کامل قبل از حذف به تلگرام ادمین ارسال گردید.${NC}"
    echo -e "${CYAN}======================================================${NC}"

    read -r -p "آیا می‌خواهید فایل‌های پوشه پروژه نیز به طور کامل پاک شوند؟ (y/N): " RM_FILES
    if [[ "$RM_FILES" =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}در حال پاکسازی پوشه پروژه...${NC}"
        # Delete project files safely
        rm -rf "${PROJECT_DIR}/dist" "${PROJECT_DIR}/node_modules"
        echo -e "${GREEN}پوشه بیلد و ماژول‌ها پاکسازی شدند.${NC}"
    fi
}

# Action 4: Manual Backup & Send to Telegram
action_backup() {
    echo -e "${PURPLE}${BOLD}📦 Manual Backup & Telegram Dispatch...${NC}\n"
    read -r -p "توضیح/دلیل این بکاپ [بکاپ دستی کاربر]: " REASON_INPUT
    REASON="${REASON_INPUT:-بکاپ دستی کاربر}"
    bash "${PROJECT_DIR}/scripts/backup.sh" "${REASON}"
}

# Action 5: Restore from Backup
action_restore() {
    echo -e "${CYAN}${BOLD}♻️ Restore from Backup Archive...${NC}\n"
    BACKUP_DIR="${PROJECT_DIR}/backups"

    if [ ! -d "${BACKUP_DIR}" ] || [ -z "$(ls -A "${BACKUP_DIR}" 2>/dev/null)" ]; then
        echo -e "${YELLOW}هیچ فایل بکاپی در پوشه backups یافت نشد.${NC}"
        read -r -p "مسیر مستقیم فایل بکاپ (.tar.gz) را وارد کنید: " CUSTOM_PATH
        if [ -f "$CUSTOM_PATH" ]; then
            bash "${PROJECT_DIR}/scripts/restore.sh" "$CUSTOM_PATH"
        else
            echo -e "${RED}❌ فایل پیدا نشد.${NC}"
        fi
        return
    fi

    echo -e "${YELLOW}فایل‌های بکاپ موجود:${NC}"
    mapfile -t BACKUP_FILES < <(ls -1t "${BACKUP_DIR}"/tv_bot_backup_*.tar.gz 2>/dev/null)
    
    for i in "${!BACKUP_FILES[@]}"; do
        FNAME=$(basename "${BACKUP_FILES[$i]}")
        FSIZE=$(du -h "${BACKUP_FILES[$i]}" | cut -f1)
        echo -e "  [$((i+1))] ${FNAME} (${FSIZE})"
    done

    echo -e "  [0] وارد کردن مسیر فایل دلخواه"
    echo ""
    read -r -p "شماره فایل مورد نظر برای بازگردانی: " CHOICE

    if [ "$CHOICE" = "0" ]; then
        read -r -p "مسیر فایل بکاپ: " CUSTOM_PATH
        bash "${PROJECT_DIR}/scripts/restore.sh" "$CUSTOM_PATH"
    elif [ "$CHOICE" -ge 1 ] && [ "$CHOICE" -le "${#BACKUP_FILES[@]}" ]; then
        SELECTED_FILE="${BACKUP_FILES[$((CHOICE-1))]}"
        bash "${PROJECT_DIR}/scripts/restore.sh" "$SELECTED_FILE"
    else
        echo -e "${RED}انتخاب نامعتبر.${NC}"
    fi
}

# Action 6: Schedule Automated Backups (Cron)
action_schedule_backup() {
    echo -e "${BLUE}${BOLD}⏰ زمان‌بندی ارسال خودکار بکاپ به تلگرام ادمین...${NC}\n"
    echo -e "انتخاب بازه زمانی ارسال بکاپ:"
    echo -e "  [1] هر ۱ ساعت یکبار"
    echo -e "  [2] هر ۳ ساعت یکبار"
    echo -e "  [3] هر ۶ ساعت یکبار (پیشنهادی)"
    echo -e "  [4] هر ۱۲ ساعت یکبار"
    echo -e "  [5] روزانه (ساعت ۰۰:۰۰ شب)"
    echo -e "  [6] هفتگی (یکشنبه‌ها)"
    echo -e "  [7] غیرفعال‌سازی زمان‌بندی بکاپ"
    echo ""
    read -r -p "انتخاب شما (1-7): " SCHED_OPT

    case "$SCHED_OPT" in
        1) bash "${PROJECT_DIR}/scripts/schedule-backup.sh" 1 ;;
        2) bash "${PROJECT_DIR}/scripts/schedule-backup.sh" 3 ;;
        3) bash "${PROJECT_DIR}/scripts/schedule-backup.sh" 6 ;;
        4) bash "${PROJECT_DIR}/scripts/schedule-backup.sh" 12 ;;
        5) bash "${PROJECT_DIR}/scripts/schedule-backup.sh" 24 ;;
        6) bash "${PROJECT_DIR}/scripts/schedule-backup.sh" weekly ;;
        7) bash "${PROJECT_DIR}/scripts/schedule-backup.sh" disable ;;
        *) echo -e "${RED}انتخاب نامعتبر.${NC}" ;;
    esac
}

# Action 7: Status & Logs
action_status_logs() {
    echo -e "${BLUE}📊 Service Status:${NC}"
    run_elevated systemctl status "${SERVICE_NAME}" --no-pager || true
    echo -e "\n${YELLOW}Press [Ctrl+C] to exit logs.${NC}"
    read -r -p "آیا مایل به مشاهده لاگ‌های زنده (Live Logs) هستید؟ (y/N): " VIEW_LOGS
    if [[ "$VIEW_LOGS" =~ ^[Yy]$ ]]; then
        run_elevated journalctl -u "${SERVICE_NAME}" -n 50 -f
    fi
}

# Action 8: Restart
action_restart() {
    echo -e "${BLUE}🔄 Restarting ${SERVICE_NAME}...${NC}"
    run_elevated systemctl restart "${SERVICE_NAME}"
    echo -e "${GREEN}✅ Service restarted successfully.${NC}"
}

# Interactive Menu Loop
interactive_menu() {
    while true; do
        show_banner
        echo -e "${BOLD}${WHITE}لطفاً عملیات مورد نظر را انتخاب نمایید:${NC}\n"
        echo -e "  ${GREEN}[1] 🚀 نصب کامل و راه‌اندازی ربات (Full Install)${NC}"
        echo -e "  ${YELLOW}[2] 🔄 آپدیت ربات + بکاپ خودکار تلگرام (Update & Auto-Backup)${NC}"
        echo -e "  ${RED}[3] ⚠️ حذف کامل ربات + آخرین بکاپ تلگرام (Uninstall & Emergency Backup)${NC}"
        echo -e "  ${PURPLE}[4] 📦 تهیه بکاپ دستی و ارسال به تلگرام (Manual Backup)${NC}"
        echo -e "  ${CYAN}[5] ♻️ بازگردانی سیستم از فایل بکاپ (Restore Backup)${NC}"
        echo -e "  ${BLUE}[6] ⏰ زمان‌بندی ارسال خودکار بکاپ (Scheduled Auto-Backup)${NC}"
        echo -e "  ${WHITE}[7] 📊 مشاهده وضعیت و لاگ‌ها (Status & Logs)${NC}"
        echo -e "  ${WHITE}[8] 🔁 راه‌اندازی مجدد سرویس (Restart Service)${NC}"
        echo -e "  ${RED}[0] 🚪 خروج (Exit)${NC}"
        echo ""
        read -r -p "شماره گزینه را وارد کنید (0-8): " MENU_CHOICE

        case "$MENU_CHOICE" in
            1) action_install ;;
            2) action_update ;;
            3) action_uninstall ;;
            4) action_backup ;;
            5) action_restore ;;
            6) action_schedule_backup ;;
            7) action_status_logs ;;
            8) action_restart ;;
            0) echo -e "\n${GREEN}خداحافظ!${NC}\n"; exit 0 ;;
            *) echo -e "\n${RED}گزینه نامعتبر است.${NC}\n" ;;
        esac

        echo ""
        read -r -p "برای بازگشت به منوی اصلی [Enter] را بزنید..."
    done
}

# Non-interactive CLI Argument Parser
case "$1" in
    install)
        action_install
        ;;
    update)
        action_update
        ;;
    uninstall)
        action_uninstall
        ;;
    backup)
        action_backup
        ;;
    restore)
        if [ -n "$2" ]; then
            bash "${PROJECT_DIR}/scripts/restore.sh" "$2"
        else
            action_restore
        fi
        ;;
    schedule)
        if [ -n "$2" ]; then
            bash "${PROJECT_DIR}/scripts/schedule-backup.sh" "$2"
        else
            action_schedule_backup
        fi
        ;;
    status)
        action_status_logs
        ;;
    restart)
        action_restart
        ;;
    help|--help|-h)
        echo "TradingView AI Bot Linux CLI Manager"
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  install        Full installation and service setup"
        echo "  update         Backup to Telegram and update application"
        echo "  uninstall      Emergency backup to Telegram and remove service"
        echo "  backup         Create backup and send to Admin Telegram"
        echo "  restore [file] Restore from backup archive"
        echo "  schedule [hrs] Set automatic backup interval (e.g. 6, 12, 24)"
        echo "  status         View service status and logs"
        echo "  restart        Restart systemd service"
        ;;
    *)
        interactive_menu
        ;;
esac
