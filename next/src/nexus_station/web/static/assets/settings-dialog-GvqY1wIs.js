import { r as reactExports, j as jsxRuntimeExports, S as Settings, X } from "./vendor-ui-BxtH5Rrc.js";
import { q as getAuthHeader, t as toast, D as Dialog, r as DialogTrigger, B as Button, s as DialogContent, u as DialogTitle, I as Input, S as Separator, v as Switch } from "./bootstrap-CvuRc8up.js";
import "./vendor-chat-DwxWVGki.js";
import "./vendor-heavy-DEw9PDV1.js";
const API_BASE = "/api/config";
function MaxTokensInput({ value, onChange }) {
  const [str, setStr] = reactExports.useState(String(value));
  reactExports.useEffect(() => {
    setStr(String(value));
  }, [value]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      Input,
      {
        type: "text",
        inputMode: "numeric",
        pattern: "[0-9]*",
        value: str,
        onChange: (e) => {
          const val = e.target.value;
          if (val === "" || /^[0-9]*$/.test(val)) {
            setStr(val);
            if (val !== "") {
              const num = Math.min(2e5, Math.max(1, Number(val)));
              onChange(num);
            }
          }
        },
        onBlur: () => {
          if (str === "" || isNaN(Number(str))) {
            const reset = Math.min(2e5, Math.max(1, value));
            setStr(String(reset));
            onChange(reset);
          } else {
            const num = Math.min(2e5, Math.max(1, Number(str)));
            setStr(String(num));
            onChange(num);
          }
        },
        className: "w-32"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground", children: "max 200 000" })
  ] });
}
const DEFAULT_ENV = {
  temperature: 1,
  top_p: 0.95,
  max_tokens: 32768,
  thinking_keep: ""
};
function SettingsDialog() {
  const [open, setOpen] = reactExports.useState(false);
  const [cfg, setCfg] = reactExports.useState(null);
  const [env, setEnv] = reactExports.useState({ ...DEFAULT_ENV });
  const [saving, setSaving] = reactExports.useState(false);
  const [dirty, setDirty] = reactExports.useState(false);
  const [version, setVersion] = reactExports.useState("");
  const [latestVersion, setLatestVersion] = reactExports.useState("");
  const [checkingUpdate, setCheckingUpdate] = reactExports.useState(false);
  const [updating, setUpdating] = reactExports.useState(false);
  const [updateLogs, setUpdateLogs] = reactExports.useState(null);
  const touchStartY = reactExports.useRef(null);
  const cfgRef = reactExports.useRef(null);
  const envRef = reactExports.useRef({ ...DEFAULT_ENV });
  reactExports.useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("open-settings", handler);
    return () => window.removeEventListener("open-settings", handler);
  }, []);
  const load = reactExports.useCallback(async () => {
    try {
      const [cfgRes, envRes] = await Promise.all([
        fetch(`${API_BASE}/extended`, { headers: getAuthHeader() }),
        fetch(`${API_BASE}/env`, { headers: getAuthHeader() })
      ]);
      if (!cfgRes.ok) throw new Error(`Config HTTP ${cfgRes.status}`);
      if (!envRes.ok) throw new Error(`Env HTTP ${envRes.status}`);
      const cfgData = await cfgRes.json();
      const envData = await envRes.json();
      const verRes = await fetch(`${API_BASE}/version`, { headers: getAuthHeader() });
      if (verRes.ok) {
        const verData = await verRes.json();
        setVersion(verData.version || "");
      }
      const loadedCfg = cfgData.config;
      const loadedEnv = {
        temperature: envData.temperature !== null ? Number(envData.temperature) : DEFAULT_ENV.temperature,
        top_p: envData.top_p !== null ? Number(envData.top_p) : DEFAULT_ENV.top_p,
        max_tokens: envData.max_tokens !== null ? Number(envData.max_tokens) : DEFAULT_ENV.max_tokens,
        thinking_keep: envData.thinking_keep ?? ""
      };
      setCfg(loadedCfg);
      cfgRef.current = loadedCfg;
      setEnv(loadedEnv);
      envRef.current = loadedEnv;
      setDirty(false);
    } catch (e) {
      toast.error("Не удалось загрузить конфиг", { description: e.message });
    }
  }, []);
  reactExports.useEffect(() => {
    if (open) load();
  }, [open, load]);
  const doSave = reactExports.useCallback(async (currentCfg, currentEnv) => {
    if (!currentCfg) {
      if (!cfgRef.current) return;
      currentCfg = cfgRef.current;
    }
    setSaving(true);
    try {
      const [cfgRes, envRes] = await Promise.all([
        fetch(`${API_BASE}/extended`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...getAuthHeader() },
          body: JSON.stringify({ config: currentCfg, restart_running_sessions: false })
        }),
        fetch(`${API_BASE}/env`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...getAuthHeader() },
          body: JSON.stringify({
            temperature: currentEnv.temperature,
            top_p: currentEnv.top_p,
            max_tokens: currentEnv.max_tokens,
            thinking_keep: currentEnv.thinking_keep || void 0
          })
        })
      ]);
      const cfgData = await cfgRes.json();
      const envData = await envRes.json();
      if (cfgData.success && envData.success) {
        toast.success("Сохранено", { description: "Сессии перезапущены" });
        setDirty(false);
      } else {
        toast.error("Ошибка сохранения", {
          description: cfgData.error || envData.error || "Неизвестная ошибка"
        });
      }
    } catch (e) {
      toast.error("Ошибка сохранения", { description: e.message });
    } finally {
      setSaving(false);
    }
  }, []);
  const markDirty = reactExports.useCallback(() => {
    setDirty(true);
  }, []);
  const updateField = (key, value) => {
    setCfg((prev) => {
      const next = prev ? { ...prev, [key]: value } : prev;
      cfgRef.current = next;
      return next;
    });
    markDirty();
  };
  const updateLoop = (key, value) => {
    setCfg((prev) => {
      const next = prev ? { ...prev, loop_control: { ...prev.loop_control, [key]: value } } : prev;
      cfgRef.current = next;
      return next;
    });
    markDirty();
  };
  const updateProvider = (name, field, value) => {
    setCfg((prev) => {
      if (!prev) return prev;
      const providers = { ...prev.providers };
      providers[name] = { ...providers[name], [field]: value };
      const next = { ...prev, providers };
      cfgRef.current = next;
      return next;
    });
    markDirty();
  };
  const updateService = (svc, field, value) => {
    setCfg((prev) => {
      if (!prev) return prev;
      const services = { ...prev.services };
      services[svc] = { ...services[svc] || {}, [field]: value };
      const next = { ...prev, services };
      cfgRef.current = next;
      return next;
    });
    markDirty();
  };
  const updateEnv = (patch) => {
    setEnv((prev) => {
      const next = { ...prev, ...patch };
      envRef.current = next;
      return next;
    });
    markDirty();
  };
  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchMove = (e) => {
    if (touchStartY.current === null) return;
    const deltaY = e.touches[0].clientY - touchStartY.current;
    if (deltaY > 120) {
      setOpen(false);
      touchStartY.current = null;
    }
  };
  const handleTouchEnd = () => {
    touchStartY.current = null;
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open, onOpenChange: (newOpen) => {
    if (!newOpen && dirty) {
      doSave(cfgRef.current, envRef.current);
    }
    setOpen(newOpen);
  }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "icon", "aria-label": "Настройки", title: "Настройки", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Settings, { className: "size-4" }) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "max-w-2xl max-h-[85dvh] p-0 gap-0 flex flex-col", showCloseButton: false, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { className: "sr-only", children: "Настройки" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: "flex items-center justify-between px-6 py-4 border-b bg-muted/30 select-none shrink-0",
          onTouchStart: handleTouchStart,
          onTouchMove: handleTouchMove,
          onTouchEnd: handleTouchEnd,
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-lg font-semibold", children: "⚙️ Настройки" }),
              dirty && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full", children: saving ? "сохранение..." : "изменено" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "sm", onClick: () => doSave(cfgRef.current, envRef.current), disabled: saving || !cfgRef.current, children: saving ? "Сохранение..." : "Сохранить" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "icon", onClick: () => setOpen(false), "aria-label": "Закрыть", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "size-4" }) })
            ] })
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-center py-1 lg:hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-12 h-1 rounded-full bg-muted-foreground/30" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-6 py-4 flex-1 min-h-0 overflow-y-auto", children: cfg ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6 pb-8", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "🎛" }),
            " Параметры генерации"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4 bg-muted/20 rounded-lg p-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-sm font-medium", children: "Temperature (случайность)" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-mono bg-muted px-2 py-0.5 rounded", children: env.temperature.toFixed(1) })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "range",
                  min: 0,
                  max: 1,
                  step: 0.1,
                  value: env.temperature,
                  onChange: (e) => updateEnv({ temperature: Math.min(1, Math.max(0, Number(e.target.value))) }),
                  className: "w-full accent-primary h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between text-[10px] text-muted-foreground", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "0.0 — точно" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "0.5 — баланс" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "1.0 — креатив" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] text-muted-foreground", children: "Диапазон: 0.0–1.0 · Максимум для Kimi API" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-sm font-medium", children: "Top P (nucleus sampling)" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-mono bg-muted px-2 py-0.5 rounded", children: env.top_p.toFixed(2) })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "range",
                  min: 0,
                  max: 1,
                  step: 0.01,
                  value: env.top_p,
                  onChange: (e) => updateEnv({ top_p: Math.min(1, Math.max(0, Number(e.target.value))) }),
                  className: "w-full accent-primary h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between text-[10px] text-muted-foreground", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "0.0" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "0.5" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "1.0" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] text-muted-foreground", children: "Диапазон: 0.0–1.0 · Максимум для Kimi API" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-sm font-medium", children: "Max Tokens (макс. токенов ответа)" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                MaxTokensInput,
                {
                  value: env.max_tokens,
                  onChange: (num) => updateEnv({ max_tokens: num })
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] text-muted-foreground", children: "Для Kimi K2.5/K2.6: default 32 768, для K2 Thinking: 64 000, абсолютный максимум: 200 000" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-sm font-medium", children: "Thinking Keep (Kimi K2.5)" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Input,
                {
                  value: env.thinking_keep,
                  onChange: (e) => updateEnv({ thinking_keep: e.target.value }),
                  placeholder: "none, low, high или пусто",
                  className: "w-full"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] text-muted-foreground", children: "При thinking=enabled — сохранять рассуждения в истории. Работает только для Kimi K2.x" })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Separator, {}),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-medium text-muted-foreground mb-3", children: "Основные" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "default_model", className: "text-sm font-medium", children: "Модель по умолчанию" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { id: "default_model", value: cfg.default_model, onChange: (e) => updateField("default_model", e.target.value), className: "w-64" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "default_thinking", className: "text-sm font-medium", children: "Режим размышлений" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Switch, { id: "default_thinking", checked: cfg.default_thinking, onCheckedChange: (v) => updateField("default_thinking", v) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "default_yolo", className: "text-sm font-medium", children: "YOLO режим" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Switch, { id: "default_yolo", checked: cfg.default_yolo, onCheckedChange: (v) => updateField("default_yolo", v) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "default_plan_mode", className: "text-sm font-medium", children: "Plan mode по умолчанию" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Switch, { id: "default_plan_mode", checked: cfg.default_plan_mode, onCheckedChange: (v) => updateField("default_plan_mode", v) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "show_thinking_stream", className: "text-sm font-medium", children: "Показывать поток размышлений" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Switch, { id: "show_thinking_stream", checked: cfg.show_thinking_stream, onCheckedChange: (v) => updateField("show_thinking_stream", v) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "theme", className: "text-sm font-medium", children: "Тема терминала" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "select",
                {
                  id: "theme",
                  value: cfg.theme || "dark",
                  onChange: (e) => updateField("theme", e.target.value),
                  className: "h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "dark", children: "Тёмная" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "light", children: "Светлая" })
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "merge_all_available_skills", className: "text-sm font-medium", children: "Объединять все навыки" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Switch, { id: "merge_all_available_skills", checked: cfg.merge_all_available_skills, onCheckedChange: (v) => updateField("merge_all_available_skills", v) })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Separator, {}),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-medium text-muted-foreground mb-3", children: "Управление циклом" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "max_steps_per_turn", className: "text-sm font-medium", children: "Макс. шагов / ход" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { id: "max_steps_per_turn", type: "number", min: 1, value: cfg.loop_control.max_steps_per_turn, onChange: (e) => updateLoop("max_steps_per_turn", Math.max(1, Number(e.target.value))) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] text-muted-foreground mt-1", children: "min: 1" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "max_retries_per_step", className: "text-sm font-medium", children: "Макс. попыток / шаг" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { id: "max_retries_per_step", type: "number", min: 1, value: cfg.loop_control.max_retries_per_step, onChange: (e) => updateLoop("max_retries_per_step", Math.max(1, Number(e.target.value))) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] text-muted-foreground mt-1", children: "min: 1" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "reserved_context_size", className: "text-sm font-medium", children: "Резерв контекста" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { id: "reserved_context_size", type: "number", min: 1e3, value: cfg.loop_control.reserved_context_size, onChange: (e) => updateLoop("reserved_context_size", Math.max(1e3, Number(e.target.value))) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] text-muted-foreground mt-1", children: "min: 1000" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "compaction_trigger_ratio", className: "text-sm font-medium", children: "Порог compaction" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { id: "compaction_trigger_ratio", type: "number", step: 0.01, min: 0.5, max: 0.99, value: cfg.loop_control.compaction_trigger_ratio, onChange: (e) => updateLoop("compaction_trigger_ratio", Math.min(0.99, Math.max(0.5, Number(e.target.value)))) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] text-muted-foreground mt-1", children: "0.50–0.99" })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Separator, {}),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-medium text-muted-foreground mb-3", children: "Провайдеры" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
            Object.entries(cfg.providers).map(([name, p]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border rounded-md p-3 space-y-2 bg-muted/10", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "font-medium text-sm", children: [
                  name,
                  " ",
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-muted-foreground", children: [
                    "(",
                    p.type,
                    ")"
                  ] })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "icon-xs", onClick: () => {
                  setCfg((prev) => {
                    if (!prev) return prev;
                    const providers = { ...prev.providers };
                    delete providers[name];
                    const next = { ...prev, providers };
                    cfgRef.current = next;
                    return next;
                  });
                  markDirty();
                }, "aria-label": "Удалить провайдер", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "✕" }) })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs", children: "Base URL" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: p.base_url, onChange: (e) => updateProvider(name, "base_url", e.target.value) })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs", children: "API Key" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "password", value: p.api_key, onChange: (e) => updateProvider(name, "api_key", e.target.value) })
              ] })
            ] }, name)),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", size: "sm", onClick: () => {
                const name = prompt("Название провайдера:", "openrouter");
                if (!name || cfg.providers[name]) return;
                setCfg((prev) => {
                  if (!prev) return prev;
                  const next = { ...prev, providers: { ...prev.providers, [name]: { type: "openai_legacy", base_url: "", api_key: "" } } };
                  cfgRef.current = next;
                  return next;
                });
                markDirty();
              }, children: "+ Свой провайдер" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", size: "sm", onClick: () => {
                if (cfg.providers["openrouter"]) {
                  toast.error("OpenRouter уже добавлен");
                  return;
                }
                setCfg((prev) => {
                  if (!prev) return prev;
                  const next = { ...prev, providers: { ...prev.providers, openrouter: { type: "openai_legacy", base_url: "https://openrouter.ai/api/v1", api_key: "" } } };
                  cfgRef.current = next;
                  return next;
                });
                markDirty();
              }, children: "+ OpenRouter" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", size: "sm", onClick: () => {
                if (cfg.providers["fireworks"]) {
                  toast.error("Fireworks уже добавлен");
                  return;
                }
                setCfg((prev) => {
                  if (!prev) return prev;
                  const next = { ...prev, providers: { ...prev.providers, fireworks: { type: "openai_legacy", base_url: "https://api.fireworks.ai/inference/v1", api_key: "" } } };
                  cfgRef.current = next;
                  return next;
                });
                markDirty();
              }, children: "+ Fireworks" })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Separator, {}),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-medium text-muted-foreground mb-3", children: "Сервисы" }),
          ["moonshot_search", "moonshot_fetch"].map((svc) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border rounded-md p-3 space-y-2 mb-2 bg-muted/10", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-medium text-sm", children: svc }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs", children: "Base URL" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: cfg.services[svc]?.base_url || "", onChange: (e) => updateService(svc, "base_url", e.target.value) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs", children: "API Key" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "password", value: cfg.services[svc]?.api_key || "", onChange: (e) => updateService(svc, "api_key", e.target.value) })
            ] })
          ] }, svc))
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Separator, {}),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-medium text-muted-foreground mb-3", children: "MCP" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "tool_call_timeout_ms", className: "text-sm font-medium", children: "Таймаут вызова инструмента (мс)" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { id: "tool_call_timeout_ms", type: "number", value: cfg.mcp.client.tool_call_timeout_ms, onChange: (e) => setCfg((prev) => {
              if (!prev) return prev;
              const next = { ...prev, mcp: { client: { tool_call_timeout_ms: Number(e.target.value) } } };
              cfgRef.current = next;
              return next;
            }) })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Separator, {}),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "🔄" }),
            " Версия и обновление"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm", children: "Текущая версия" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-mono bg-muted px-2 py-0.5 rounded", children: version || "—" })
            ] }),
            latestVersion && latestVersion !== version && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-amber-500 font-medium", children: [
              "⬆ Доступно обновление: ",
              latestVersion
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                variant: "outline",
                size: "sm",
                disabled: checkingUpdate,
                onClick: async () => {
                  setCheckingUpdate(true);
                  try {
                    const res = await fetch("https://api.github.com/repos/adden-git/kimi-next/releases/latest");
                    if (res.ok) {
                      const data = await res.json();
                      const tag = (data.tag_name || "").replace(/^v/, "");
                      setLatestVersion(tag);
                      if (tag === version) {
                        toast.success("Уже последняя версия", { description: tag });
                      }
                    } else {
                      toast.error("Не удалось проверить обновления");
                    }
                  } catch {
                    toast.error("Ошибка сети при проверке обновлений");
                  } finally {
                    setCheckingUpdate(false);
                  }
                },
                children: checkingUpdate ? "Проверка..." : "Проверить обновления"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                variant: "outline",
                size: "sm",
                disabled: updating,
                onClick: async () => {
                  setUpdating(true);
                  setUpdateLogs(null);
                  try {
                    const res = await fetch(`${API_BASE}/update`, {
                      method: "POST",
                      headers: getAuthHeader()
                    });
                    const contentType = res.headers.get("content-type") || "";
                    if (!res.ok) {
                      const text = contentType.includes("application/json") ? await res.text() : await res.text();
                      toast.error("Ошибка обновления", {
                        description: `HTTP ${res.status}: ${text.slice(0, 200)}`
                      });
                      return;
                    }
                    if (!contentType.includes("application/json")) {
                      const text = await res.text();
                      toast.error("Ошибка обновления", {
                        description: `Сервер вернул не JSON (${contentType}): ${text.slice(0, 200)}`
                      });
                      return;
                    }
                    const data = await res.json();
                    if (data.success) {
                      setUpdateLogs(data.logs);
                      toast.success("Обновление выполнено", { description: "Сервер перезапущен" });
                    } else {
                      toast.error("Ошибка обновления", { description: data.error || "Неизвестная ошибка" });
                      setUpdateLogs(data.logs);
                    }
                  } catch (e) {
                    toast.error("Ошибка обновления", { description: e.message });
                  } finally {
                    setUpdating(false);
                  }
                },
                children: updating ? "Обновление..." : "Обновить приложение"
              }
            ),
            updateLogs && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "max-h-48 overflow-y-auto border rounded-md bg-muted/10 p-2 text-[11px] font-mono space-y-1", children: updateLogs.map((line, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "break-all", children: line }, i)) })
          ] })
        ] })
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-muted-foreground text-sm", children: "Загрузка конфигурации..." }) })
    ] })
  ] });
}
export {
  SettingsDialog,
  SettingsDialog as default
};
