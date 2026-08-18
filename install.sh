#!/usr/bin/env bash
# ==============================================================================
# 🤖 TradingView AI Bot - Linux Master Installer, Updater & Backup Manager
# Supports: Ubuntu, Debian, CentOS, AlmaLinux, RockyLinux, Fedora, Arch
# ==============================================================================

set -e

# ANSI Color Codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Repository and Directory Configuration
REPO_URL="https://github.com/meh732/analays.git"
DEFAULT_INSTALL_DIR="/opt/tradingview-bot"

# Robust directory detection
if [ -f "$(pwd)/package.json" ] && [ -f "$(pwd)/server.ts" ]; then
    PROJECT_DIR="$(pwd)"
elif [ -d "${DEFAULT_INSTALL_DIR}" ] && [ -f "${DEFAULT_INSTALL_DIR}/package.json" ]; then
    PROJECT_DIR="${DEFAULT_INSTALL_DIR}"
else
    PROJECT_DIR="${DEFAULT_INSTALL_DIR}"
fi

SERVICE_NAME="tradingview-bot"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

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

# Run command with elevated permissions if needed
run_elevated() {
    if [ "$EUID" -eq 0 ]; then
        "$@"
    else
        sudo "$@"
    fi
}

# Check and install system prerequisites
check_and_install_dependencies() {
    echo -e "${BLUE}🔍 Checking system prerequisites...${NC}"

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
            echo -e "${YELLOW}⚠️ Node.js version is older than 18 (current: $(node -v)). Upgrading to v20 LTS...${NC}"
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
            echo -e "${RED}❌ Unable to automatically install Node.js. Please install Node.js 18+ manually.${NC}"
            exit 1
        fi
    fi
}

# Setup or Edit .env configuration
configure_environment() {
    echo -e "\n${PURPLE}⚙️ Environment Variables, Tokens & Port Configuration (.env):${NC}"
    
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

    echo -e "${YELLOW}Press [Enter] to keep current/default value.${NC}\n"

    echo -e "${CYAN}------------------------------------------------------------${NC}"
    echo -e "${BOLD}${BLUE}🔵 1. Telegram Bot Credentials:${NC}"
    echo -e "${CYAN}------------------------------------------------------------${NC}"
    read -r -p "🔹 Telegram Bot Token (from @BotFather) [${CURR_TG_TOKEN:0:10}...]: " INPUT_TG_TOKEN
    TELEGRAM_BOT_TOKEN="${INPUT_TG_TOKEN:-$CURR_TG_TOKEN}"

    read -r -p "🔹 Telegram Admin Chat ID (for backups & admin alerts) [${CURR_TG_CHAT}]: " INPUT_TG_CHAT
    TELEGRAM_CHAT_ID="${INPUT_TG_CHAT:-$CURR_TG_CHAT}"

    echo -e "\n${CYAN}------------------------------------------------------------${NC}"
    echo -e "${BOLD}${GREEN}🟢 2. Bale Messenger Credentials (Optional):${NC}"
    echo -e "${CYAN}------------------------------------------------------------${NC}"
    read -r -p "🔹 Bale Bot Token (from BotFather on Bale - optional) [${CURR_BALE_TOKEN:0:10}...]: " INPUT_BALE_TOKEN
    BALE_BOT_TOKEN="${INPUT_BALE_TOKEN:-$CURR_BALE_TOKEN}"

    read -r -p "🔹 Bale Admin Chat ID (optional) [${CURR_BALE_CHAT}]: " INPUT_BALE_CHAT
    BALE_CHAT_ID="${INPUT_BALE_CHAT:-$CURR_BALE_CHAT}"

    echo -e "\n${CYAN}------------------------------------------------------------${NC}"
    echo -e "${BOLD}${WHITE}🌐 3. Server Port & Network Settings:${NC}"
    echo -e "${CYAN}------------------------------------------------------------${NC}"
    read -r -p "🔹 Dedicated Server Port [${CURR_PORT}]: " INPUT_PORT
    PORT="${INPUT_PORT:-$CURR_PORT}"
    if ! [[ "$PORT" =~ ^[0-9]+$ ]] || [ "$PORT" -lt 1 ] || [ "$PORT" -gt 65535 ]; then
        echo -e "${YELLOW}⚠️ Invalid port number; defaulting to 3000.${NC}"
        PORT=3000
    fi

    echo -e "\n${CYAN}------------------------------------------------------------${NC}"
    echo -e "${BOLD}${PURPLE}🤖 4. AI Engine Credentials (Gemini API Key):${NC}"
    echo -e "${CYAN}------------------------------------------------------------${NC}"
    read -r -p "🔹 Gemini API Key (for technical price-action & futures AI) [${CURR_GEMINI:0:10}...]: " INPUT_GEMINI
    GEMINI_API_KEY="${INPUT_GEMINI:-$CURR_GEMINI}"

    cat <<EOF > "${PROJECT_DIR}/.env"
# TradingView AI Bot Environment Configuration
# Telegram Credentials
TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
TELEGRAM_CHAT_ID=${TELEGRAM_CHAT_ID}

# Bale Messenger Credentials
BALE_BOT_TOKEN=${BALE_BOT_TOKEN}
BALE_CHAT_ID=${BALE_CHAT_ID}

# Server & AI Settings
PORT=${PORT}
GEMINI_API_KEY=${GEMINI_API_KEY}
NODE_ENV=production
EOF

    echo -e "\n${GREEN}✅ Configuration successfully saved to .env file.${NC}"
    echo -e "${WHITE}  - Server Port: ${PORT}${NC}"
    echo -e "${WHITE}  - Telegram Chat ID: ${TELEGRAM_CHAT_ID:-'(Not configured)'}${NC}"
    echo -e "${WHITE}  - Bale Chat ID: ${BALE_CHAT_ID:-'(Not configured)'}${NC}"
}

