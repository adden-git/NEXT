# kimi-next — изменения, доработки и оптимизации

> **Проект:** `/var/www/kimi-next/` (Kimi Code CLI Web UI, порт 5500)
> **Дата обновления:** 2026-04-29 (настройки + UI + мобильная адаптация)
> **Статус:** активная разработка + оптимизация

---

## 📡 Backend API (FastAPI)

### 1. Extended Config API
- **Файл:** `src/kimi_cli/web/api/config.py`
- **Endpoints:**
  - `GET /api/config/extended` — полный снимок конфигурации Kimi (Pydantic модель `ExtendedConfig`)
  - `PUT /api/config/extended` — обновление конфигурации с валидацией, автоматический restart сессий
- **Защита:** `_ensure_sensitive_apis_allowed` (блокировка в public mode без LAN)

### 4. Model Environment Variables API
- **Файл:** `src/kimi_cli/web/api/config.py`
- **Endpoints:**
  - `GET /api/config/env` — текущие значения `KIMI_MODEL_TEMPERATURE`, `KIMI_MODEL_TOP_P`, `KIMI_MODEL_MAX_TOKENS`, `KIMI_MODEL_THINKING_KEEP`
  - `PUT /api/config/env` — обновление env vars с валидацией диапазонов + автоматический restart всех running workers
- **Валидация:**
  - `temperature`: 0.0 — 2.0
  - `top_p`: 0.0 — 1.0
  - `max_tokens`: 1 — 200 000
- **Механизм:** env vars устанавливаются в `os.environ` основного процесса, workers при restart наследуют их через `get_clean_env()`

### 2. File Manager API
- **Файл:** `src/kimi_cli/web/api/files.py`
- **Endpoints:**
  - `GET /api/files/list?path=` — список файлов/папок
  - `GET /api/files/read?path=` — чтение текстового файла (лимит 5MB)
  - `POST /api/files/write` — запись файла
  - `POST /api/files/mkdir` — создание директории
  - `POST /api/files/delete` — удаление файла/папки
  - `POST /api/files/rename` — переименование
- **Защита:** требует `Authorization: Bearer <token>`

### 3. SSH API
- **Файл:** `src/kimi_cli/web/api/ssh.py`
- **Endpoints:**
  - `POST /api/ssh/exec` — однократное выполнение команды через paramiko
  - `WS /api/ssh/ws` — интерактивный WebSocket терминал
  - `GET /api/ssh/status` — snapshot: PM2 статус, диск, uptime, load average
- **Авторизация WebSocket:** проверка `?token=` в query params против `app.state.session_token`
- **Авто-аутентификация localhost:** при `host == "localhost"` без пароля используется SSH-ключ `/root/.ssh/id_rsa`
- **Prompt:** `export PS1="\u@\h:\W\$ "` — короткий путь (только имя текущей папки)

---

## 🎨 Frontend — React-приложение Kimi Web UI

### 1. SettingsDialog
- **Файл:** `web/src/components/settings-dialog.tsx`
- Перенесён из исключённой директории `ai-elements/` (которая не попадает в продакшн-сборку)
- Русская локализация, 6 секций: Параметры генерации, Основные, Управление циклом, Провайдеры, Сервисы, MCP
- **Закрытие:** кнопка ✕ в header + свайп вниз **только из header** (touch events на header div, deltaY > 120px)
- **Убран встроенный крестик shadcn:** `showCloseButton={false}` на DialogContent
- **Автосохранение:** debounce 1200ms — при любом изменении поля автоматически сохраняется config + env vars
- **Индикатор изменений:** badge "изменено" / "сохранение..." рядом с заголовком
- **Загрузка:** параллельно `/api/config/extended` + `/api/config/env`

#### Параметры генерации (новые)
| Параметр | Диапазон | По умолчанию | Описание |
|----------|----------|--------------|----------|
| **Temperature** | 0.0 — 2.0 | 1.0 | Случайность ответа. 0=точно, 1=баланс, 2=креатив |
| **Top P** | 0.0 — 1.0 | 0.95 | Nucleus sampling. Фильтрация токенов по кумулятивной вероятности |
| **Max Tokens** | 1 — 200 000 | 32 768 | Максимум токенов в ответе |
| **Thinking Keep** | строка | пусто | Сохранение reasoning для Kimi K2.5 (`none`, `low`, `high`) |

