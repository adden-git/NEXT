# 🚀 Инструкция по установке Kimi Next на чистый компьютер

> Последнее обновление: 2026-04-30

---

## 📋 Требования

| Компонент | Минимум | Рекомендуется |
|-----------|---------|---------------|
| ОС | Ubuntu 22.04 / Debian 12 | Ubuntu 24.04 LTS |
| RAM | 2 GB | 4 GB |
| Диск | 5 GB SSD | 10 GB SSD |
| CPU | 2 ядра | 4 ядра |
| Python | 3.11+ | 3.14 |
| Node.js | 20+ | 24 LTS |

---

## 1. Установка системных зависимостей

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка базовых пакетов
sudo apt install -y git curl wget build-essential python3-pip python3-venv \
    nodejs npm postgresql postgresql-contrib nginx

# Установка PM2
sudo npm install -g pm2

# Установка uv (быстрый установщик Python)
curl -LsSf https://astral.sh/uv/install.sh | sh
source $HOME/.local/bin/env
```

---

## 2. Клонирование репозитория

```bash
cd /var/www
git clone https://github.com/adden-git/kimi-next.git
cd kimi-next
```

Если репозиторий приватный — используйте Personal Access Token:
```bash
git clone https://TOKEN@github.com/adden-git/kimi-next.git
```

---

## 3. Установка Python-зависимостей

```bash
# Создание виртуального окружения
uv venv .venv
source .venv/bin/activate

# Установка зависимостей
uv pip install -e ".[dev]"
```

---

## 4. Сборка frontend

```bash
cd web
npm install
VITE_DISABLE_TYPESCRIPT=1 npm run build

# Копирование статики
cp -r dist/* ../src/kimi_cli/web/static/
cd ..
```

---

## 5. Запуск сервера

### Вариант A: Ручной запуск (для теста)

```bash
source .venv/bin/activate
python run_dev.py --port 5500 --dynamic-auth
```

Откройте в браузере: `http://IP_СЕРВЕРА:5500`

### Вариант B: PM2 (для production)

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## 6. Первый запуск — создание пользователя

При первом открытии сайта появится экран **«Создать первого пользователя»**:

1. Введите **имя пользователя** (латиница, без пробелов)
2. Введите **пароль** (минимум 6 символов)
3. Нажмите **«Создать пользователя»**

После этого автоматически:
- Активируется **7-дневный триал**
- Создастся файл `~/.kimi/.session_cache` (HMAC-лицензия)
- Вы попадёте в основной интерфейс

---

## 7. Проверка работы

```bash
# Статус сервера
pm2 status

# Логи
pm2 logs kimi-dev-5500 --lines 50

# Проверка API
curl http://localhost:5500/api/config/version
```

---

## 8. Настройка Nginx (опционально)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:5500;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 120s;
    }

    client_max_body_size 10M;
}
```

---

## 🔧 Полный сброс (если нужно начать с чистого листа)

```bash
# Остановить сервер
pm2 stop kimi-dev-5500

# Удалить пользователей и лицензию
rm -f ~/.kimi/web_users.json ~/.kimi/.session_cache

# Удалить сессии (опционально)
rm -rf ~/.kimi/sessions/*

# Перезапустить
pm2 restart kimi-dev-5500
```

При следующем входе снова появится экран создания первого пользователя.

---

## 📝 Структура важных файлов

| Файл | Назначение |
|------|-----------|
| `~/.kimi/web_users.json` | Пользователи (PBKDF2) |
| `~/.kimi/.session_cache` | Лицензия (HMAC, 7 дней) |
| `~/.kimi/config.json` | Конфигурация провайдеров |
| `web/src/lib/version.ts` | Версия приложения |
| `src/kimi_cli/web/static/` | Статика frontend |

---

## ❓ Проблемы и решения

**Сборка зависает на TypeScript:**
```bash
VITE_DISABLE_TYPESCRIPT=1 npm run build
```

**Ошибка 403 «Session sync expired»:**
```bash
rm ~/.kimi/.session_cache && pm2 restart kimi-dev-5500
```

**Не открывается сайт:**
```bash
# Проверьте firewall
sudo ufw allow 5500
# или
sudo iptables -I INPUT -p tcp --dport 5500 -j ACCEPT
```
