# NEXUS Station — Roadmap

> Живой документ плана развития приложения. Обновляется по мере реализации фич.

---

## ✅ Already Done (v2.0)

### Core Platform
- [x] **Чат-интерфейс** — мульти-сессии, история, архивация
- [x] **WebSocket real-time** — JSON-RPC 2.0, fanout для множества клиентов
- [x] **Session management** — fork, export, title generation
- [x] **Auth system** — PBKDF2 хеши, динамические токены, admin mode
- [x] **File manager** — upload (до 100MB), директории, ZIP-скачивание
- [x] **SSH Terminal** — встроенный xterm.js
- [x] **Git integration** — diff viewer, status

### AI Agent Engine
- [x] **Plan Mode** — пошаговое планирование с approve/reject
- [x] **Subagents** — coder, explore, plan агенты
- [x] **Guardian AI** — защита от вредоносных действий
- [x] **Tool System** — Shell, File ops, Web search/fetch, Todo, AskUser
- [x] **Background Tasks** — async выполнение, heartbeats, TaskList/TaskOutput/TaskStop
- [x] **MCP Integration** — подключение внешних MCP-серверов
- [x] **Hooks Engine** — кастомные хуки на события

### LLM Infrastructure
- [x] **Multi-provider** — Kimi, OpenAI, Anthropic, Gemini, Fireworks и др.
- [x] **Model switching** — глобальная и per-session модель
- [x] **Thinking mode** — toggle + always_thinking поддержка
- [x] **Capabilities system** — image_in, video_in, thinking
- [x] **Model env vars** — temperature, top_p, max_tokens через UI

---

## 🚧 In Progress (v2.0.x)

### Модели и UX
- [x] **Категории моделей** — Code / Text & Analysis / Image Generation
- [x] **Ценовые метки** — budget 💰 / standard 💎 / premium 👑 + tooltip с ценой
- [x] **Image Generation Tool** — `GenerateImage` через Fireworks FLUX.1 Dev
- [x] **Image Gen Mode badge** — индикатор когда выбрана image-модель
- [ ] **Image gen endpoint** — прямой API `/api/sessions/{id}/generate-image` (не через tool-call)
- [ ] **Img2img pipeline** — отправка фото + промпт = сгенерированное изображение

---

## 📋 Planned v2.1 — Design & Media

### Изображения
- [ ] **Inpainting / Outpainting** — редактирование областей изображения
- [ ] **Upscaling** — 2x/4x улучшение разрешения
- [ ] **Image gallery** — хранилище сгенерированных изображений в сессии
- [ ] **Style presets** — аниме, фотореализм, 3D-render, pixel-art

### Видео
- [ ] **Text-to-Video** — генерация коротких видео по описанию
- [ ] **Image-to-Video** — анимация статичного изображения

---

## 📋 Planned v2.2 — Design Mode

### Визуальный редактор
- [ ] **Design Canvas** — drag-and-drop вёрстка страниц
- [ ] **Live Preview** — instant HTML/CSS/JS preview рядом с чатом
- [ ] **Component library** — buttons, cards, navbars, forms
- [ ] **Responsive preview** — mobile / tablet / desktop breakpoints

### Интеграции
- [ ] **Figma API** — импорт/экспорт дизайнов
- [ ] **Tailwind CSS gen** — автоматическая генерация Tailwind-классов
- [ ] **Export** — HTML/CSS, React, Vue код из canvas

---

## 📋 Planned v2.3 — Multi-modal Pipeline

### End-to-end workflow
- [ ] **Photo → Design** — загрузка фото референса → генерация макета
- [ ] **Design → Code** — макет → рабочий HTML/CSS/JS
- [ ] **Code → Preview** — one-click deploy preview
- [ ] **Prompt → Site** — текстовое описание → готовый лендинг

### Улучшенный чат
- [ ] **Vision для всех моделей** — image_in для text-моделей (через vision API)
- [ ] **Multi-image context** — несколько изображений в одном промпте
- [ ] **Image analysis** — "опиши этот скриншот", "найди баги на картинке"

---

## 📋 Planned v3.0 — Ecosystem

### Расширяемость
- [ ] **Plugin Marketplace** — установка community tools и providers
- [ ] **Custom Tools API** — пользовательские Python-tools без форка
- [ ] **Community Models** — shared конфиги моделей (HuggingFace, Replicate)

### Коллаборация
- [ ] **Team Workspaces** — shared сессии и проекты
- [ ] **Comments & Review** — ревью кода и дизайна внутри чата
- [ ] **Version History** — git-like история для сессий

---

## 💡 Идеи на будущее

- **Voice mode** — голосовой ввод/вывод
- **Code Interpreter** — Python execution environment (like Jupyter)
- **Database designer** — визуальный ER-диаграммы + SQL gen
- **API Builder** — генерация REST/gRPC API из описания
- **Mobile App** — React Native / Flutter генератор