> **Валидация на backend:** Pydantic `ge=0.0, le=2.0` для temperature, `ge=0.0, le=1.0` для top_p, `ge=1, le=200000` для max_tokens. За пределами диапазона — 422 с деталями.

> **Примечание:** поле "Тема" убрано из настроек — тема управляется глобальным переключателем в sidebar (5 тем через `localStorage`)

### 2. Sidebar иконки
- **Файл:** `web/src/features/sessions/sessions.tsx`
- В header добавлены иконки:
  - ⚙️ Настройки (SettingsDialog)
  - 📁 Файловый менеджер (`/files.html?token=...`)
  - 🖥 SSH терминал (`/ssh.html?auto=1&token=...`)
- Ссылки автоматически дополняются auth token из `localStorage`

### 3. Система тем — 5 тем
- **Файлы:** `web/src/hooks/use-theme.ts`, `web/src/components/ui/theme-toggle.tsx`, `web/src/index.css`
- **Темы:**
  - ☀️ **Light** — стандартная светлая
  - 🌙 **Dark** — стандартная тёмная
  - 💠 **Neon** — тёмно-синий фон, неоновый циан акцент
  - 🟢 **Matrix** — чёрный фон, зелёный `#00ff41` текст
  - 🔥 **Molten** — тёмно-коричневый фон, огненный оранжевый акцент
- **Переключатель:** dropdown (shadcn Select) вместо кнопки солнце/луна
- **Сохранение:** `localStorage.setItem("kimi-theme", theme)`
- **CSS:** `.dark.neon`, `.dark.matrix`, `.dark.molten` переопределяют CSS-переменные

### 4. Панель управления чатом
- **Файл:** `web/src/features/chat/global-config-controls.tsx`
- Убран toggle **Plan mode** (полностью удалён блок)
- **Thinking** переименован в **T** (одна буква, компактно для мобильных)

---

## 🖥 SSH терминал (standalone страница)

### Файл: `src/kimi_cli/web/static/ssh.html`
- **Дизайн:** в стиле Kimi (Inter, скругления, тени, CSS-переменные)
- **Темы:** 5 тем (общие с основным приложением Kimi, синхронизируются через `localStorage`)
- **Авто-подключение:** `?auto=1` подключается к localhost по SSH-ключу без prompt
- **Вкладки:**
  - 🖥 Терминал (xterm.js)
  - 📋 Логи — текстовая копия всего вывода (нативное выделение на мобильных)
  - 📊 Статус — PM2, диск, uptime/load
- **Header:** ← Кими, тема, статус-индикатор, ↻ reconnect
- **Prompt:** короткий (`\W` вместо `\w`)
- **Auth:** token из URL или `localStorage` передаётся в WebSocket `?token=...`

#### Мобильная адаптация SSH
- **Убраны кнопки копирования из header** (📄, 📋) — дублировали функционал и вылазили за пределы
- **Контекстное меню (long-press / right-click):**
  - 📋 Копировать всё
  - 📄 Копировать выделенное
  - 🗑 Очистить терминал
- **Font size:** 12px на мобильных (вместо 14px)
- **Header compact:** title скрывается на <640px
- **Tabs compact:** padding и font-size уменьшены на мобильных

---

## 📁 Файловый менеджер (standalone страница)

### Файл: `src/kimi_cli/web/static/files.html`
- **Дизайн:** в стиле Kimi (те же CSS-переменные и переключатель тем)
- **Редактор:** CodeMirror 5 с авто-определением синтаксиса по расширению
- **Темы CodeMirror:** кастомные стили через CSS-переменные (без привязки к Dracula)
- **Функции:** навигация, редактирование, создание папок, удаление, переименование, вставка текста
- **Мобильная адаптация:** колонки "Размер" и "Изменён" скрыты на <640px

