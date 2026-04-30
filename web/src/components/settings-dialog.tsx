import { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Settings, X } from "lucide-react";
import { getAuthHeader } from "@/lib/auth";

const API_BASE = "/api/config";

type ExtendedConfig = {
  default_model: string;
  default_thinking: boolean;
  default_yolo: boolean;
  default_plan_mode: boolean;
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
};

type ModelEnvVars = {
  temperature: number;
  top_p: number;
  max_tokens: number;
  thinking_keep: string;
};

type GitFileDiff = {
  path: string;
  additions: number;
  deletions: number;
  status: string;
};

type GitDiffStats = {
  is_git_repo: boolean;
  has_changes: boolean;
  total_additions: number;
  total_deletions: number;
  files: GitFileDiff[] | null;
  error: string | null;
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
  const [gitDiff, setGitDiff] = useState<GitDiffStats | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [version, setVersion] = useState<string>("");
  const [latestVersion, setLatestVersion] = useState<string>("");
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateLogs, setUpdateLogs] = useState<string[] | null>(null);
  const touchStartY = useRef<number | null>(null);

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
      // Load git diff in parallel
      const diffRes = await fetch(`${API_BASE}/git-diff`, { headers: getAuthHeader() });
      if (diffRes.ok) {
        setGitDiff(await diffRes.json());
      }
      const verRes = await fetch(`${API_BASE}/version`, { headers: getAuthHeader() });
      if (verRes.ok) {
        const verData = await verRes.json();
        setVersion(verData.version || "");
      }
      setCfg(cfgData.config as ExtendedConfig);
      setEnv({
        temperature: envData.temperature !== null ? Number(envData.temperature) : DEFAULT_ENV.temperature,
        top_p: envData.top_p !== null ? Number(envData.top_p) : DEFAULT_ENV.top_p,
        max_tokens: envData.max_tokens !== null ? Number(envData.max_tokens) : DEFAULT_ENV.max_tokens,
        thinking_keep: envData.thinking_keep || "",
      });
      setDirty(false);
    } catch (e: any) {
      toast.error("Не удалось загрузить конфиг", { description: e.message });
    }
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const doSave = useCallback(async (currentCfg: ExtendedConfig | null, currentEnv: ModelEnvVars) => {
    if (!currentCfg) return;
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
      return next;
    });
    markDirty();
  };

  const updateLoop = (key: keyof ExtendedConfig["loop_control"], value: number) => {
    setCfg((prev) => {
      const next = prev ? { ...prev, loop_control: { ...prev.loop_control, [key]: value } } : prev;
      return next;
    });
    markDirty();
  };

  const updateProvider = (name: string, field: "base_url" | "api_key", value: string) => {
    setCfg((prev) => {
      if (!prev) return prev;
      const providers = { ...prev.providers };
      providers[name] = { ...providers[name], [field]: value };
      return { ...prev, providers };
    });
    markDirty();
  };

  const updateService = (svc: "moonshot_search" | "moonshot_fetch", field: "base_url" | "api_key", value: string) => {
    setCfg((prev) => {
      if (!prev) return prev;
      const services = { ...prev.services };
      services[svc] = { ...(services[svc] || {}), [field]: value } as any;
      return { ...prev, services };
    });
    markDirty();
  };

  const updateEnv = (patch: Partial<ModelEnvVars>) => {
    setEnv((prev) => ({ ...prev, ...patch }));
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
    <Dialog open={open} onOpenChange={setOpen}>
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
            <h2 className="text-lg font-semibold">⚙️ Настройки</h2>
            {dirty && (
              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                {saving ? "сохранение..." : "изменено"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => doSave(cfg, env)} disabled={saving || !cfg}>
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
                  <span>🎛</span> Параметры генерации
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
                    <p className="text-[10px] text-muted-foreground">Диапазон: 0.0–1.0 · Максимум для Kimi API</p>
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
                    <p className="text-[10px] text-muted-foreground">Диапазон: 0.0–1.0 · Максимум для Kimi API</p>
                  </div>

                  {/* Max Tokens */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Max Tokens (макс. токенов ответа)</label>
                    <MaxTokensInput
                      value={env.max_tokens}
                      onChange={(num) => updateEnv({ max_tokens: num })}
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Для Kimi K2.5/K2.6: default 32 768, для K2 Thinking: 64 000, абсолютный максимум: 200 000
                    </p>
                  </div>

                  {/* Thinking Keep */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Thinking Keep (Kimi K2.5)</label>
                    <Input
                      value={env.thinking_keep}
                      onChange={(e) => updateEnv({ thinking_keep: e.target.value })}
                      placeholder="none, low, high или пусто"
                      className="w-full"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      При thinking=enabled — сохранять рассуждения в истории. Работает только для Kimi K2.x
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
                    <Input id="default_model" value={cfg.default_model} onChange={(e) => updateField("default_model", e.target.value)} className="w-64" />
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
                    <label htmlFor="show_thinking_stream" className="text-sm font-medium">Показывать поток размышлений</label>
                    <Switch id="show_thinking_stream" checked={cfg.show_thinking_stream} onCheckedChange={(v) => updateField("show_thinking_stream", v)} />
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
                            return { ...prev, providers };
                          });
                          markDirty();
                        }} aria-label="Удалить провайдер">
                          <span className="text-muted-foreground">✕</span>
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
                        return { ...prev, providers: { ...prev.providers, [name]: { type: "openai_legacy", base_url: "", api_key: "" } } };
                      });
                      markDirty();
                    }}>+ Свой провайдер</Button>
                    <Button variant="outline" size="sm" onClick={() => {
                      if (cfg.providers["openrouter"]) { toast.error("OpenRouter уже добавлен"); return; }
                      setCfg((prev) => {
                        if (!prev) return prev;
                        return { ...prev, providers: { ...prev.providers, openrouter: { type: "openai_legacy", base_url: "https://openrouter.ai/api/v1", api_key: "" } } };
                      });
                      markDirty();
                    }}>+ OpenRouter</Button>
                    <Button variant="outline" size="sm" onClick={() => {
                      if (cfg.providers["fireworks"]) { toast.error("Fireworks уже добавлен"); return; }
                      setCfg((prev) => {
                        if (!prev) return prev;
                        return { ...prev, providers: { ...prev.providers, fireworks: { type: "openai_legacy", base_url: "https://api.fireworks.ai/inference/v1", api_key: "" } } };
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
                  <Input id="tool_call_timeout_ms" type="number" value={cfg.mcp.client.tool_call_timeout_ms} onChange={(e) => setCfg((prev) => prev ? { ...prev, mcp: { client: { tool_call_timeout_ms: Number(e.target.value) } } } : prev)} />
                </div>
              </section>

              <Separator />

              {/* Git Diff */}
              <section>
                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <span>📊</span> Git diff
                </h3>
                {gitDiff === null ? (
                  <div className="text-muted-foreground text-sm">Загрузка...</div>
                ) : !gitDiff.is_git_repo ? (
                  <div className="text-muted-foreground text-sm">Директория не является git-репозиторием</div>
                ) : gitDiff.error ? (
                  <div className="text-red-500 text-sm">Ошибка: {gitDiff.error}</div>
                ) : !gitDiff.has_changes ? (
                  <div className="text-muted-foreground text-sm">Нет изменений — рабочая директория чистая</div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-green-600 dark:text-green-400 font-mono">+{gitDiff.total_additions}</span>
                      <span className="text-red-600 dark:text-red-400 font-mono">-{gitDiff.total_deletions}</span>
                      <span className="text-muted-foreground text-xs">{gitDiff.files?.length || 0} файлов</span>
                    </div>
                    <div className="max-h-48 overflow-y-auto border rounded-md bg-muted/10">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/40 sticky top-0">
                          <tr>
                            <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">Файл</th>
                            <th className="text-right px-3 py-1.5 font-medium text-green-600 dark:text-green-400">+</th>
                            <th className="text-right px-3 py-1.5 font-medium text-red-600 dark:text-red-400">−</th>
                          </tr>
                        </thead>
                        <tbody>
                          {gitDiff.files?.map((f) => (
                            <tr key={f.path} className="border-t">
                              <td className="px-3 py-1.5 truncate max-w-[300px]" title={f.path}>
                                <span className={
                                  f.status === "added" && f.additions === 0 && f.deletions === 0
                                    ? "text-yellow-600 dark:text-yellow-400"
                                    : ""
                                }>
                                  {f.path}
                                </span>
                                {f.status === "added" && f.additions === 0 && f.deletions === 0 && (
                                  <span className="text-muted-foreground ml-1">(untracked)</span>
                                )}
                              </td>
                              <td className="text-right px-3 py-1.5 font-mono text-green-600 dark:text-green-400">
                                {f.additions > 0 ? `+${f.additions}` : ""}
                              </td>
                              <td className="text-right px-3 py-1.5 font-mono text-red-600 dark:text-red-400">
                                {f.deletions > 0 ? `-${f.deletions}` : ""}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </section>

              <Separator />

              {/* Version & Update */}
              <section>
                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <span>🔄</span> Версия и обновление
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Текущая версия</span>
                    <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{version || "—"}</span>
                  </div>
                  {latestVersion && latestVersion !== version && (
                    <div className="text-xs text-amber-500 font-medium">
                      ⬆ Доступно обновление: {latestVersion}
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={checkingUpdate}
                    onClick={async () => {
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
