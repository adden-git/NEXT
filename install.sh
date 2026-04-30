#!/bin/bash
# Kimi Next — One-command installer
# Usage: curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/kimi-next/main/install.sh | bash

set -e

REPO_URL="${KIMI_REPO_URL:-https://github.com/YOUR_USERNAME/kimi-next.git}"
INSTALL_DIR="${KIMI_INSTALL_DIR:-/opt/kimi-next}"
PORT="${KIMI_PORT:-5500}"
# TOKEN is no longer needed — dynamic auth is used (users created via web UI)
# TOKEN="${KIMI_TOKEN:-$(openssl rand -hex 16)}"

colors() {
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    BLUE='\033[0;34m'
    NC='\033[0m' # No Color
}
colors

log() { echo -e "${BLUE}[kimi-next]${NC} $1"; }
ok() { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err() { echo -e "${RED}[ERR]${NC} $1"; exit 1; }

check_deps() {
    log "Проверка зависимостей..."
    
    command -v git >/dev/null 2>&1 || err "git не установлен. Установи: sudo apt install git"
    command -v python3 >/dev/null 2>&1 || err "python3 не установлен. Установи: sudo apt install python3 python3-venv"
    command -v node >/dev/null 2>&1 || err "Node.js не установлен. Установи: curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash - && sudo apt install -y nodejs"
    command -v npm >/dev/null 2>&1 || err "npm не установлен"
    
    PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
    log "Python версия: $PYTHON_VERSION"
    
    NODE_VERSION=$(node --version 2>&1 | tr -d 'v')
    log "Node.js версия: $NODE_VERSION"
    
    ok "Все зависимости на месте"
}

clone_repo() {
    log "Клонирование репозитория..."
    if [ -d "$INSTALL_DIR" ]; then
        warn "Директория $INSTALL_DIR уже существует"
        read -p "Обновить существующую установку? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            cd "$INSTALL_DIR"
            git pull origin main
        else
            err "Установка отменена"
        fi
    else
        git clone "$REPO_URL" "$INSTALL_DIR"
        cd "$INSTALL_DIR"
    fi
    ok "Репозиторий готов"
}

install_python_deps() {
    log "Установка Python-зависимостей..."
    
    if ! command -v uv >/dev/null 2>&1; then
        log "Установка uv (быстрый pip)..."
        curl -LsSf https://astral.sh/uv/install.sh | sh
        export PATH="$HOME/.local/bin:$PATH"
    fi
    
    uv venv .venv
    source .venv/bin/activate
    uv pip install -e .
    
    ok "Python-зависимости установлены"
}

build_frontend() {
    log "Сборка frontend..."
    cd "$INSTALL_DIR/web"
    npm install
    npm run build
    cd "$INSTALL_DIR"
    cp -r web/dist/* src/kimi_cli/web/static/
    ok "Frontend собран"
}

create_env() {
    log "Создание конфигурации..."
    
    cat > "$INSTALL_DIR/.env" << EOF
# Kimi Next Environment
KIMI_WEB_PORT=$PORT
KIMI_WEB_HOST=0.0.0.0
# Dynamic auth — no static token needed. First user created via web UI.
EOF
    
    ok "Конфигурация создана"
}

setup_systemd() {
    log "Настройка systemd-сервиса..."
    
    if command -v systemctl >/dev/null 2>&1; then
        sudo tee /etc/systemd/system/kimi-next.service > /dev/null << EOF
[Unit]
Description=Kimi Next Web Interface
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$INSTALL_DIR
Environment="PATH=$INSTALL_DIR/.venv/bin:/usr/local/bin:/usr/bin:/bin"
EnvironmentFile=$INSTALL_DIR/.env
ExecStart=$INSTALL_DIR/.venv/bin/python -m kimi_cli.web --host 0.0.0.0 --port \${KIMI_WEB_PORT}
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
        
        sudo systemctl daemon-reload
        sudo systemctl enable kimi-next
        sudo systemctl start kimi-next
        
        ok "Systemd-сервис создан и запущен"
    else
        warn "systemd не найден. Запуск вручную..."
        nohup "$INSTALL_DIR/.venv/bin/python" -m kimi_cli.web --host 0.0.0.0 --port "$PORT" > /tmp/kimi-next.log 2>&1 &
        ok "Запущено в фоне (PID: $!)"
    fi
}

show_info() {
    IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "YOUR_SERVER_IP")
    
    echo
    echo "========================================"
    echo -e "  ${GREEN}Kimi Next установлен!${NC}"
    echo "========================================"
    echo
    echo "  URL:      http://$IP:$PORT"
    echo "  Директория: $INSTALL_DIR"
    echo
    echo "  Пробный период: 7 дней"
    echo "  Контакты для продления:"
    echo "    Telegram: @alpsstroy1"
    echo "    Телефон:  +7 (952) 096-77-66"
    echo
    echo "  Первый запуск:"
    echo "    1. Открой http://$IP:$PORT"
    echo "    2. Создай первого пользователя (логин + пароль)"
    echo "    3. Сохрани API токен"
    echo
    echo "  Проверить статус:"
    echo "    sudo systemctl status kimi-next"
    echo
    echo "  Посмотреть логи:"
    echo "    sudo journalctl -u kimi-next -f"
    echo
    echo "  Перезапустить:"
    echo "    sudo systemctl restart kimi-next"
    echo
    echo "  Сбросить авторизацию:"
    echo "    rm ~/.kimi/web_users.json && sudo systemctl restart kimi-next"
    echo
    echo "========================================"
}

main() {
    echo "========================================"
    echo "  Kimi Next Installer"
    echo "========================================"
    echo
    
    check_deps
    clone_repo
    install_python_deps
    build_frontend
    create_env
    setup_systemd
    show_info
}

main "$@"