#### Мобильная адаптация файлового менеджера
- **Editor fullscreen на мобильных:** `width: 100vw`, `height: 100vh`, `border-radius: 0`, padding 8px
- **Editor header:** `white-space: nowrap; overflow: hidden; text-overflow: ellipsis` — название файла не вылазит
- **Editor buttons:** на мобильных кнопки в столбик (`flex-direction: column`), полная ширина
- **Toolbar compact:** уменьшен padding и font-size на <640px
- **Pathbar compact:** input и button меньше на мобильных
- **Table compact:** padding ячеек уменьшен, кнопки действий мельче

---

## 🚀 Оптимизации производительности (2026-04-29)

### 1. orjson — быстрая JSON-сериализация в Python
- **Установлены:** `orjson` + `msgspec` (uv pip install)
- **Создан модуль:** `src/kimi_cli/web/utils/_json.py` — обёртка с автоматическим fallback на stdlib `json`, если `orjson` недоступен
- **API модуля:** `dumps()`, `loads()`, `JSONDecodeError`, а также namespace-объект `json` для совместимости (`json.dumps`, `json.loads`)
- **Заменены импорты** в hot-path файлах:
  - `src/kimi_cli/web/api/sessions.py`
  - `src/kimi_cli/web/api/ssh.py`
  - `src/kimi_cli/web/runner/process.py`
  - `src/kimi_cli/web/store/sessions.py`
- **Эффект:** orjson в 10–50 раз быстрее stdlib `json` на сериализации WebSocket-чанков и wire messages

### 2. Vite manual chunks — разделение бандла
- **Файл:** `web/vite.config.ts`
- Добавлено `build.rollupOptions.output.manualChunks` с разделением на:
  - `vendor-react` — react, react-dom
  - `vendor-ui` — radix-ui компоненты, lucide-react, tailwind-merge, clsx, cva
  - `vendor-chat` — ai, react-virtuoso, streamdown, diff, gitdiff-parser
  - `vendor-heavy` — mermaid, shiki
- **Эффект:** vendor-библиотеки кэшируются между билдами, пересборка только app-кода. Пользователь загружает тяжёлые чанки один раз.

### 3. React lazy loading — отложенная загрузка диалогов
- **Файлы:** `web/src/App.tsx`, `web/src/features/sessions/sessions.tsx`
- `CreateSessionDialog` и `SettingsDialog` обёрнуты в `React.lazy()` + `Suspense fallback={null}`
- Добавлены `export default` в оба компонента (`create-session-dialog.tsx`, `settings-dialog.tsx`)
- Удалён мёртвый импорт `SettingsDialog` из `App.tsx`
- **Эффект:** уменьшение initial bundle, диалоги загружаются только при открытии

### 4. uvicorn optimization — uvloop + httptools
- **Файл:** `src/kimi_cli/web/app.py`
- Добавлены параметры в `uvicorn.run()`:
  - `loop="uvloop"` — замена asyncio event loop на uvloop (написан на C, быстрее в 2–4 раза)
  - `http="httptools"` — парсер HTTP на C вместо Python h11
- **Эффект:** быстрее обработка HTTP-запросов и WebSocket-соединений

### 5. LLM API Benchmark — бенчмарк latency провайдеров
- **Файл:** `scripts/benchmark_llm_api.py`
- Скрипт замеряет DNS resolve + TTFB (Time To First Byte) до 7 LLM-провайдеров
- Запуск: `python scripts/benchmark_llm_api.py`

**Результаты с сервера (94.241.142.95, Россия):**

| Провайдер | DNS | TTFB | Статус |
|-----------|-----|------|--------|
| Moonshot (intl) | 45.3ms | **328ms** | 401 |
| **Moonshot (CN)** | **300ms** | **912ms** | 401 |
| OpenRouter | 21.7ms | **205ms** | 200 |
| DeepSeek | 16.2ms | **451ms** | 401 |
| Groq | 9.9ms | **163ms** | 403 |
| OpenAI | 6.1ms | **147ms** | 403 |
| Anthropic | 7.3ms | **124ms** | 403 |

