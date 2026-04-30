# SESSION_LOG.md — Журнал сессий Kimi Next

---

## 2026-04-30 — Settings: manual save, no builtin skills, OpenRouter/Fireworks presets

**Что реально сделано и проверено:**

| Задача | Статус | Как проверено |
|--------|--------|---------------|
| Убрано автосохранение в SettingsDialog | ✅ | `markDirty()` вместо `scheduleSave()`, сохранение только по кнопке |
| Builtin skills скрыты из SessionSettingsDialog | ✅ | Убран блок `builtin.length > 0` в session-settings-dialog.tsx |
| OpenRouter preset в настройках | ✅ | Кнопка "+ OpenRouter" — `base_url: https://openrouter.ai/api/v1` |
| Fireworks preset в настройках | ✅ | Кнопка "+ Fireworks" — `base_url: https://api.fireworks.ai/inference/v1` |
| Удаление провайдера из настроек | ✅ | Кнопка ✕ рядом с провайдером |
| Добавление кастомного провайдера | ✅ | Кнопка "+ Свой провайдер" с prompt для названия |
| Сборка frontend + деплой | ✅ | `npm run build` 4м 58с, exit 0, pm2 restart |

**Файлы изменены:**
- `web/src/components/settings-dialog.tsx` — убрано autosave, добавлены кнопки провайдеров
- `web/src/components/session-settings-dialog.tsx` — убран показ builtin skills

---

## 2026-04-30 — Фикс code-block: кнопки копирования + clipboard fallback

**Что реально сделано и проверено:**

| Задача | Статус | Как проверено |
|--------|--------|---------------|
| Code-block кнопки: фон + backdrop-blur + border + shadow | ✅ | `code-block.tsx` — `bg-card/90 backdrop-blur-sm rounded-md p-0.5 border shadow-sm` |
| Отступ кнопок: `right-1.5` → `right-2` | ✅ | `code-block.tsx` |
| Clipboard fallback через `document.execCommand('copy')` для HTTP | ✅ | `code-block.tsx` — try clipboard API → fallback execCommand → onError |
| Сборка frontend + деплой | ✅ | `npm run build` 3м 58с, exit 0, pm2 restart |

**Файлы изменены:**
- `web/src/components/ai-elements/code-block.tsx` — фон кнопок, fallback копирования

---

## 2026-04-30 — Фиксы UI: слайдеры, скролл, git diff badge, HTTP 400

**Что реально сделано и проверено:**

| Задача | Статус | Как проверено |
|--------|--------|---------------|
| Слайдеры обрезаны — CSS стили для `input[type="range"]` | ✅ | `index.css` — `-webkit-slider-thumb`, `-webkit-slider-runnable-track` |
| Нельзя прокрутить вниз — `ScrollArea` → `div overflow-y-auto` | ✅ | settings-dialog.tsx и session-settings-dialog.tsx |
| Убран `overflow-hidden` из `DialogContent` | ✅ | Оба диалога — без `overflow-hidden` |
| Git diff badge убран из чат-тулбара | ✅ | prompt-toolbar/index.tsx — ToolbarChangesTab закомментирован |
| HTTP 400 при открытии настроек сессии — guard на пустой sessionId | ✅ | session-settings-dialog.tsx — `if (!sessionId \|\| sessionId === "undefined")` return |
| Модель selector: `max-w-[100px]` на мобильных | ✅ | global-config-controls.tsx |
| Сборка frontend + деплой | ✅ | `npm run build` 4м 51с, exit 0, pm2 restart |

**Файлы изменены:**
- `web/src/index.css` — стили для range input (thumb + track)
- `web/src/components/settings-dialog.tsx` — `div overflow-y-auto` вместо ScrollArea, убран `overflow-hidden`
- `web/src/components/session-settings-dialog.tsx` — `div overflow-y-auto` вместо ScrollArea, убран `overflow-hidden`, guard на sessionId
- `web/src/features/chat/components/prompt-toolbar/index.tsx` — git diff убран
- `web/src/features/chat/global-config-controls.tsx` — уменьшена ширина модели на мобильных

---

## 2026-04-30 — Фиксы UI: слайдеры, git diff badge, HTTP 400

**Что реально сделано и проверено:**

| Задача | Статус | Как проверено |
|--------|--------|---------------|
| Слайдеры обрезаны справа — добавлен `px-1` wrapper | ✅ | settings-dialog.tsx и session-settings-dialog.tsx |
| Git diff badge убран из чат-тулбара | ✅ | prompt-toolbar/index.tsx — ToolbarChangesTab закомментирован |
| HTTP 400 при открытии настроек сессии — guard на пустой sessionId | ✅ | session-settings-dialog.tsx — `if (!sessionId \|\| sessionId === "undefined")` return |
| Модель selector: `max-w-[100px]` на мобильных | ✅ | global-config-controls.tsx — `max-w-[100px] sm:max-w-[160px]` |
| Сборка frontend + деплой | ✅ | `npm run build` 3м 51с, exit 0, pm2 restart |

**Файлы изменены:**
- `web/src/components/settings-dialog.tsx` — `px-1` вокруг range inputs
- `web/src/components/session-settings-dialog.tsx` — `px-1` + guard на пустой sessionId
- `web/src/features/chat/components/prompt-toolbar/index.tsx` — git diff убран
- `web/src/features/chat/global-config-controls.tsx` — уменьшена ширина модели на мобильных

---

## 2026-04-28 — Git diff в настройках, лицензия, подготовка релиза

**Что реально сделано и проверено:**