# Detect and install appropriate native bindings for Tailwind CSS / Oxide
install_platform_native_bindings() {
    ARCH=$(uname -m)
    LIBC="gnu"
    if ldd --version 2>&1 | grep -iq musl || [ -f /etc/alpine-release ]; then
        LIBC="musl"
    fi

    echo -e "${BLUE}🔍 Detected Platform: Linux (${ARCH}, ${LIBC})${NC}"

    BINDING_PKG=""
    if [ "$ARCH" = "x86_64" ]; then
        if [ "$LIBC" = "musl" ]; then
            BINDING_PKG="@tailwindcss/oxide-linux-x64-musl"
        else
            BINDING_PKG="@tailwindcss/oxide-linux-x64-gnu"
        fi
    elif [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
        if [ "$LIBC" = "musl" ]; then
            BINDING_PKG="@tailwindcss/oxide-linux-arm64-musl"
        else
            BINDING_PKG="@tailwindcss/oxide-linux-arm64-gnu"
        fi
    fi

    if [ -n "$BINDING_PKG" ]; then
        echo -e "${BLUE}📦 Ensuring native Tailwind binding (${BINDING_PKG}) is installed...${NC}"
        npm install "${BINDING_PKG}" --save-optional --no-audit >/dev/null 2>&1 || true
    fi
}

# Robust production build handler with automated self-healing
build_production_bundle() {
    echo -e "\n${BLUE}🏗️ Compiling and building production bundle...${NC}"
    install_platform_native_bindings

    if npm run build; then
        echo -e "${GREEN}✅ Production bundle built successfully.${NC}"
        return 0
    fi

    echo -e "${YELLOW}⚠️ Notice: Initial build failed. Attempting automated recovery...${NC}"

    # Recovery 1: Re-install optional native bindings and force install
    install_platform_native_bindings
    npm install --include=optional --force

    if npm run build; then
        echo -e "${GREEN}✅ Production bundle built successfully after recovery.${NC}"
        return 0
    fi

    # Recovery 2: Clean node_modules & cache
    echo -e "${YELLOW}⚠️ Performing deep clean and reinstall...${NC}"
    rm -rf node_modules package-lock.json
    npm cache clean --force 2>/dev/null || true
    npm install --include=optional --force
    install_platform_native_bindings

    if npm run build; then
        echo -e "${GREEN}✅ Production bundle built successfully after deep recovery.${NC}"
        return 0
    else
        echo -e "${RED}❌ Error: Production build failed. Please ensure Node.js 18+ and build-essential are available.${NC}"
        exit 1
    fi
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

    # Ensure parent directory exists
    run_elevated mkdir -p "$(dirname "${PROJECT_DIR}")"

    # Clone repository if package.json does not exist in target dir
    if [ ! -f "${PROJECT_DIR}/package.json" ]; then
        echo -e "${BLUE}📥 Cloning repository from ${REPO_URL} into ${PROJECT_DIR}...${NC}"
        if [ -d "${PROJECT_DIR}" ]; then
            run_elevated rm -rf "${PROJECT_DIR}"
        fi
        run_elevated git clone "${REPO_URL}" "${PROJECT_DIR}"
    fi

    # Crucial: Change directory into project root
    cd "${PROJECT_DIR}" || {
        echo -e "${RED}❌ Error: Failed to navigate into ${PROJECT_DIR}${NC}"
        exit 1
    }

    run_elevated chmod +x "${PROJECT_DIR}/scripts/"*.sh 2>/dev/null || true
    run_elevated chmod +x "${PROJECT_DIR}/install.sh" 2>/dev/null || true

    echo -e "\n${BLUE}📦 Installing npm dependencies in ${PROJECT_DIR}...${NC}"
    npm install --include=optional || npm install --force

    configure_environment

    build_production_bundle

    setup_systemd_service
    configure_firewall

    # Create global CLI shortcuts (tvbot / analays)
    if [ -d "/usr/local/bin" ]; then
        run_elevated ln -sf "${PROJECT_DIR}/install.sh" /usr/local/bin/tvbot 2>/dev/null || true
        run_elevated ln -sf "${PROJECT_DIR}/install.sh" /usr/local/bin/analays 2>/dev/null || true
        run_elevated chmod +x /usr/local/bin/tvbot /usr/local/bin/analays 2>/dev/null || true
    fi

    # Send confirmation to Telegram Admin
    if [ -f "${PROJECT_DIR}/scripts/backup.sh" ]; then
        bash "${PROJECT_DIR}/scripts/backup.sh" "Initial Installation & Setup Complete"
    fi

    TARGET_PORT="${PORT:-3000}"
    echo -e "\n${CYAN}======================================================${NC}"
    echo -e "${GREEN}🎉 Installation completed successfully!${NC}"
    echo -e "${WHITE}Web Dashboard:${NC} http://localhost:${TARGET_PORT}"
    echo -e "${WHITE}Service Status:${NC} sudo systemctl status ${SERVICE_NAME}"
    echo -e "${WHITE}Global Shortcut:${NC} ${YELLOW}tvbot${NC} or ${YELLOW}analays${NC}"
    echo -e "${CYAN}======================================================${NC}"

    read -r -p "Would you like to schedule automatic periodic backups now? (y/N): " SCHED_RESP
    if [[ "$SCHED_RESP" =~ ^[Yy]$ ]]; then
        action_schedule_backup
    fi
}

# Action 2: Update (With Automatic Telegram Backup Before Update)
action_update() {
    echo -e "${YELLOW}${BOLD}🔄 Starting Update Workflow...${NC}\n"
    check_root_or_sudo
    cd "${PROJECT_DIR}" || exit 1

    # MANDATORY BACKUP BEFORE UPDATE
    echo -e "${PURPLE}📦 STEP 1: Creating automatic backup before update and sending to Admin Telegram...${NC}"
    if [ -f "${PROJECT_DIR}/scripts/backup.sh" ]; then
        bash "${PROJECT_DIR}/scripts/backup.sh" "Automatic Backup Before Server Update"
    else
        echo -e "${YELLOW}⚠️ Backup script not found, proceeding with update...${NC}"
    fi

    # Pull git updates if git repo
    if [ -d "${PROJECT_DIR}/.git" ]; then
        echo -e "\n${BLUE}📥 STEP 2: Pulling latest changes from repository...${NC}"
        git pull || echo -e "${YELLOW}⚠️ Git pull skipped or encountered merge flags.${NC}"
    fi

    echo -e "\n${BLUE}📦 STEP 3: Updating npm dependencies...${NC}"
    npm install --include=optional || npm install --force

    echo -e "\n${BLUE}🏗️ STEP 4: Rebuilding production bundle...${NC}"
    build_production_bundle

    echo -e "\n${BLUE}🔄 STEP 5: Restarting systemd service...${NC}"
    if [ ! -f "${SERVICE_FILE}" ]; then
        setup_systemd_service
    else
        run_elevated systemctl restart "${SERVICE_NAME}"
    fi

    echo -e "\n${GREEN}✅ Update completed successfully! Service is active and running.${NC}"
    echo -e "${WHITE}A full backup archive was dispatched to the Admin Telegram chat.${NC}"
}

# Action 3: Uninstall (With Final Emergency Backup to Telegram)
action_uninstall() {
    echo -e "${RED}${BOLD}⚠️ Starting Uninstallation Workflow...${NC}\n"
    check_root_or_sudo
    cd "${PROJECT_DIR}" || true

    echo -e "${RED}Warning: This will stop, disable, and remove the bot service from the system.${NC}"
    read -r -p "Are you sure you want to uninstall? (yes/no): " CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
        echo -e "${YELLOW}Uninstallation cancelled.${NC}"
        return
    fi

    # MANDATORY EMERGENCY BACKUP BEFORE UNINSTALL
    echo -e "\n${PURPLE}📦 STEP 1: Creating final emergency backup and sending to Admin Telegram...${NC}"
    if [ -f "${PROJECT_DIR}/scripts/backup.sh" ]; then
        bash "${PROJECT_DIR}/scripts/backup.sh" "Final Emergency Backup Before Uninstallation"
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
    echo -e "${GREEN}✅ Bot service successfully removed from the system.${NC}"
    echo -e "${WHITE}Final emergency backup archive was sent to Admin Telegram.${NC}"
    echo -e "${CYAN}======================================================${NC}"

    read -r -p "Would you also like to delete the project folder? (y/N): " RM_FILES
    if [[ "$RM_FILES" =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Cleaning up project directory...${NC}"
        rm -rf "${PROJECT_DIR}"
        echo -e "${GREEN}Project folder completely removed.${NC}"
    fi
}

# Action 4: Manual Backup & Send to Telegram
action_backup() {
    echo -e "${PURPLE}${BOLD}📦 Manual Backup & Dispatch...${NC}\n"
    cd "${PROJECT_DIR}" || exit 1
    read -r -p "Backup description/reason [Manual Admin Backup]: " REASON_INPUT
    REASON="${REASON_INPUT:-Manual Admin Backup}"
    bash "${PROJECT_DIR}/scripts/backup.sh" "${REASON}"
}

# Action 5: Restore from Backup
action_restore() {
    echo -e "${CYAN}${BOLD}♻️ Restore from Backup Archive...${NC}\n"
    cd "${PROJECT_DIR}" || exit 1
    BACKUP_DIR="${PROJECT_DIR}/backups"

    if [ ! -d "${BACKUP_DIR}" ] || [ -z "$(ls -A "${BACKUP_DIR}" 2>/dev/null)" ]; then
        echo -e "${YELLOW}No backup files found in ${BACKUP_DIR}.${NC}"
        read -r -p "Enter direct path to backup archive (.tar.gz): " CUSTOM_PATH
        if [ -f "$CUSTOM_PATH" ]; then
            bash "${PROJECT_DIR}/scripts/restore.sh" "$CUSTOM_PATH"
        else
            echo -e "${RED}❌ File not found.${NC}"
        fi
        return
    fi

    echo -e "${YELLOW}Available Backup Archives:${NC}"
    mapfile -t BACKUP_FILES < <(ls -1t "${BACKUP_DIR}"/tv_bot_backup_*.tar.gz 2>/dev/null)
    
    for i in "${!BACKUP_FILES[@]}"; do
        FNAME=$(basename "${BACKUP_FILES[$i]}")
        FSIZE=$(du -h "${BACKUP_FILES[$i]}" | cut -f1)
        echo -e "  [$((i+1))] ${FNAME} (${FSIZE})"
    done

    echo -e "  [0] Specify custom file path"
    echo ""
    read -r -p "Select backup file number to restore (0-${#BACKUP_FILES[@]}): " CHOICE

    if [ "$CHOICE" = "0" ]; then
        read -r -p "Enter backup archive path: " CUSTOM_PATH
        bash "${PROJECT_DIR}/scripts/restore.sh" "$CUSTOM_PATH"
    elif [ "$CHOICE" -ge 1 ] && [ "$CHOICE" -le "${#BACKUP_FILES[@]}" ]; then
        SELECTED_FILE="${BACKUP_FILES[$((CHOICE-1))]}"
        bash "${PROJECT_DIR}/scripts/restore.sh" "$SELECTED_FILE"
    else
        echo -e "${RED}Invalid selection.${NC}"
    fi
}

# Action 6: Schedule Automated Backups (Cron)
action_schedule_backup() {
    echo -e "${BLUE}${BOLD}⏰ Schedule Automated Backups to Telegram...${NC}\n"
    echo -e "Select backup frequency:"
    echo -e "  [1] Every 1 Hour"
    echo -e "  [2] Every 3 Hours"
    echo -e "  [3] Every 6 Hours (Recommended)"
    echo -e "  [4] Every 12 Hours"
    echo -e "  [5] Daily (Every 24 Hours at 00:00)"
    echo -e "  [6] Weekly (Every Sunday at 00:00)"
    echo -e "  [7] Disable Scheduled Backups"
    echo ""
    read -r -p "Your choice (1-7): " SCHED_OPT

    case "$SCHED_OPT" in
        1) bash "${PROJECT_DIR}/scripts/schedule-backup.sh" 1 ;;
        2) bash "${PROJECT_DIR}/scripts/schedule-backup.sh" 3 ;;
        3) bash "${PROJECT_DIR}/scripts/schedule-backup.sh" 6 ;;
        4) bash "${PROJECT_DIR}/scripts/schedule-backup.sh" 12 ;;
        5) bash "${PROJECT_DIR}/scripts/schedule-backup.sh" 24 ;;
        6) bash "${PROJECT_DIR}/scripts/schedule-backup.sh" weekly ;;
        7) bash "${PROJECT_DIR}/scripts/schedule-backup.sh" disable ;;
        *) echo -e "${RED}Invalid selection.${NC}" ;;
    esac
}