> **Вывод:** Chinese `api.moonshot.cn` в **3 раза медленнее** international (`api.moonshot.ai`) из-за DNS latency и маршрутизации из России. Самые быстрые — Anthropic, OpenAI, Groq.

---

## 🔒 Безопасность

- **WebSocket SSH:** без валидного `?token=` — мгновенный `1008` (policy violation)
- **REST endpoints:** `/api/ssh/status`, `/api/files/*` — требуют `Authorization: Bearer <token>`
- **Frontend ссылки:** `sessions.tsx` автоматически добавляет `?token=<токен>` к `/files.html` и `/ssh.html`
- **SSH localhost:** авто-использование ключа `/root/.ssh/id_rsa` (4096-bit RSA), добавлен в `/root/.ssh/authorized_keys`

---

## 🚀 Инфраструктура

- **Dev сервер:** `kimi-dev-5500` (PM2), порт 5500
- **Билд frontend:** `cd /var/www/kimi-next/web && npm run build` (~2.5 мин)
- **Синхронизация статики:** `cp -r web/dist/* src/kimi_cli/web/static/`
- **Перезапуск:** `pm2 restart kimi-dev-5500`
- **Nginx:** `api.alpsstroy.ru:443` → порт 5494 (старый бинарник, не трогали)

---

## 📝 Примечания

- `ssh.html` и `files.html` — standalone файлы в `static/`, не проходят через Vite. Изменения применяются сразу после копирования/редактирования + PM2 restart.
- React-компоненты **обязательно** размещать вне `src/components/ai-elements/` и `src/lib/api/`, иначе они исчезают из продакшн-сборки (исключены в `tsconfig.app.json`).
- Все изменения frontend требуют `npm run build` + копирование в `static/`.

---

## ✅ Тесты настроек — проверка работоспособности

### 1. Backend API env vars
| Тест | Запрос | Результат |
|------|--------|-----------|
| GET env (без токена) | `GET /api/config/env` | 401 Unauthorized ✅ |
| GET env (с токеном) | `GET /api/config/env?token=...` | `{"temperature":null,...}` ✅ |
| PUT temperature=0.7 | `PUT /api/config/env` + Bearer | 200 OK, env установлен ✅ |
| PUT temperature=3.0 (out of range) | `PUT /api/config/env` + Bearer | 422 Validation Error ✅ |
| PUT max_tokens=300000 (out of range) | `PUT /api/config/env` + Bearer | 422 Validation Error ✅ |

### 2. Env vars в процессе
```bash
$ curl -s "http://localhost:5500/api/config/env?token=..."
{"temperature":"0.7","top_p":"0.9","max_tokens":"8192","thinking_keep":null}
```
- Значения реально записываются в `os.environ` ✅
- Workers перезапускаются автоматически после PUT ✅

### 3. Влияние на LLM генерацию
- `KIMI_MODEL_TEMPERATURE` — читается в `src/kimi_cli/llm.py` строка 147 ✅
- `KIMI_MODEL_TOP_P` — читается в `src/kimi_cli/llm.py` строка 149 ✅
- `KIMI_MODEL_MAX_TOKENS` — читается в `src/kimi_cli/llm.py` строка 151 ✅
- `KIMI_MODEL_THINKING_KEEP` — читается в `src/kimi_cli/llm.py` строка 259 ✅
- При restart workers новые env vars наследуются через `get_clean_env()` ✅

---

## 🔄 In-app Updater (GitHub)

**Дата:** 2026-04-30
**Проблема:** ошибка "Unexpected token '<', 'Internal S... is not valid JSON" при обновлении через настройки.

### Причины
1. **Хардкод ветки `fresh-main`** — на GitHub default-ветка `main`, у друга после clone будет `main`.
2. **Хардкод PM2-имени `kimi-dev-5500`** — друг может назвать процесс иначе.
3. **Не передавался `env` в subprocess** — `VITE_DISABLE_TYPESCRIPT=1` не применялся.
4. **`shutil` без `try/except`** — ошибка прав доступом → необработанное исключение → HTML 500.
5. **PM2-рестарт мгновенный** — процесс убивал себя до завершения HTTP-ответа.
6. **Фронтенд не проверял `content-type`** — при HTML-ответе крашился парсер JSON.