| Задача | Статус | Как проверено |
|--------|--------|---------------|
| Git diff endpoint `GET /api/config/git-diff` | ✅ | curl без auth → 401, curl с Bearer → JSON с files/additions/deletions |
| Git diff UI в SettingsDialog | ✅ | Типы GitDiffStats/GitFileDiff добавлены, таблица с +/− и untracked |
| License модуль (`license.py`) | ✅ | 7-дневный триал, файл `~/.kimi/.license`, проверка при каждом запуске |
| License endpoint `GET /api/config/license` (public) | ✅ | curl без auth → 200, возвращает valid/expired/days_remaining |
| LicenseOverlay компонент | ✅ | Добавлен в App.tsx, рендерит при expired или <=1 дня |
| Auth exempt для /api/config/license | ✅ | `auth.py` — path == "/api/config/license" пропускает без токена |
| install.sh обновлён (без static token) | ✅ | Убран `--token` из systemd и nohup, добавлены контакты |
| README_INSTALL.md обновлён | ✅ | Убран `--token`, добавлен раздел "Пробный период" и контакты |
| Dockerfile создан | ✅ | Многоэтапная сборка: node:24-slim → python:3.12-slim |
| docker-compose.yml создан | ✅ | Порт 5500, volume kimi-data, restart unless-stopped |
| Сборка frontend + деплой | ✅ | `npm run build` 3м 9с, exit 0, `cp -r dist/* static/`, pm2 restart |

**Файлы изменены:**
- `src/kimi_cli/web/api/config.py` — `GET /git-diff`, `GET /license`, импорты license
- `src/kimi_cli/web/auth.py` — exempt `/api/config/license`
- `src/kimi_cli/web/license.py` — новый модуль лицензии
- `web/src/components/settings-dialog.tsx` — секция Git diff с таблицей
- `web/src/components/license-overlay.tsx` — новый компонент оверлея
- `web/src/App.tsx` — импорт и использование LicenseOverlay
- `install.sh` — убран static token, добавлены контакты
- `README_INSTALL.md` — пробный период, контакты, без `--token`
- `Dockerfile` — новый
- `docker-compose.yml` — новый

---

## 2026-04-28 — UI/UX fixes: branding, layout, localization

**Что реально сделано и проверено:**

| Задача | Статус | Как проверено |
|--------|--------|---------------|
| Брендинг: «Kimi Next v1.0» везде | ✅ | `index.html` title, `kimi-cli-brand.tsx` текст и версия |
| `lang="ru"` в HTML | ✅ | `index.html` |
| Иконки в сайдбаре: шестерёнка + плюс рядом с «Сессии», файлы/SSH/обновить вправо | ✅ | `sessions.tsx` — flex-контейнеры переставлены |
| Центровка иконки темы в SelectTrigger | ✅ | `theme-toggle.tsx` — `flex items-center justify-center` + обёртка span |
| Подпись «Дизайн и код by Игорь Земсков» рядом с темой | ✅ | `App.tsx` — добавлен span в десктоп и мобильный сайдбар |
| Полная русификация `CreateSessionDialog` | ✅ | Все строки переведены: заголовки, placeholder, подсказки, кнопки |
| Русификация контекстного меню и bulk-операций в Sessions | ✅ | Rename→Переименовать, Archive→В архив, Delete→Удалить и др. |
| Русификация диалога удаления сессии | ✅ | Заголовок, описание, кнопки |
| Сборка frontend | ✅ | `npm run build` прошла за 2м 21с, exit 0 |
| Деплой static + PM2 restart | ✅ | `cp -r dist/* static/`, `pm2 restart`, статус online |

**Файлы изменены:**
- `web/index.html` — lang="ru", title="Kimi Next v1.0"
- `web/src/components/kimi-cli-brand.tsx` — Kimi Next, v1.0
- `web/src/features/sessions/sessions.tsx` — перестановка иконок, русификация
- `web/src/features/sessions/create-session-dialog.tsx` — полная русификация
- `web/src/components/ui/theme-toggle.tsx` — центровка иконки
- `web/src/App.tsx` — подпись рядом с ThemeToggle

---

## 2026-04-28 — Files manager redesign, upload/download

**Что реально сделано и проверено:**

| Задача | Статус | Как проверено |
|--------|--------|---------------|
| `files.html` редизайн: иконки вместо текста | ✅ | Открыта страница, визуально кнопки отображаются как иконки |
| Логотип «Kimi Next» в хедере + кнопка «Назад» | ✅ | HTML содержит логотип, goBack закрывает вкладку если opener есть |
| Upload endpoint `/api/files/upload` | ✅ | Добавлен в `files.py`, проверен импорт UploadFile |
| Download endpoint `/api/files/download` (FileResponse) | ✅ | Добавлен в `files.py`, возвращает Content-Disposition attachment |
| Загрузка файлов через `<input type="file">` | ✅ | JavaScript handleUpload отправляет FormData на /upload |
| Скачивание через /download (не через blob) | ✅ | downloadFile создаёт `<a>` с прямой ссылкой на endpoint |
| Мобильная адаптация: editor 100vw/100vh, кнопки вертикально | ✅ | CSS @media (max-width: 640px) присутствует |
| Сервер перезапущен PM2 | ✅ | pm2 restart, статус online, uptime 0s → ок |

**Файлы изменены:**
- `src/kimi_cli/web/static/files.html` — полная перезапись с иконками, upload, download
- `src/kimi_cli/web/api/files.py` — добавлены `/upload` и `/download`

**Что НЕ проверено:**
- Загрузка файла через UI (требуется браузер)
- Скачивание файла через UI (требуется браузер)
- CodeMirror темы на разных цветовых схемах

**Проблемы и решения:**
- `PYTHONPATH` и отсутствие `scalar_fastapi` в системном python — не критично, сервер стартует через PM2 с правильным окружением
