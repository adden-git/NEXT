import { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Settings, X, Cpu, RefreshCw, ArrowUp } from "@/components/nexus-icons";
import { getAuthHeader } from "@/lib/auth";

const API_BASE = "/api/config";

type ExtendedConfig = {
  default_model: string;
  default_thinking: boolean;
  default_yolo: boolean;
  default_plan_mode: boolean;
  theme: string;
  image_output_dir: string;
  show_thinking_stream: boolean;
  merge_all_available_skills: boolean;
  loop_control: {
    max_steps_per_turn: number;
    max_retries_per_step: number;
    max_ralph_iterations: number;
    reserved_context_size: number;
    compaction_trigger_ratio: number;
  };
  providers: Record<string, {
    type: string;
    base_url: string;
    api_key: string;
    env?: Record<string, string> | null;
    custom_headers?: Record<string, string> | null;
  }>;
  services: {
    moonshot_search?: { base_url: string; api_key: string } | null;
    moonshot_fetch?: { base_url: string; api_key: string } | null;
  };
  mcp: {
    client: {
      tool_call_timeout_ms: number;
    };
  };
  hooks: Array<{
    event: string;
    command: string;
    matcher?: string;
    timeout?: number;
  }>;
  models: Record<string, {
    provider: string;
    model: string;
    max_context_size: number;
    capabilities: string[];
    display_name: string;
  }>;
};

type ModelEnvVars = {
  temperature: number;
  top_p: number;
  max_tokens: number;
  thinking_keep: string;
};

function MaxTokensInput({ value, onChange }: { value: number; onChange: (num: number) => void }) {
  const [str, setStr] = useState(String(value));

  useEffect(() => {
    setStr(String(value));
  }, [value]);

  return (
    <div className="flex items-center gap-3">
      <Input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={str}
        onChange={(e) => {
          const val = e.target.value;
          if (val === "" || /^[0-9]*$/.test(val)) {
            setStr(val);
            if (val !== "") {
              const num = Math.min(200000, Math.max(1, Number(val)));
              onChange(num);
            }
          }
        }}
        onBlur={() => {
          if (str === "" || isNaN(Number(str))) {
            const reset = Math.min(200000, Math.max(1, value));
            setStr(String(reset));
            onChange(reset);
          } else {
            const num = Math.min(200000, Math.max(1, Number(str)));
            setStr(String(num));
            onChange(num);
          }
        }}
        className="w-32"
      />
      <span className="text-xs text-muted-foreground">max 200 000</span>
    </div>
  );
}

const DEFAULT_ENV: ModelEnvVars = {
  temperature: 1.0,
  top_p: 0.95,
  max_tokens: 32768,
  thinking_keep: "",
};

