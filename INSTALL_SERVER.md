# Быстрая установка Kimi Next на сервер (Ubuntu/Debian)

> **Время установки:** ~10-15 минут  
> **Требования:** Ubuntu 22.04+ или Debian 12+, 2GB RAM, 5GB диск

---

## 🔑 Что понадобится перед началом

1. **GitHub Personal Access Token** (с scope `repo`) — для клонирования приватного репозитория
2. **IP-адрес или домен** сервера
3. **Порт 5500** открыт в фаерволе

---

## 📋 Одним блоком — скопируй и вставь

Зайдите на сервер по SSH и выполните целиком:

```bash
# ===== 1. СИСТЕМНЫЕ ЗАВИСИМОСТИ =====
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl wget build-essential python3 python3-venv python3-pip nodejs npm nginx

# ===== 2. УСТАНОВКА UV (быстрый Python) =====
curl -LsSf https://astral.sh/uv/install.sh | sh
source $HOME/.local/bin/env

# ===== 3. УСТАНОВКА PM2 =====
sudo npm install -g pm2

# ===== 4. КЛОНИРОВАНИЕ РЕПОЗИТОРИЯ =====
# ЗАМЕНИТЕ TOKEN на ваш GitHub PAT
cd /var/www
sudo mkdir -p /var/www
sudo chown $USER:$USER /var/www
git clone https://TOKEN@github.com/adden-git/kimi-next.git
cd kimi-next

# ===== 5. PYTHON-ЗАВИСИМОСТИ =====
uv venv .venv
source .venv/bin/activate
uv pip install -e ".[dev]"

# ===== 6. СБОРКА FRONTEND =====
cd web
npm install
npx vite build
cp -r dist/* ../src/kimi_cli/web/static/
cd ..

# ===== 7. ОТКРЫТИЕ ПОРТА =====
sudo ufw allow 5500/tcp 2>/dev/null || sudo iptables -I INPUT -p tcp --dport 5500 -j ACCEPT

# ===== 8. ЗАПУСК ЧЕРЕЗ PM2 =====
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# ===== 9. ПРОВЕРКА =====
echo ""
echo "=== Проверка ==="
curl -s http://localhost:5500/healthz
echo ""
curl -s http://localhost:5500/api/auth/status
echo ""
echo ""
echo "✅ Установка завершена! Откройте в браузере:"
echo "   http://$(curl -s ifconfig.me):5500"
echo ""
echo "При первом входе создайте пользователя."
echo ""
```

---

## 🔧 После установки

### Создание первого пользователя
1. Откройте `http://IP_СЕРВЕРА:5500`
2. Введите логин и пароль
3. Автоматически активируется 7-дневный триал

### Управление сервером
```bash
pm2 status                    # статус
pm2 logs kimi-dev-5500        # логи
pm2 restart kimi-dev-5500     # перезапуск
pm2 stop kimi-dev-5500        # остановка
```

### Полный сброс (начать с чистого листа)
```bash
pm2 stop kimi-dev-5500
rm -f ~/.kimi/web_users.json ~/.kimi/.session_cache
pm2 restart kimi-dev-5500
```

---

## 🌐 Nginx (опционально — если нужен домен)

```bash
sudo tee /etc/nginx/sites-available/kimi-next << 'EOF'
server {
    listen 80;
    server_name ваш-домен.ru;

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
EOF

sudo ln -s /etc/nginx/sites-available/kimi-next /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## ❓ Если что-то пошло не так

**Ошибка при `git clone` (401):**
- Проверьте что GitHub Token действительный и имеет scope `repo`

**Сборка зависает:**
```bash
cd /var/www/kimi-next/web
npx vite build  # вместо npm run build
```

**Ошибка 403 «Session sync expired»:**
```bash
rm ~/.kimi/.session_cache && pm2 restart kimi-dev-5500
```

**Порт 5500 недоступен снаружи:**
```bash
sudo ufw allow 5500/tcp
# или для VPS (Yandex/AWS/etc) — откройте порт в веб-панели фаервола
```
