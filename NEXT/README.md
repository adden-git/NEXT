# NEXUS — Neural EXecution Universal System

> **Codename: NEXT** | Space Station AI Interface

NEXUS — это AI-агент для разработки программного обеспечения в стиле космической станции. Универсальная архитектура позволяет подключать любой LLM-провайдер (OpenAI, Anthropic, Google, локальные модели).

## 🚀 Архитектура

```
┌─────────────────────────────────────────────────────────┐
│  NEXUS STATION — Mission Control Interface              │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │  COMMS      │  │  NAVIGATION  │  │  SYSTEMS       │  │
│  │  (Chat)     │  │  (Files/SSH) │  │  (Settings)    │  │
│  └─────────────┘  └──────────────┘  └────────────────┘  │
└─────────────────────────────────────────────────────────┘
                    │
              ┌─────┴─────┐
              │  CORE AI  │
              │  Engine   │
              └─────┬─────┘
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
   ┌────────┐ ┌────────┐ ┌────────┐
   │  LLM   │ │  LLM   │ │  LLM   │
   │Provider│ │Provider│ │Provider│
   │  #1    │ │  #2    │ │  #N    │
   └────────┘ └────────┘ └────────┘
```

## 🛰️ Технологический стек

| Слой | Технологии |
|------|-----------|
| **Interface** | HTML5 Canvas, WebGL Stars, CSS3 Animations |
| **Backend** | FastAPI, asyncio |
| **AI Engine** | Provider-agnostic (OpenAI, Anthropic, Google, local) |
| **Protocol** | WebSocket + JSON-RPC |

## 🎮 Интерфейс

- **Starfield Background** — живое звёздное поле на Canvas
- **HUD Panels** — панели в стиле космического корабля
- **Neon Accents** — циан, пурпур, оранжевый
- **CRT Effects** — сканлайны терминала
- **Mission Terminology** — "Transmit" вместо "Send", "Mission Log" вместо "History"

## 👤 Автор

Zemskov Igor | Telegram: @alpsstroy1