export function SettingsDialog() {
  const [open, setOpen] = useState(false);
  const [cfg, setCfg] = useState<ExtendedConfig | null>(null);
  const [env, setEnv] = useState<ModelEnvVars>({ ...DEFAULT_ENV });
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [version, setVersion] = useState<string>("");
  const [latestVersion, setLatestVersion] = useState<string>("");
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateLogs, setUpdateLogs] = useState<string[] | null>(null);
  const touchStartY = useRef<number | null>(null);
  const cfgRef = useRef<ExtendedConfig | null>(null);
  const envRef = useRef<ModelEnvVars>({ ...DEFAULT_ENV });

  // Listen for global "open-settings" event from Session Settings links
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("open-settings", handler);
    return () => window.removeEventListener("open-settings", handler);
  }, []);

  const load = useCallback(async () => {
    try {
      const [cfgRes, envRes] = await Promise.all([
        fetch(`${API_BASE}/extended`, { headers: getAuthHeader() }),
        fetch(`${API_BASE}/env`, { headers: getAuthHeader() }),
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
      const loadedCfg = cfgData.config as ExtendedConfig;
      const loadedEnv = {
        temperature: envData.temperature !== null ? Number(envData.temperature) : DEFAULT_ENV.temperature,
        top_p: envData.top_p !== null ? Number(envData.top_p) : DEFAULT_ENV.top_p,
        max_tokens: envData.max_tokens !== null ? Number(envData.max_tokens) : DEFAULT_ENV.max_tokens,
        thinking_keep: envData.thinking_keep ?? "",
      };
      setCfg(loadedCfg);
      cfgRef.current = loadedCfg;
      setEnv(loadedEnv);
      envRef.current = loadedEnv;
      setDirty(false);
    } catch (e: any) {
      toast.error("Не удалось загрузить конфиг", { description: e.message });
    }
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const doSave = useCallback(async (currentCfg: ExtendedConfig | null, currentEnv: ModelEnvVars) => {
    if (!currentCfg) {
      // If cfg hasn't loaded but env is dirty, still try to save env
      if (!cfgRef.current) return;
      currentCfg = cfgRef.current;
    }
    setSaving(true);
    try {
      const [cfgRes, envRes] = await Promise.all([
        fetch(`${API_BASE}/extended`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...getAuthHeader() },
          body: JSON.stringify({ config: currentCfg, restart_running_sessions: false }),
        }),
        fetch(`${API_BASE}/env`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...getAuthHeader() },
          body: JSON.stringify({
            temperature: currentEnv.temperature,
            top_p: currentEnv.top_p,
            max_tokens: currentEnv.max_tokens,
            thinking_keep: currentEnv.thinking_keep || undefined,
          }),
        }),
      ]);
      const cfgData = await cfgRes.json();
      const envData = await envRes.json();
      if (cfgData.success && envData.success) {
        toast.success("Сохранено", { description: "Сессии перезапущены" });
        setDirty(false);
      } else {
        toast.error("Ошибка сохранения", {
          description: cfgData.error || envData.error || "Неизвестная ошибка",
        });
      }
    } catch (e: any) {
      toast.error("Ошибка сохранения", { description: e.message });
    } finally {
      setSaving(false);
    }
  }, []);

  const markDirty = useCallback(() => {
    setDirty(true);
  }, []);

  const updateField = <K extends keyof ExtendedConfig>(key: K, value: ExtendedConfig[K]) => {
    setCfg((prev) => {
      const next = prev ? { ...prev, [key]: value } : prev;
      cfgRef.current = next;
      return next;
    });
    markDirty();
  };

  const updateLoop = (key: keyof ExtendedConfig["loop_control"], value: number) => {
    setCfg((prev) => {
      const next = prev ? { ...prev, loop_control: { ...prev.loop_control, [key]: value } } : prev;
      cfgRef.current = next;
      return next;
    });
    markDirty();
  };

  const updateProvider = (name: string, field: "base_url" | "api_key", value: string) => {
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

  const updateService = (svc: "moonshot_search" | "moonshot_fetch", field: "base_url" | "api_key", value: string) => {
    setCfg((prev) => {
      if (!prev) return prev;
      const services = { ...prev.services };
      services[svc] = { ...(services[svc] || {}), [field]: value } as any;
      const next = { ...prev, services };
      cfgRef.current = next;
      return next;
    });
    markDirty();
  };

  const updateEnv = (patch: Partial<ModelEnvVars>) => {
    setEnv((prev) => {
      const next = { ...prev, ...patch };
      envRef.current = next;
      return next;
    });
    markDirty();
  };

  // Swipe-down only from header
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
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

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen && dirty) {
        // Force save immediately when closing dialog with pending changes
        doSave(cfgRef.current, envRef.current);
      }
      setOpen(newOpen);
    }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Настройки" title="Настройки">
          <Settings className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85dvh] p-0 gap-0 flex flex-col" showCloseButton={false}>
        <DialogTitle className="sr-only">Настройки</DialogTitle>
        {/* Header with swipe-down */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b bg-muted/30 select-none shrink-0"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold flex items-center gap-2"><Settings className="size-5" /> Настройки</h2>
            {dirty && (
              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                {saving ? "сохранение..." : "изменено"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => doSave(cfgRef.current, envRef.current)} disabled={saving || !cfgRef.current}>
              {saving ? "Сохранение..." : "Сохранить"}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Закрыть">
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Swipe indicator for mobile */}
        <div className="flex justify-center py-1 lg:hidden">
          <div className="w-12 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        <div className="px-6 py-4 flex-1 min-h-0 overflow-y-auto">
          {cfg ? (
            <div className="space-y-6 pb-8">
              {/* Generation Parameters */}
              <section>
                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <Cpu className="size-4" /> Параметры генерации
                </h3>
                <div className="space-y-4 bg-muted/20 rounded-lg p-4">
                  {/* Temperature */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Temperature (случайность)</label>
                      <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{env.temperature.toFixed(1)}</span>
                    </div>
                    <div className="px-1">
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.1}
                        value={env.temperature}
                        onChange={(e) => updateEnv({ temperature: Math.min(1, Math.max(0, Number(e.target.value))) })}
                        className="w-full accent-primary h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>0.0 — точно</span>
                      <span>0.5 — баланс</span>
                      <span>1.0 — креатив</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Диапазон: 0.0–1.0 · Максимум для NEXUS API</p>
                  </div>

                  {/* Top P */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Top P (nucleus sampling)</label>
                      <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{env.top_p.toFixed(2)}</span>
                    </div>
                    <div className="px-1">
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={env.top_p}
                        onChange={(e) => updateEnv({ top_p: Math.min(1, Math.max(0, Number(e.target.value))) })}
                        className="w-full accent-primary h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>0.0</span>
                      <span>0.5</span>
                      <span>1.0</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Диапазон: 0.0–1.0 · Максимум для NEXUS API</p>
                  </div>

                  {/* Max Tokens */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Max Tokens (макс. токенов ответа)</label>
                    <MaxTokensInput
                      value={env.max_tokens}
                      onChange={(num) => updateEnv({ max_tokens: num })}
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Для NEXUS K2.5/K2.6: default 32 768, для K2 Thinking: 64 000, абсолютный максимум: 200 000
                    </p>
                  </div>

                  {/* Thinking Keep */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Thinking Keep (NEXUS K2.5)</label>
                    <Input
                      value={env.thinking_keep}
                      onChange={(e) => updateEnv({ thinking_keep: e.target.value })}
                      placeholder="none, low, high или пусто"
                      className="w-full"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      При thinking=enabled — сохранять рассуждения в истории. Работает только для NEXUS K2.x
                    </p>
                  </div>
                </div>
              </section>

              <Separator />

              {/* General */}
              <section>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Основные</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label htmlFor="default_model" className="text-sm font-medium">Модель по умолчанию</label>
                    <select
                      id="default_model"
                      value={cfg.default_model}
                      onChange={(e) => updateField("default_model", e.target.value)}
                      className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-64"
                    >
                      <option value="">— Выберите модель —</option>
                      {Object.entries(cfg.models || {}).map(([key, model]) => (
                        <option key={key} value={key}>{(model as any).display_name || key}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="default_thinking" className="text-sm font-medium">Режим размышлений</label>
                    <Switch id="default_thinking" checked={cfg.default_thinking} onCheckedChange={(v) => updateField("default_thinking", v)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="default_yolo" className="text-sm font-medium">YOLO режим</label>
                    <Switch id="default_yolo" checked={cfg.default_yolo} onCheckedChange={(v) => updateField("default_yolo", v)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="default_plan_mode" className="text-sm font-medium">Plan mode по умолчанию</label>
                    <Switch id="default_plan_mode" checked={cfg.default_plan_mode} onCheckedChange={(v) => updateField("default_plan_mode", v)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="show_thinking_stream" className="text-sm font-medium">Показывать поток размышлений</label>
                    <Switch id="show_thinking_stream" checked={cfg.show_thinking_stream} onCheckedChange={(v) => updateField("show_thinking_stream", v)} />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="image_output_dir" className="text-sm font-medium">Папка для сохранения изображений</label>
                    <Input
                      id="image_output_dir"
                      value={cfg.image_output_dir || ""}
                      onChange={(e) => updateField("image_output_dir", e.target.value)}
                      placeholder="Оставьте пустым — сохранять в папку сессии"
                    />
                    <p className="text-xs text-muted-foreground">
                      Путь к директории где будут сохраняться сгенерированные изображения.
                      Если пусто — изображения сохраняются внутри каждой сессии.
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="merge_all_available_skills" className="text-sm font-medium">Объединять все навыки</label>
                    <Switch id="merge_all_available_skills" checked={cfg.merge_all_available_skills} onCheckedChange={(v) => updateField("merge_all_available_skills", v)} />
                  </div>
                </div>
              </section>

              <Separator />

              {/* Loop Control */}
              <section>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Управление циклом</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="max_steps_per_turn" className="text-sm font-medium">Макс. шагов / ход</label>
                    <Input id="max_steps_per_turn" type="number" min={1} value={cfg.loop_control.max_steps_per_turn} onChange={(e) => updateLoop("max_steps_per_turn", Math.max(1, Number(e.target.value)))} />
                    <p className="text-[10px] text-muted-foreground mt-1">min: 1</p>
                  </div>
                  <div>
                    <label htmlFor="max_retries_per_step" className="text-sm font-medium">Макс. попыток / шаг</label>
                    <Input id="max_retries_per_step" type="number" min={1} value={cfg.loop_control.max_retries_per_step} onChange={(e) => updateLoop("max_retries_per_step", Math.max(1, Number(e.target.value)))} />
                    <p className="text-[10px] text-muted-foreground mt-1">min: 1</p>
                  </div>
                  <div>
                    <label htmlFor="reserved_context_size" className="text-sm font-medium">Резерв контекста</label>
                    <Input id="reserved_context_size" type="number" min={1000} value={cfg.loop_control.reserved_context_size} onChange={(e) => updateLoop("reserved_context_size", Math.max(1000, Number(e.target.value)))} />
                    <p className="text-[10px] text-muted-foreground mt-1">min: 1000</p>
                  </div>
                  <div>
                    <label htmlFor="compaction_trigger_ratio" className="text-sm font-medium">Порог compaction</label>
                    <Input id="compaction_trigger_ratio" type="number" step={0.01} min={0.5} max={0.99} value={cfg.loop_control.compaction_trigger_ratio} onChange={(e) => updateLoop("compaction_trigger_ratio", Math.min(0.99, Math.max(0.5, Number(e.target.value))))} />
                    <p className="text-[10px] text-muted-foreground mt-1">0.50–0.99</p>
                  </div>
                </div>
              </section>

              <Separator />

              {/* Providers */}
              <section>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Провайдеры</h3>
                <div className="space-y-3">
                  {Object.entries(cfg.providers).map(([name, p]) => (
                    <div key={name} className="border rounded-md p-3 space-y-2 bg-muted/10">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-sm">{name} <span className="text-muted-foreground">({p.type})</span></div>
                        <Button variant="ghost" size="icon-xs" onClick={() => {
                          setCfg((prev) => {
                            if (!prev) return prev;
                            const providers = { ...prev.providers };
                            delete providers[name];
                            const next = { ...prev, providers };
                            cfgRef.current = next;
                            return next;
                          });
                          markDirty();
                        }} aria-label="Удалить провайдер">
                          <X className="size-3 text-muted-foreground" />
                        </Button>
                      </div>
                      <div>
                        <label className="text-xs">Base URL</label>
                        <Input value={p.base_url} onChange={(e) => updateProvider(name, "base_url", e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs">API Key</label>
                        <Input type="password" value={p.api_key} onChange={(e) => updateProvider(name, "api_key", e.target.value)} />
                      </div>
                    </div>
                  ))}
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => {
                      const name = prompt("Название провайдера:", "openrouter");
                      if (!name || cfg.providers[name]) return;
                      setCfg((prev) => {
                        if (!prev) return prev;
                        const next = { ...prev, providers: { ...prev.providers, [name]: { type: "openai_legacy", base_url: "", api_key: "" } } };
                        cfgRef.current = next;
                        return next;
                      });
                      markDirty();
                    }}>+ Свой провайдер</Button>
                    <Button variant="outline" size="sm" onClick={() => {
                      if (cfg.providers["openrouter"]) { toast.error("OpenRouter уже добавлен"); return; }
                      setCfg((prev) => {
                        if (!prev) return prev;
                        const next = { ...prev, providers: { ...prev.providers, openrouter: { type: "openai_legacy", base_url: "https://openrouter.ai/api/v1", api_key: "" } } };
                        cfgRef.current = next;
                        return next;
                      });
                      markDirty();
                    }}>+ OpenRouter</Button>
                    <Button variant="outline" size="sm" onClick={() => {
                      setCfg((prev) => {
                        if (!prev) return prev;
                        const providerExists = !!prev.providers["fireworks"];
                        const nextProviders = providerExists ? prev.providers : { ...prev.providers, fireworks: { type: "openai_legacy", base_url: "https://api.fireworks.ai/inference/v1", api_key: "" } };
                        const nextModels = { ...prev.models };
                        const fireworksModels: Record<string, { provider: string; model: string; max_context_size: number; capabilities: string[]; display_name: string }> = {
                          "deepseek-v4-pro": { provider: "fireworks", model: "accounts/fireworks/models/deepseek-v4-pro", max_context_size: 131072, capabilities: ["thinking"], display_name: "DeepSeek V4 Pro" },
                          "glm-5": { provider: "fireworks", model: "accounts/fireworks/models/glm-5", max_context_size: 131072, capabilities: [], display_name: "GLM-5" },
                          "kimi-k2p5": { provider: "fireworks", model: "accounts/fireworks/models/kimi-k2p5", max_context_size: 131072, capabilities: ["thinking"], display_name: "Kimi K2.5" },
                          "flux-1-dev": { provider: "fireworks", model: "accounts/fireworks/models/flux-1-dev-fp8", max_context_size: 4096, capabilities: ["image_in"], display_name: "FLUX.1 Dev (Image)" },
                        };
                        let addedCount = 0;
                        for (const [k, v] of Object.entries(fireworksModels)) {
                          if (!nextModels[k]) {
                            nextModels[k] = v;
                            addedCount++;
                          }
                        }
                        if (!providerExists && addedCount === 0) {
                          toast.error("Fireworks уже добавлен");
                          return prev;
                        }
                        const next = { ...prev, providers: nextProviders, models: nextModels };
                        cfgRef.current = next;
                        if (addedCount > 0) {
                          toast.success(providerExists ? "Fireworks модели добавлены" : "Fireworks добавлен", { description: `Добавлено ${addedCount} моделей` });
                        } else {
                          toast.info("Все Fireworks модели уже есть в конфиге");
                        }
                        return next;
                      });
                      markDirty();
                    }}>+ Fireworks</Button>
                  </div>
                </div>
              </section>

              <Separator />

              {/* Services */}
              <section>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Сервисы</h3>
                {(["moonshot_search", "moonshot_fetch"] as const).map((svc) => (
                  <div key={svc} className="border rounded-md p-3 space-y-2 mb-2 bg-muted/10">
                    <div className="font-medium text-sm">{svc}</div>
                    <div>
                      <label className="text-xs">Base URL</label>
                      <Input value={cfg.services[svc]?.base_url || ""} onChange={(e) => updateService(svc, "base_url", e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs">API Key</label>
                      <Input type="password" value={cfg.services[svc]?.api_key || ""} onChange={(e) => updateService(svc, "api_key", e.target.value)} />
                    </div>
                  </div>
                ))}
              </section>

              <Separator />

              {/* MCP */}
              <section>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">MCP</h3>
                <div>
                  <label htmlFor="tool_call_timeout_ms" className="text-sm font-medium">Таймаут вызова инструмента (мс)</label>
                  <Input id="tool_call_timeout_ms" type="number" value={cfg.mcp.client.tool_call_timeout_ms} onChange={(e) => setCfg((prev) => {
                    if (!prev) return prev;
                    const next = { ...prev, mcp: { client: { tool_call_timeout_ms: Number(e.target.value) } } };
                    cfgRef.current = next;
                    return next;
                  })} />
                </div>
              </section>

              <Separator />

              {/* Version & Update */}
              <section>
                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <RefreshCw className="size-4" /> Версия и обновление
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Текущая версия</span>
                    <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{version || "—"}</span>
                  </div>
                  {latestVersion && latestVersion !== version && (
                    <div className="text-xs text-amber-500 font-medium">
                      <ArrowUp className="size-3 inline" /> Доступно обновление: {latestVersion}
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={checkingUpdate}
                    onClick={async () => {
                      setCheckingUpdate(true);
                      try {
                        const res = await fetch("https://api.github.com/repos/adden-git/NEXT/releases/latest");
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
                    }}
                  >
                    {checkingUpdate ? "Проверка..." : "Проверить обновления"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={updating}
                    onClick={async () => {
                      setUpdating(true);
                      setUpdateLogs(null);
                      try {
                        const res = await fetch(`${API_BASE}/update`, {
                          method: "POST",
                          headers: getAuthHeader(),
                        });
                        const contentType = res.headers.get("content-type") || "";
                        if (!res.ok) {
                          const text = contentType.includes("application/json") ? await res.text() : await res.text();
                          toast.error("Ошибка обновления", {
                            description: `HTTP ${res.status}: ${text.slice(0, 200)}`,
                          });
                          return;
                        }
                        if (!contentType.includes("application/json")) {
                          const text = await res.text();
                          toast.error("Ошибка обновления", {
                            description: `Сервер вернул не JSON (${contentType}): ${text.slice(0, 200)}`,
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
                      } catch (e: any) {
                        toast.error("Ошибка обновления", { description: e.message });
                      } finally {
                        setUpdating(false);
                      }
                    }}
                  >
                    {updating ? "Обновление..." : "Обновить приложение"}
                  </Button>
                  {updateLogs && (
                    <div className="max-h-48 overflow-y-auto border rounded-md bg-muted/10 p-2 text-[11px] font-mono space-y-1">
                      {updateLogs.map((line, i) => (
                        <div key={i} className="break-all">{line}</div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

            </div>
          ) : (
            <div className="text-muted-foreground text-sm">Загрузка конфигурации...</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SettingsDialog;
