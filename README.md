# Kimi Code CLI — Web UI Edition

[![Version](https://img.shields.io/github/v/tag/adden-git/kimi-next)](https://github.com/adden-git/kimi-next/releases)
[![License](https://img.shields.io/github/license/adden-git/kimi-next)](LICENSE)

**Kimi Code CLI с полноценным веб-интерфейсом** — AI-агент для разработки программного обеспечения, который работает прямо в браузере. Управляйте сессиями, редактируйте файлы, запускайте команды в терминале и общайтесь с нейросетью через современный веб-UI на React 19.

> 🚀 **Демо:** [http://94.241.142.95:5500](http://94.241.142.95:5500)  
> 📦 **Оригинал:** [MoonshotAI/kimi-cli](https://github.com/MoonshotAI/kimi-cli)  
> 💬 **Автор:** [github.com/adden-git](https://github.com/adden-git)

---

## 🔥 Что нового по сравнению с оригинальным Kimi CLI

Оригинальный [Kimi Code CLI](https://github.com/MoonshotAI/kimi-cli) от Moonshot AI — это мощный терминальный AI-агент. Мы взяли его за основу и добавили **полноценный веб-интерфейс**, а также ряд уникальных функций, которых нет в оригинале:

| Функция | Оригинал Kimi CLI | Наш Kimi Next |
|---------|------------------|---------------|
| Интерфейс | Терминал (TUI) | **Веб-UI (React 19) + терминал** |
| Файловый менеджер | Нет | **Встроенный (CodeMirror)** |
| SSH терминал | Нет | **Встроенный (xterm.js)** |
| Guardian AI | Нет | **Двойная проверка инструментов** |
| Настройки сессии | Ограниченно | **Полный контроль (temp, top_p, max_tokens, thinking_keep)** |
| Git diff | Нет | **В настройках сессии** |
| История чата | Без пагинации | **Пагинация + подгрузка старых сообщений** |
| Темы | Темная/светлая | **5 тем (dark, light, neon, matrix, molten)** |
| Fireworks/OpenRouter | Ручная настройка | **Preset кнопки + цены моделей** |
| Провайдеры | Kimi + OpenAI | **Kimi, OpenAI, Anthropic, Fireworks, OpenRouter, Gemini** |

---

## ✨ Возможности

### 🤖 AI-агент в браузере
- Интерактивный чат с нейросетью Kimi (K2.5 / K2.6) для написания кода, рефакторинга, отладки
- Автономное планирование задач и выполнение shell-команд
- Чтение и редактирование файлов проекта прямо из чата
- WebSocket real-time — ответы приходят мгновенно

### 🛡️ Guardian AI — двойная проверка *(уникальная фича)*
Guardian AI — это система безопасности, которая запускает **второй LLM** перед каждым выполнением инструмента (Shell, WriteFile, StrReplaceFile и т.д.).

**Как работает:**
```
LLM решает вызвать инструмент
        ↓
🛡️ Guardian AI анализирует: безопасно ли?
        ↓
  ALLOW → выполняется
  BLOCK → отмена с объяснением
```

**Почему это важно:**
- Защита от случайного `rm -rf /`
- Предотвращение перезаписи критических файлов
- Блокировка подозрительных shell-команд
- Работает на дешёвых моделях — сессия из 100 инструментов стоит ~1.4 цента

**Рекомендуемые модели для Guardian:**

| Модель | Цена | Стоимость проверки |
|--------|------|-------------------|
| Llama 3.2 3B (Fireworks) | $0.10 / 1M токенов | ~$0.00007 |
| Llama 3.1 8B (Fireworks) | $0.20 / 1M токенов | ~$0.00014 |
| Qwen2.5 7B (Fireworks) | $0.20 / 1M токенов | ~$0.00014 |
| DeepSeek V3 (Fireworks) | $0.56 / 1M токенов | ~$0.00040 |

### 📁 Файловый менеджер
- Просмотр структуры проекта через веб-интерфейс
- Редактирование файлов с подсветкой синтаксиса (CodeMirror)
- Загрузка и скачивание файлов
- Синхронизация темы с основным интерфейсом

### 💻 Встроенный терминал
- SSH-доступ к серверу прямо из браузера
- Полноценная terminal emulator на базе xterm.js
- Поддержка всех стандартных команд
- Синхронизация цветовой темы с React UI

### ⚙️ Гибкие настройки

**Глобальные настройки:**
- Провайдеры LLM (Kimi, OpenAI, Anthropic, Fireworks, OpenRouter, Gemini)
- Регистрация моделей с capabilities
- Loop control (max_steps_per_turn, max_retries_per_step, compaction_trigger_ratio)
- MCP интеграция
- Moonshot Search / Fetch сервисы
- Theme (тёмная / светлая тема терминала)

**Настройки сессии *(наш уникальный функционал)*:**
- Temperature, Top P, Max Tokens, Thinking Keep
- **Guardian AI** — вкл/выкл + выбор модели проверки
- **Git diff** — видьте незакоммиченные изменения прямо в настройках
- Инструкции проекта (AGENTS.md, Skills) с авто-дискавери
- Рефакторинг инструкций через AI

### 🎨 Темы оформления
- **kimi-dark** — классическая тёмная тема
- **kimi-light** — светлая тема
- **neon** — неоновая киберпанк
- **matrix** — зелёный матричный стиль
- **molten** — огненная тема

Переключение в один клик, синхронизация между React UI, терминалом и файловым менеджером.

### 📜 Пагинация истории *(наше улучшение)*
- Для длинных сессий история подгружается частями
- Кнопка «Загрузить старые сообщения»
- Отображение общего количества сообщений

---

## 🚀 Быстрый старт

### Требования
- Python 3.12+
- Node.js 20+
- uv (для Python-зависимостей)

### Установка

```bash
# 1. Клонирование репозитория
git clone https://github.com/adden-git/kimi-next.git
cd kimi-next

# 2. Установка Python-зависимостей
uv sync

# 3. Сборка фронтенда
cd web && npm install && npm run build && cd ..

# 4. Копирование статических файлов
cp -r web/dist/* src/kimi_cli/web/static/

# 5. Запуск сервера
uv run python run_dev.py
```

Сервер запустится на `http://0.0.0.0:5500`.

### Настройка API-ключа

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
api_key = "sk-YOUR-API-KEY-HERE"
```

### Добавление Fireworks (дёшево для Guardian AI)

В Global Settings нажмите кнопку **+ Fireworks** или добавьте в `config.toml`:

```toml
[providers.fireworks]
type = "openai_legacy"
base_url = "https://api.fireworks.ai/inference/v1"
api_key = "fw-YOUR-KEY"

[models.llama-guardian]
provider = "fireworks"
model = "accounts/fireworks/models/llama-v3p1-8b-instruct"
max_context_size = 8192
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
│ files.html      │                      │  LLM Providers   │
│ ssh.html        │                      │  (Kimi/OpenAI/   │
│ (standalone)    │                      │  Fireworks/etc)  │
└─────────────────┘                      └──────────────────┘
```

### Технологический стек

| Слой | Технологии |
|------|-----------|
| **Фронтенд** | React 19, Vite, Tailwind CSS v4, shadcn/ui, Radix UI |
| **Бэкенд** | FastAPI, uvicorn, asyncio, uvloop |
| **LLM** | kosong (унификация провайдеров), pydantic |
| **Сессии** | WebSocket (real-time), JSON-RPC wire protocol |
| **Терминал** | xterm.js |
| **Редактор** | CodeMirror 5 |

---

## 🛡️ Guardian AI — подробнее

Guardian AI интегрирован через **PreToolUse hook** — он срабатывает **перед** human approval и **перед** выполнением инструмента.

**Fail-open архитектура:**
- Если Guardian LLM недоступен — инструмент выполняется
- Если Guardian выдаёт ошибку — инструмент выполняется
- Только явный ответ «BLOCK» останавливает выполнение

**Системный промпт Guardian:**
```
Вы — security guardian AI. Ваша задача — проверять вызовы инструментов.
Анализируйте: безопен ли вызов? Попытка удалить критические файлы?
Подозрительная shell-команда? Утечка секретов?
Ответьте ТОЛЬКО одним словом: ALLOW или BLOCK.
```

---

## 📁 Структура проекта

```
kimi-next/
├── web/                          # React 19 frontend
│   ├── src/
│   │   ├── components/           # UI компоненты (dialogs, forms)
│   │   ├── features/             # Chat, Sessions, Workspace
│   │   └── hooks/                # use-theme, useSessionStream
│   └── dist/                     # Production build (копируется в static)
├── src/kimi_cli/                 # Python backend
│   ├── web/                      # FastAPI приложение
│   │   ├── api/                  # Routes: sessions, config
│   │   └── static/               # files.html, ssh.html, index.html
│   ├── soul/                     # KimiSoul, agent loop, context
│   ├── tools/                    # Встроенные инструменты
│   ├── guardian.py               # 🛡️ Guardian AI module
│   └── session_state.py          # Состояние сессии (guardian_enabled)
├── packages/                     # Workspace зависимости
│   ├── kosong/                   # Абстракция LLM-провайдеров
│   └── kaos/                     # Абстракция ОС (файлы, процессы)
└── docs/                         # VitePress документация
```

---

## 📝 Лицензия

MIT License — см. [LICENSE](LICENSE)

Оригинальный Kimi Code CLI: © [Moonshot AI](https://www.moonshot.cn/)

---

## 👤 Автор и контакты

**Разработчик:** Zemskov Igor  
**Проект:** AlpsStroy  
**Telegram:** [@alpsstroy1](https://t.me/alpsstroy1)

По вопросам установки, багам, предложениям и сотрудничеству — пишите в Telegram.

**Репозиторий:** [github.com/adden-git/kimi-next](https://github.com/adden-git/kimi-next)

---

> ⚠️ **Внимание:** Это форк оригинального [Kimi Code CLI](https://github.com/MoonshotAI/kimi-cli) от Moonshot AI с добавлением веб-интерфейса и дополнительных функций (Guardian AI, файловый менеджер, терминал, настройки сессии). Оригинальная документация: [moonshotai.github.io/kimi-cli](https://moonshotai.github.io/kimi-cli/).
