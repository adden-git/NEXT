# Kimi Next — Установка

Веб-интерфейс для Kimi CLI с расширенными возможностями.

## Быстрая установка (одной командой)

```bash
curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/kimi-next/main/install.sh | bash
```

После установки:
1. Открой `http://IP_СЕРВЕРА:5500`
2. Создай первого пользователя (логин + пароль)
3. Сохрани API токен — по нему можно входить без пароля
4. Токен сохраняется в браузере на 30 дней

## Ручная установка (если скрипт не сработал)

### 1. Зависимости

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y git python3 python3-venv nodejs npm

# Или ставим Node.js 24 LTS:
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs
```

### 2. Клонирование

```bash
git clone https://github.com/YOUR_USERNAME/kimi-next.git /opt/kimi-next
cd /opt/kimi-next
```

### 3. Python-зависимости

```bash
# Установи uv (быстрый pip)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Создаём окружение
uv venv .venv
source .venv/bin/activate
uv pip install -e .
```

### 4. Сборка frontend

```bash
cd web
npm install
npm run build
cd ..
cp -r web/dist/* src/kimi_cli/web/static/
```

### 5. Запуск

```bash
source .venv/bin/activate
python -m kimi_cli.web --host 0.0.0.0 --port 5500
```

> **Без `--token`** — теперь используется динамическая авторизация. Первый пользователь создаётся через веб-интерфейс.

### 6. Systemd (чтобы работало после перезагрузки)

```bash
sudo tee /etc/systemd/system/kimi-next.service << 'EOF'
[Unit]
Description=Kimi Next
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/kimi-next
Environment="PATH=/opt/kimi-next/.venv/bin:/usr/local/bin:/usr/bin"
ExecStart=/opt/kimi-next/.venv/bin/python -m kimi_cli.web --host 0.0.0.0 --port 5500
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable kimi-next
sudo systemctl start kimi-next
```

## Пробный период

Kimi Next включает **7-дневный пробный период**. После истечения срока потребуется продление лицензии.

**Контакты для продления:**
- Telegram: [@alpsstroy1](https://t.me/alpsstroy1)
- Телефон: +7 (952) 096-77-66

## Что умеет Kimi Next

- 💬 Чат с Kimi AI через веб-интерфейс
- 📁 Файловый менеджер с редактором кода
- 🔧 SSH-терминал прямо в браузере
- ⚙️ Параметры модели на сессию (temperature, top_p, max_tokens)
- 📋 Инструкции проекта (AGENTS.md, Skills) с авто-дискавери
- 🔄 Генерация названий сессий через AI
- 🌓 Тёмная/светлая тема
- 📱 Адаптивный дизайн

## Обновление

```bash
cd /opt/kimi-next
git pull origin main
source .venv/bin/activate
uv pip install -e .
cd web && npm install && npm run build && cd ..
cp -r web/dist/* src/kimi_cli/web/static/
sudo systemctl restart kimi-next
```

## Требования к серверу

| Параметр | Минимум | Рекомендуем |
|---|---|---|
| RAM | 2 GB | 4 GB |
| CPU | 2 ядра | 4 ядра |
| Диск | 10 GB | 20 GB |
| OS | Ubuntu 22.04+ | Ubuntu 24.04 LTS |

## Лицензия

Это программное обеспечение распространяется с встроенной 7-дневной пробной лицензией. Для коммерческого использования требуется приобретение лицензии.

**Контакты для продления:**
- Telegram: [@alpsstroy1](https://t.me/alpsstroy1)
- Телефон: +7 (952) 096-77-66

## Поддержка

Если что-то не работает — проверь логи:
```bash
sudo journalctl -u kimi-next -f
```