---

## 🚀 Moonshot: Собственный AI Coding Agent с нуля

> **Статус**: Идея. Требует серьёзных инвестиций. Не в ближайших планах.

### Видение
Создать собственного coding-агента, который по качеству превосходит Kimi Code CLI, Claude Code, GitHub Copilot Workspace. Агент должен автономно исследовать кодовую базу, планировать изменения, редактировать код, запускать тесты и исправлять ошибки — с минимальным вмешательством человека.

### Три уровня реализации

#### Уровень 1: "Smart Wrapper" (RAG + Prompt Engineering)
**Что это**: Не обучаем модель, а создаём умную систему поверх существующей LLM (GPT-4o, Claude, Kimi K2.6).
- Улучшенные system prompts
- RAG по кодовой базе проекта
- Smart context window management
- Кастомные tool schemas

**Ресурсы**:
- **Время**: 2-4 месяца (1 backend + 1 ML engineer)
- **Инфраструктура**: $200-500/мес (GPU для эмбеддингов, векторная БД)
- **API costs**: $500-2000/мес (зависит от использования)
- **Итого**: ~$5K-15K за запуск + ~$1K-3K/мес

#### Уровень 2: "Fine-tuned Agent" (Дообучение open-source модели)
**Что это**: Берём open-source модель (Qwen-Coder, CodeLlama, DeepSeek-Coder) и дообучаем на кастомных данных.
- Сбор dataset'а из реальных coding сессий
- SFT (Supervised Fine-Tuning) на tool-calling
- RLHF/DPO на качество кода
- LoRA/QLoRA для экономии ресурсов

**Ресурсы**:
- **Время**: 6-12 месяцев (2 ML researchers + 2 backend + 1 data engineer)
- **GPU кластер**: $10K-50K одноразово или $3K-10K/мес аренда (8x A100/H100)
- **Данные**: $5K-20K на сбор и разметку dataset'а (100K-1M примеров)
- **Хранилище + инфра**: $1K-3K/мес
- **Итого**: ~$50K-200K за запуск + ~$5K-15K/мес

#### Уровень 3: "Foundation Model" (Pre-training с нуля)
**Что это**: Строим собственную foundation model с нуля.
- Сбор multi-trillion token corpus
- Pre-training на кластере из сотен GPU
- Post-training (SFT + RLHF)
- Собственный inference infrastructure

**Ресурсы**:
- **Время**: 2-3 года (команда 10-20 человек: researchers, engineers, infra)
- **GPU кластер**: $5M-20M (покупка) или $500K-2M/мес (аренда)
- **Данные**: $1M-5M на сбор, очистку, фильтрацию
- **Инфраструктура**: $50K-200K/мес
- **Итого**: ~$10M-50M+ за первые 2 года

### Сравнение с конкурентами

| Параметр | Kimi Code CLI | Claude Code | Наш "Smart Wrapper" | Наш "Fine-tuned" |
|----------|---------------|-------------|---------------------|------------------|
| SWE-Bench | ~58% | ~72% | ~40-50%* | ~55-65%* |
| Latency | 2-5s | 3-8s | 1-3s | 1-2s |
| Cost/1K tk | $0.008 | $0.015 | $0.002-0.005 | $0.001-0.003 |
| Context | 256K | 200K | 128K-256K | 128K-256K |
| Autonomy | средняя | высокая | низкая-средняя | средняя-высокая |

\* Оценки для проекта с нуля без миллионных инвестиций

### Что нужно для старта (минимум)

**Команда**:
- 1x ML Engineer (fine-tuning, data pipelines)
- 1x Backend Engineer (infrastructure, API, tools)
- 1x Researcher/PM (dataset curation, evaluation)

**Инфраструктура**:
- 4x A100 80GB или 8x RTX 4090 (для LoRA fine-tuning)
- 500GB+ NVMe SSD
- Векторная БД (Pinecone/Weaviate/Qdrant)

**Данные**:
- 50K-100K пар "coding task → solution" (с tool calls)
- 10K-50K примеров ревью кода
- 5K-10K примеров bug fixing с тестами

### Рекомендация

Если цель — превзойти Kimi/Claude **в рамках разумного бюджета**, единственный реалистичный путь:
1. **Старт**: Уровень 1 (Smart Wrapper) — ~$10K-20K, 3-4 месяца
2. **Рост**: Накопить 100K+ real-world coding sessions через текущую платформу
3. **Fine-tuning**: Использовать эти данные для Уровня 2 через 12-18 месяцев

Pre-training с нуля (Уровень 3) — это игра для компаний с $100M+ funding (Anthropic, OpenAI, Moonshot).

---

*Последнее обновление: 2026-05-09*

---

*Последнее обновление: 2026-05-09*