# Action 7: Status & Logs
action_status_logs() {
    echo -e "${BLUE}📊 Service Status:${NC}"
    if [ ! -f "${SERVICE_FILE}" ]; then
        echo -e "${YELLOW}⚠️ Service file ${SERVICE_FILE} is not yet installed.${NC}"
        echo -e "${WHITE}Please run option [1] (Full Install & Service Setup) to initialize the service.${NC}"
        return
    fi
    run_elevated systemctl status "${SERVICE_NAME}" --no-pager || true
    echo -e "\n${YELLOW}Press [Ctrl+C] to exit live logs.${NC}"
    read -r -p "Would you like to view live streaming logs? (y/N): " VIEW_LOGS
    if [[ "$VIEW_LOGS" =~ ^[Yy]$ ]]; then
        run_elevated journalctl -u "${SERVICE_NAME}" -n 50 -f
    fi
}

# Action 8: Restart
action_restart() {
    echo -e "${BLUE}🔄 Restarting ${SERVICE_NAME}...${NC}"
    if [ ! -f "${SERVICE_FILE}" ]; then
        echo -e "${YELLOW}⚠️ Service file ${SERVICE_FILE} not found. Creating and configuring service now...${NC}"
        setup_systemd_service
        return
    fi
    run_elevated systemctl restart "${SERVICE_NAME}"
    echo -e "${GREEN}✅ Service restarted successfully.${NC}"
}

