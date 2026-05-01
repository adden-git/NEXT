# Kimi Code CLI — Web UI Edition

[![Version](https://img.shields.io/github/v/tag/adden-git/kimi-next)](https://github.com/adden-git/kimi-next/releases)
[![License](https://img.shields.io/github/license/adden-git/kimi-next)](LICENSE)

**Kimi Code CLI с веб-интерфейсом** — AI-агент для разработки программного обеспечения, который работает прямо в браузере. Управляйте сессиями, редактируйте файлы, запускайте команды в терминале и общайтесь с нейросетью через удобный веб-UI.

> 🚀 **Демо:** [http://94.241.142.95:5500](http://94.241.142.95:5500)  
> 📦 **Оригинал:** [MoonshotAI/kimi-cli](https://github.com/MoonshotAI/kimi-cli)

---

## ✨ Возможности

### 🤖 AI-агент в браузере
- Интерактивный чат с Kimi (K2.5 / K2.6) для написания кода, рефакторинга, отладки
- Автономное планирование задач и выполнение shell-команд
- Чтение и редактирование файлов проекта прямо из чата

### 🛡️ Guardian AI — двойная проверка
- Перед каждым выполнением инструмента второй LLM проверяет безопасность
- Поддержка дешёвых моделей (Fireworks, OpenRouter) для проверки
- Защита от случайного удаления файлов и выполнения опасных команд

### 📁 Файловый менеджер
- Просмотр, редактирование и загрузка файлов через веб-интерфейс
- Поддержка CodeMirror с подсветкой синтаксиса
- Тёмная и светлая темы

### 💻 Встроенный терминал
- SSH-доступ к серверу через браузер
- Полноценная terminal emulator на xterm.js
- Синхронизация темы с основным интерфейсом

### ⚙️ Гибкие настройки
- **Глобальные настройки:** провайдеры LLM, модели, loop control, MCP, сервисы
- **Настройки сессии:** temperature, top_p, max_tokens, thinking_keep, Guardian AI
- **Git diff** прямо в настройках сессии — видьте изменения перед коммитом
- Поддержка нескольких провайдеров: Kimi, OpenAI, Anthropic, Fireworks, OpenRouter

### 🎨 Темы оформления
- 5 цветовых схем: тёмная, светлая, neon, matrix, molten
- Переключение в один клик

---

## 🚀 Быстрый старт

### Установка

```bash
# Клонирование репозитория
git clone https://github.com/adden-git/kimi-next.git
cd kimi-next

# Установка Python-зависимостей
uv sync

# Установка Node.js-зависимостей и сборка фронтенда
cd web && npm install && npm run build && cd ..

# Копирование статики
cp -r web/dist/* src/kimi_cli/web/static/

# Запуск сервера
uv run python run_dev.py
```

Сервер запустится на `http://0.0.0.0:5500`.

### Конфигурация

Создайте файл `~/.kimi/config.toml`:

```toml
default_model = "kimi-for-coding"
default_thinking = true

[models.kimi-for-coding]
provider = "kimi-for-coding"
model = "kimi-for-coding"
max_context_size = 262144
capabilities = ["thinking", "image_in"]

[providers.kimi-for-coding]
type = "kimi"
base_url = "https://api.kimi.com/coding/v1"
api_key = "YOUR_API_KEY"
```

---

## 🏗️ Архитектура

```
┌─────────────────┐     WebSocket      ┌──────────────────┐
│   React 19 UI   │ ◄────────────────► │  FastAPI Backend │
│   (Vite +       │                    │  (Python 3.12+)  │
│   shadcn/ui)    │     HTTP / API     │                  │
└─────────────────┘                    └──────────────────┘
        │                                       │
        │ static files                          │ KimiSoul
        ▼                                       ▼
┌─────────────────┐                      ┌──────────────────┐
│ files.html      │                      │  LLM (Kimi/      │
│ ssh.html        │                      │  OpenAI/etc)     │
│ (standalone)    │                      │                  │
└─────────────────┘                      └──────────────────┘
```

### Технологии

- **Фронтенд:** React 19, Vite, Tailwind CSS, shadcn/ui, Radix UI
- **Бэкенд:** FastAPI, uvicorn, asyncio
- **LLM:** kosong (абстракция над провайдерами)
- **Сессии:** WebSocket для real-time чата, JSON-RPC wire protocol

---

## 🛡️ Guardian AI

Guardian AI — это система двойной проверки, которая запускает второй LLM перед каждым вызовом инструмента (Shell, WriteFile, StrReplaceFile и т.д.).

**Как включить:**
1. Откройте настройки сессии (⚙️ в чате)
2. Включите toggle «Guardian AI»
3. Выберите модель для проверки (рекомендуется Fireworks Llama 3.1 8B — $0.20/MTok)

**Рекомендуемые модели для Guardian:**

| Модель | Цена | Стоимость проверки |
|--------|------|-------------------|
| Llama 3.2 3B (Fireworks) | $0.10/MTok | ~$0.00007 |
| Llama 3.1 8B (Fireworks) | $0.20/MTok | ~$0.00014 |
| Qwen2.5 7B (Fireworks) | $0.20/MTok | ~$0.00014 |
| DeepSeek V3 (Fireworks) | $0.56/MTok | ~$0.00040 |

---

## 📁 Структура проекта

```
kimi-next/
├── web/                          # React frontend
│   ├── src/
│   │   ├── components/           # UI компоненты
│   │   ├── features/             # Chat, sessions
│   │   └── hooks/                # use-theme, useSessionStream
│   └── dist/                     # Production build
├── src/kimi_cli/                 # Python backend
│   ├── web/                      # FastAPI app
│   │   ├── api/                  # Routes (sessions, config)
│   │   └── static/               # files.html, ssh.html
│   ├── soul/                     # KimiSoul, agent loop
│   ├── tools/                    # Built-in tools
│   └── guardian.py               # Guardian AI module
├── packages/                     # Workspace deps
│   ├── kosong/                   # LLM abstraction
│   └── kaos/                     # OS abstraction
└── docs/                         # VitePress documentation
```

---

## 📝 Лицензия

MIT License — см. [LICENSE](LICENSE)

---

## 👤 Автор и контакты

**Разработчик:** AlpsStroy  
**Telegram:** [@alpsstroy](https://t.me/alpsstroy)

По всем вопросам, багам и предложениям — пишите в Telegram.

---

> ⚠️ **Внимание:** Это форк оригинального [Kimi Code CLI](https://github.com/MoonshotAI/kimi-cli) от Moonshot AI с добавлением веб-интерфейса и дополнительных функций. Оригинальная документация доступна на [moonshotai.github.io/kimi-cli](https://moonshotai.github.io/kimi-cli/).
