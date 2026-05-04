# ◈ NEXUS STATION ◈

> **Neural EXecution Universal System**
>
> Версия: 2.0.0 · Кодовое имя: NEXT · Космическая станция управления AI-агентами

**NEXUS STATION** — веб-интерфейс для управления AI-агентами разработки программного обеспечения. Полная космическая тематика оформления: starfield-фон, HUD-элементы, неоновые акценты, иконки в стиле космоса.

---

## 🚀 Быстрый старт

```bash
git clone https://github.com/adden-git/NEXT.git
cd NEXT
python3 setup.py --auto
```

После установки сервер будет доступен по адресу **http://localhost:5600**

Для интерактивной установки с выбором параметров:

```bash
python3 setup.py
```

---

## 📋 Что делает установщик

| Шаг | Действие |
|:---|:---|
| 1 | Проверяет Python 3.12+ (или устанавливает через `uv`) |
| 2 | Создаёт изолированное виртуальное окружение `.venv` |
| 3 | Устанавливает все Python-зависимости |
| 4 | Генерирует `.env` со случайными секретными ключами |
| 5 | Создаёт `ecosystem.config.js` с актуальными путями |
| 6 | Создаёт директорию `logs/` для журналов |

---

## 🔧 Системные требования

- **Операционная система:** Linux или macOS (Windows — через WSL)
- **Python:** 3.12 или новее (рекомендуется) либо [uv](https://docs.astral.sh/uv/)
- **Node.js:** 24+ (для сборки фронтенда)
- **PM2:** для фонового запуска в production (опционально)

---

## 🛠️ Установка и запуск

### Автоматическая установка (рекомендуется)

```bash
git clone https://github.com/adden-git/NEXT.git
cd NEXT
python3 setup.py --auto
```

### Ручная установка

```bash
git clone https://github.com/adden-git/NEXT.git
cd NEXT

# Вариант А: через uv (быстрее)
uv venv .venv
uv pip install -e ".[dev]"

# Вариант Б: через стандартный venv
python3.12 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"

# Создать .env из примера
cp .env.example .env
# Отредактировать .env — указать API-ключи провайдеров

# Собрать фронтенд
cd web
npm install
npx vite build
cp -r dist/* ../src/nexus_station/web/static/
cd ..

# Запуск
python run.py
```

---

## ▶️ Запуск

### Режим разработки

```bash
# Терминал 1 — фронтенд
cd web && npm run dev

# Терминал 2 — бэкенд
python run.py
```

### Режим production (PM2)

```bash
pm2 start ecosystem.config.js
pm2 save
```

Конфигурация PM2 включает два процесса:

| Процесс | Порт | Описание |
|:---|:---|:---|
| `nexus-station` | 5600 | Основной сервер (FastAPI + статика) |
| `nexus-auth` | 5601 | Сервис аутентификации (SQLite) |

---

## 🔄 Обновление

```bash
cd /path/to/NEXT
git pull
python3 setup.py --auto
pm2 reload ecosystem.config.js
```

---

## 🏗️ Архитектура

```
┌─────────────────┐      WebSocket / HTTP      ┌─────────────────┐
│   React 19      │ ◄────────────────────────► │   FastAPI       │
│   Vite +        │      JSON-RPC over WS      │   (uvicorn)     │
│   Tailwind v4   │                            │                 │
└─────────────────┘                            └────────┬────────┘
                                                        │
                              ┌─────────────────────────┼────────────────────────┐
                              │                         │                        │
                              ▼                         ▼                        ▼
                        ┌──────────┐          ┌──────────────┐         ┌─────────────┐
                        │ Sessions │          │  CLI Runner  │         │   Config    │
                        │  Store   │          │  (subprocess)│         │   (TOML)    │
                        └──────────┘          └──────────────┘         └─────────────┘
```

- **Бэкенд:** `src/nexus_station/` — FastAPI-приложение
- **Фронтенд:** `web/src/` — React 19 + Vite + Tailwind CSS v4 + shadcn/ui
- **Протокол:** JSON-RPC 2.0 через WebSocket для real-time коммуникаций
- **Аутентификация:** Отдельный сервис на 5601 порту с SQLite-хранилищем

---

## 📁 Структура проекта

```
next/
├── src/nexus_station/           # Бэкенд
│   ├── web/                     # FastAPI + статические файлы
│   ├── soul/                    # Цикл агента, контекст, compaction
│   ├── tools/                   # Инструменты: Shell, File, Web, Todo, Think, Plan
│   ├── agents/                  # Конфигурации агентов
│   ├── subagents/               # Система субагентов
│   ├── skills/                  # Система навыков
│   ├── prompts/                 # Промпты для LLM
│   ├── auth/                    # Аутентификация
│   ├── cli/                     # CLI-интерфейс
│   └── core/                    # Ядро системы
├── web/                         # Фронтенд
│   ├── src/
│   │   ├── components/          # UI-компоненты
│   │   ├── features/            # Функциональные модули
│   │   │   ├── chat/            # Чат-интерфейс
│   │   │   ├── sessions/        # Управление сессиями
│   │   │   └── tool/            # Инструменты
│   │   ├── hooks/               # React-хуки
│   │   └── lib/                 # Утилиты и API-клиент
│   └── vite.config.ts           # Конфигурация сборки
├── auth_server/                 # Сервис аутентификации
├── setup.py                     # Автоматический установщик
├── run.py                       # Точка входа
├── ecosystem.config.js          # Конфигурация PM2
└── pyproject.toml               # Зависимости Python
```

---

## ⚡ Технологический стек

### Бэкенд

| Компонент | Технология |
|:---|:---|
| Язык | Python 3.12+ |
| Фреймворк | FastAPI |
| Сервер | Uvicorn |
| Протокол | JSON-RPC 2.0 over WebSocket |
| Аутентификация | JWT + SQLite |

### Фронтенд

| Компонент | Технология |
|:---|:---|
| Фреймворк | React 19 |
| Сборщик | Vite 7 |
| Стили | Tailwind CSS v4 |
| Компоненты | shadcn/ui + Radix UI |
| Иконки | Phosphor Icons (@phosphor-icons/react) |
| Редактор кода | CodeMirror 6 |
| Терминал | xterm.js |

---

## ✨ Ключевые особенности

| Возможность | Описание |
|:---|:---|
| **🤖 AI-агент** | Полноценный цикл взаимодействия с LLM — от запроса до выполнения |
| **🛡️ Shield AI** | Двойная проверка безопасности перед выполнением операций |
| **📁 Файловый менеджер** | Просмотр и редактирование файлов через CodeMirror |
| **💻 SSH-терминал** | Встроенный терминал на базе xterm.js с космической темой |
| **📡 WebSocket** | Real-time коммуникации с бэкендом |
| **⚙️ Настройки сессии** | Параметры модели, Git diff, Guardian, цепочка рассуждений |
| **🔗 Мультипровайдерность** | 6 провайдеров LLM на выбор |
| **🎨 Космический дизайн** | Starfield-фон, HUD-элементы, неоновые акценты, Phosphor Icons |
| **🧩 Субагенты** | Создание и управление дочерними AI-агентами |
| **📋 Todo и Plan** | Встроенное планирование задач внутри сессии |

---

## 🔗 Провайдеры LLM

| Провайдер | Статус | Примечание |
|:---|:---|:---|
| **Kimi** (Moonshot AI) | ✅ Основной | Рекомендуется |
| **OpenAI** | ✅ | GPT-4, GPT-4o |
| **Anthropic** | ✅ | Claude 3.5/4 |
| **Google** | ✅ | Gemini |
| **Fireworks** | ✅ | Быстрые open-source модели |
| **Local** | ✅ | Локальные модели через Ollama/vLLM |

---

## 🛡️ Лицензия

- **Пробный период:** 7 дней с момента первого запуска
- **Проверка лицензии:** встроена в `src/nexus_station/core/_sys_check.py`
- **После истечения:** блокировка с контактом разработчика для продления

---

## 🐛 Отладка

```bash
# Логи основного сервера
tail -f logs/nexus.out.log logs/nexus.err.log

# Логи авторизации
tail -f logs/auth.out.log logs/auth.err.log

# Статус процессов PM2
pm2 status
pm2 logs --lines 50
```

---

## 👤 Автор

**Zemskov Igor**

- 📡 Telegram: [@alpsstroy1](https://t.me/alpsstroy1)
- 🔗 GitHub: [github.com/adden-git](https://github.com/adden-git)