# Interactive Menu Loop
interactive_menu() {
    while true; do
        show_banner
        echo -e "${BOLD}${WHITE}Please select an action:${NC}\n"
        echo -e "  ${GREEN}[1] 🚀 Full Install & Service Setup${NC}"
        echo -e "  ${YELLOW}[2] 🔄 Update Bot (Auto-Backup to Telegram)${NC}"
        echo -e "  ${RED}[3] ⚠️ Uninstall Bot (Emergency Backup to Telegram)${NC}"
        echo -e "  ${PURPLE}[4] 📦 Manual Backup & Dispatch to Telegram${NC}"
        echo -e "  ${CYAN}[5] ♻️ Restore System from Backup Archive${NC}"
        echo -e "  ${BLUE}[6] ⏰ Schedule Automated Backups (Cron)${NC}"
        echo -e "  ${WHITE}[7] 📊 View Service Status & Logs${NC}"
        echo -e "  ${WHITE}[8] 🔁 Restart Service${NC}"
        echo -e "  ${RED}[0] 🚪 Exit${NC}"
        echo ""
        read -r -p "Enter choice (0-8): " MENU_CHOICE

        case "$MENU_CHOICE" in
            1) action_install ;;
            2) action_update ;;
            3) action_uninstall ;;
            4) action_backup ;;
            5) action_restore ;;
            6) action_schedule_backup ;;
            7) action_status_logs ;;
            8) action_restart ;;
            0) echo -e "\n${GREEN}Goodbye!${NC}\n"; exit 0 ;;
            *) echo -e "\n${RED}Invalid option selected.${NC}\n" ;;
        esac

        echo ""
        read -r -p "Press [Enter] to return to main menu..."
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
