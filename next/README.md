# ◈ NEXUS STATION ◈

> **Neural EXecution Universal System** v2.0.0  
> Codename: NEXT | Space Station AI Interface

NEXUS STATION — полноценный порт **Kimi Next Web UI** с полным ребрендингом. AI-агент для разработки программного обеспечения в космической стилистике.

## 🌐 Демо

**http://94.241.142.95:5600**

## 🚀 Быстрый старт

```bash
git clone https://github.com/adden-git/NEXT.git
cd NEXT
python run.py
```

Сервер запустится на **http://localhost:5600**

## ✅ Что перенесено из оригинала

| Модуль | Файлов | Статус |
|--------|--------|--------|
| Backend (src/) | 221 Python | ✅ Полный порт + ребрендинг |
| Frontend (web/) | 171 React | ✅ Полный порт + ребрендинг |
| Packages (kosong/kaos) | 64 | ✅ Скопированы |
| Assets | 3000+ | ✅ Собраны |

## 🔥 Функции

- **🤖 AI-агент** — полноценный цикл взаимодействия с LLM
- **🛡️ Shield AI** — двойная проверка безопасности
- **📁 Файловый менеджер** — CodeMirror редактор
- **💻 SSH Терминал** — xterm.js
- **📡 WebSocket** — real-time коммуникации
- **⚙️ Настройки сессии** — model params, Git diff, Guardian
- **🔗 6 провайдеров** — Kimi (основной), OpenAI, Anthropic, Google, Fireworks, Local
- **🎨 Космический дизайн** — starfield, HUD, neon accents
- **🔒 Trial License** — 7 дней, обфусцированная проверка

## 🛡️ Лицензия / Trial

- Пробный период: **7 дней** с первого запуска
- Проверка встроена в `src/nexus_station/core/_sys_check.py`
- XOR-обфускация registry
- После истечения — блокировка с контактом разработчика

## 📁 Структура

```
next/
├── src/nexus_station/     # Backend (221 файлов)
│   ├── soul/              # Agent loop, context, compaction
│   ├── tools/             # Shell, File, Web, Todo, Think, Plan
│   ├── web/               # FastAPI + Static files
│   ├── ui/                # Shell/Print/ACP frontends
│   ├── subagents/         # Subagent system
│   ├── skills/            # Skills system
│   └── core/_sys_check.py # Trial license
├── web/                   # React 19 frontend (171 файл)
├── packages/              # kosong + kaos
├── run.py                 # Bootstrap
└── pyproject.toml
```

## 👤 Автор

**Zemskov Igor**  
📡 Telegram: [@alpsstroy1](https://t.me/alpsstroy1)  
🔗 GitHub: [github.com/adden-git/NEXT](https://github.com/adden-git/NEXT)

---

> ⚠️ **Внимание:** Это форк оригинального Kimi Code CLI от Moonshot AI с полным ребрендингом и космической темой.