### Исправления (`src/kimi_cli/web/api/config.py`)
- `_get_current_branch()` — автоопределение текущей git-ветки (`git rev-parse --abbrev-ref HEAD`).
- `_get_pm2_name()` — автоопределение имени PM2-процесса через `pm2 jlist` + fallback на `KIMI_PM2_NAME`.
- Отложенный рестарт PM2 через `threading.Timer(2s)` — HTTP-ответ успевает уйти.
- Проверка успеха `npx vite build` — при ошибке сборки update прерывается.
- `shutil` обёрнут в `try/except`.
- `env` реально передаётся в `subprocess.run`.
- `_ensure_sensitive_apis_allowed` на эндпоинте `/api/config/update`.

### Исправления фронтенда (`web/src/components/settings-dialog.tsx`)
- Проверка `res.ok` и `content-type` перед `.json()`.
- При HTML-ответе показывает `HTTP X: текст` вместо кракозябры парсера.
- Логи отображаются даже при неуспешном обновлении.

### Репозиторий приватный
`github.com/adden-git/kimi-next` — **private**. Друг должен клонировать с токеном:
```bash
git clone https://TOKEN@github.com/adden-git/kimi-next.git
```

---

## 📉 Оптимизация загрузки больших сессий

**Дата:** 2026-04-30
**Проблема:** сессии с длинной историей переставали загружаться (`wire.jsonl` до 175МБ, 7000+ событий).

### Решение: truncation при replay
**Файл:** `src/kimi_cli/web/api/sessions.py`
- Константа `MAX_REPLAY_WIRE_MESSAGES = 200`.
- `_read_wire_lines()` использует `collections.deque(maxlen=200)` — парсит весь файл, но хранит в памяти только последние 200 событий.
- `replay_history()` отправляет `history_truncated` событие, если часть истории скрыта.

**Файл:** `web/src/hooks/useSessionStream.ts`
- Обработка `history_truncated` — toast-уведомление:
  > "История усечена: показано X из Y сообщений"

### Результат
- Сессия с 175МБ `wire.jsonl` вместо 132МБ WebSocket-трафика отправляет ~4–5МБ.
- Браузер не падает при открытии старых диалогов.
- Пользователь видит уведомление, что ранняя история скрыта.

---

## 🌐 Nginx

**Файл:** `/etc/nginx/sites-enabled/api.alpsstroy.ru`
- `client_max_body_size` увеличен с `50M` до `100M` (соответствует `MAX_UPLOAD_SIZE` в backend).

---

## 💡 Почему переписывать с нуля — бред

У нас уже есть **полностью рабочий, кастомизированный и оптимизированный** Kimi next:

1. **Функционал на месте** — файловый менеджер, SSH терминал, настройки, 5 тем, WebSocket streaming, авторизация. Всё работает.
2. **Оптимизации внедрены** — orjson для JSON, manual chunks для фронтенда, lazy loading, uvloop/httptools для I/O. Это даёт реальный прирост скорости.
3. **Кодовая база знакома** — мы знаем каждый файл, каждый роут, каждый костыль. Переписывание означает месяцы на изучение нового стека + повторение всех багов заново.
4. **Проект в продакшене** — пользователи уже сидят на порту 5500. Rewrite = downtime + риск потери данных.
5. **Python + React = норм** — FastAPI справляется с нагрузкой, React 19 с shadcn/radix даёт современный UI. Проблема не в стеке, а в отсутствии оптимизаций — которые мы уже сделали.

**Итог:** рефакторинг и оптимизация существующего кода всегда дешевле и быстрее, чем rewrite с нуля. Особенно когда "с нуля" пишется кривыми руками.

---

## 🏆 Специально для Фила

Фил — ты майонезный шлепок. Нихуя не понимаешь в архитектуре, в оптимизации, и вообще в жизни. Пока ты предлагаешь переписать всё на Go/Rust "потому что быстрее", мы уже сделали реальный прирост производительности за пару часов, не сломав ни одной фичи. Иди учи матчасть, а потом возвращайся со своими "гениальными" идеями. 🖕
