import { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Settings, X, FileText, Sparkles, ExternalLink, Plus, AlertCircle, CheckCircle2,
  Shield, Puzzle, FileCode, Terminal, MessageSquare, Plug, BookOpen, Info
} from "lucide-react";
import { getAuthHeader } from "@/lib/auth";

type SessionModelParams = {
  temperature: number | null;
  top_p: number | null;
  max_tokens: number | null;
  thinking_keep: string | null;
};

type InstructionFile = {
  path: string;
  full_path: string;
  type: string;
  name: string;
  auto_loaded: boolean;
  is_builtin: boolean;
};

type InstructionsData = {
  work_dir: string;
  project_root: string;
  files: InstructionFile[];
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

type GuardianSettings = {
  enabled: boolean;
  model: string | null;
};

const DEFAULT_PARAMS = {
  temperature: 1.0,
  top_p: 0.95,
  max_tokens: 32768,
  thinking_keep: "",
} as const;

const PARAM_LIMITS = {
  temperature: { min: 0, max: 1, step: 0.1, label: "0.0–1.0" },
  top_p: { min: 0, max: 1, step: 0.01, label: "0.0–1.0" },
  max_tokens: { min: 1, max: 200_000, step: 1, label: "1–200 000" },
};

function clamp(num: number, min: number, max: number) {
  return Math.min(max, Math.max(min, num));
}

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
      <span className="text-xs text-muted-foreground">max {PARAM_LIMITS.max_tokens.label}</span>
    </div>
  );
}

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; description: string; autoNote?: string; manualNote?: string }> = {
  agents: {
    label: "AGENTS.md",
    icon: Shield,
    description: "Инструкции проекта. Kimi CLI ищет от .git до work_dir и мержит все найденные.",
    autoNote: "Авто-дискавери: от project_root до work_dir",
  },
  skill: {
    label: "Навыки (Skills)",
    icon: Puzzle,
    description: "Модульные инструкции в папках .kimi/skills/*/, .claude/skills/*/, .codex/skills/*/, .agents/skills/*/. Kimi CLI подхватывает автоматически.",
    autoNote: "Авто-дискавери: .kimi/skills/*/SKILL.md, .claude/skills/*/SKILL.md, .codex/skills/*/SKILL.md, .agents/skills/*/SKILL.md",
  },
  agent: {
    label: "Агенты (.md)",
    icon: FileCode,
    description: "Markdown-файлы в .kimi/agents/*.md — legacy, Kimi CLI их не видит.",
    manualNote: "Kimi CLI использует YAML-агенты (--agent-file), не .md",
  },
  prompt: {
    label: "Промпты",
    icon: MessageSquare,
    description: "Файлы в .kimi/prompts/*.md — остались от VS Code extension.",
    manualNote: "Kimi CLI не подхватывает .md промпты автоматически",
  },
  hook: {
    label: "Хуки",
    icon: Terminal,
    description: "Скрипты в .kimi/hooks/*.sh — для автоматизации approval'ов.",
    manualNote: "Настраиваются в ~/.kimi/config.toml → [[hooks]]",
  },
  plugin: {
    label: "Плагины",
    icon: Plug,
    description: "Папка .kimi/plugins/ — устанавливаются через 'kimi plugin install'.",
    manualNote: "Используйте 'kimi plugin install <name>' в терминале",
  },
  instruction: {
    label: "Прочие инструкции",
    icon: BookOpen,
    description: "Другие .md файлы в проекте.",
  },
};

function SessionParamsForm({
  params,
  onChange,
}: {
  params: SessionModelParams;
  onChange: <K extends keyof SessionModelParams>(key: K, value: SessionModelParams[K]) => void;
}) {
  const temperature = params.temperature == null ? DEFAULT_PARAMS.temperature : params.temperature;
  const topP = params.top_p == null ? DEFAULT_PARAMS.top_p : params.top_p;
  const maxTokens = params.max_tokens == null ? DEFAULT_PARAMS.max_tokens : params.max_tokens;
  const thinkingKeep = params.thinking_keep == null ? DEFAULT_PARAMS.thinking_keep : params.thinking_keep;

  return (
    <div className="space-y-5">
      <p className="text-xs text-muted-foreground">
        Эти параметры применяются <strong>только к текущей сессии</strong> и переопределяют глобальные настройки.
      </p>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Temperature (случайность)</label>
          <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
            {temperature.toFixed(1)}
          </span>
        </div>
        <div className="px-1">
          <input
            type="range"
            min={PARAM_LIMITS.temperature.min}
            max={PARAM_LIMITS.temperature.max}
            step={PARAM_LIMITS.temperature.step}
            value={temperature}
            onChange={(e) => onChange("temperature", clamp(Number(e.target.value), PARAM_LIMITS.temperature.min, PARAM_LIMITS.temperature.max))}
            className="w-full accent-primary h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>0.0 — точно</span>
          <span>0.5 — баланс</span>
          <span>1.0 — креатив</span>
        </div>
        <p className="text-[10px] text-muted-foreground">Максимум: {PARAM_LIMITS.temperature.label}</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Top P (nucleus sampling)</label>
          <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
            {topP.toFixed(2)}
          </span>
        </div>
        <div className="px-1">
          <input
            type="range"
            min={PARAM_LIMITS.top_p.min}
            max={PARAM_LIMITS.top_p.max}
            step={PARAM_LIMITS.top_p.step}
            value={topP}
            onChange={(e) => onChange("top_p", clamp(Number(e.target.value), PARAM_LIMITS.top_p.min, PARAM_LIMITS.top_p.max))}
            className="w-full accent-primary h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>0.0</span>
          <span>0.5</span>
          <span>1.0</span>
        </div>
        <p className="text-[10px] text-muted-foreground">Максимум: {PARAM_LIMITS.top_p.label}</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Max Tokens (макс. токенов ответа)</label>
        <MaxTokensInput
          value={maxTokens}
          onChange={(num) => onChange("max_tokens", num)}
        />
        <p className="text-[10px] text-muted-foreground">
          Для Kimi K2.5/K2.6: default 32 768, для K2 Thinking: 64 000
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Thinking Keep (Kimi K2.5)</label>
        <Input
          value={thinkingKeep}
          onChange={(e) => onChange("thinking_keep", e.target.value)}
          placeholder="none, low, high или пусто"
          className="w-full"
        />
        <p className="text-[10px] text-muted-foreground">
          При thinking=enabled — сохранять рассуждения в истории. Работает только для Kimi K2.x
        </p>
      </div>
    </div>
  );
}

function FileItem({ file, onClick }: { file: InstructionFile; onClick: (fp: string) => void }) {
  const config = TYPE_CONFIG[file.type] || TYPE_CONFIG.instruction;
  const Icon = config.icon;

  return (
    <button
      onClick={() => onClick(file.full_path)}
      className="w-full flex items-center gap-2 text-left px-2 py-1.5 rounded text-xs hover:bg-muted transition-colors group"
      title={file.full_path}
    >
      {file.auto_loaded ? (
        <CheckCircle2 className="size-3 text-green-500 shrink-0" />
      ) : (
        <AlertCircle className="size-3 text-amber-500 shrink-0" />
      )}
      <span className="truncate flex-1 font-mono">{file.path}</span>
      <ExternalLink className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
    </button>
  );
}

function TypeSection({
  type,
  files,
  onOpenFile,
  onCreate,
  creating,
  createType,
  setCreateType,
  newName,
  setNewName,
  sessionId,
}: {
  type: string;
  files: InstructionFile[];
  onOpenFile: (fp: string) => void;
  onCreate: (type: string, name?: string) => void;
  creating: string | null;
  createType: string | null;
  setCreateType: (t: string | null) => void;
  newName: string;
  setNewName: (s: string) => void;
  sessionId: string;
}) {
  const config = TYPE_CONFIG[type] || TYPE_CONFIG.instruction;
  const Icon = config.icon;
  const hasFiles = files.length > 0;

  return (
    <div className="rounded-md border p-2.5 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className="size-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">{config.label}</span>
          {files[0]?.auto_loaded && (
            <span className="text-[9px] bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300 px-1 py-0 rounded">
              авто
            </span>
          )}
          {!files[0]?.auto_loaded && hasFiles && (
            <span className="text-[9px] bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 px-1 py-0 rounded">
              вручную
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 gap-1 text-xs"
          onClick={() => setCreateType(createType === type ? null : type)}
          disabled={creating === type}
        >
          <Plus className="size-3" />
          {creating === type ? "..." : "Создать"}
        </Button>
      </div>

      <p className="text-[10px] text-muted-foreground leading-relaxed">
        {config.description}
        {config.autoNote && <span className="text-green-600 dark:text-green-400 block mt-0.5">{config.autoNote}</span>}
        {config.manualNote && <span className="text-amber-600 dark:text-amber-400 block mt-0.5">{config.manualNote}</span>}
      </p>

      {createType === type && (
        <div className="flex items-center gap-2">
          <Input
            placeholder={type === "skill" ? "название-навыка" : type === "agents" ? "AGENTS.md" : "имя-файла"}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="h-7 text-xs"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onCreate(type, newName || undefined);
              }
            }}
          />
          <Button
            size="sm"
            className="h-7 text-xs"
            onClick={() => onCreate(type, newName || undefined)}
            disabled={creating === type}
          >
            {creating === type ? "..." : "OK"}
          </Button>
        </div>
      )}

      {hasFiles ? (
        <div className="space-y-0.5 border-t pt-1.5 max-h-48 overflow-y-auto">
          {files.map((f) => (
            <FileItem key={f.full_path} file={f} onClick={onOpenFile} />
          ))}
        </div>
      ) : (
        <p className="text-[10px] text-muted-foreground italic">
          {type === "agents"
            ? "AGENTS.md не найден. Создайте его чтобы задать правила поведения AI."
            : `Нет файлов типа ${config.label}.`}
        </p>
      )}
    </div>
  );
}

function InstructionsSection({
  data,
  sessionId,
  onRefactor,
  refactoring,
  onCreated,
}: {
  data: InstructionsData | null;
  sessionId: string;
  onRefactor: () => void;
  refactoring: boolean;
  onCreated: () => void;
}) {
  const [creating, setCreating] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [createType, setCreateType] = useState<string | null>(null);

  if (!data) {
    return <div className="text-muted-foreground text-sm">Загрузка инструкций...</div>;
  }

  const files = data.files;
  const byType: Record<string, InstructionFile[]> = {};
  for (const f of files) {
    byType[f.type] = byType[f.type] || [];
    byType[f.type].push(f);
  }

  const openFile = (fullPath: string) => {
    window.open(`/files.html?path=${encodeURIComponent(fullPath)}&edit=1`, "_blank");
  };

  const handleCreate = async (type: string, name?: string) => {
    setCreating(type);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/create-instruction`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ type, name: name || undefined }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Файл создан", { description: result.path });
        setCreateType(null);
        setNewName("");
        onCreated();
      } else {
        toast.error("Ошибка создания", { description: result.error || "Неизвестная ошибка" });
      }
    } catch (e: any) {
      toast.error("Ошибка создания", { description: e.message });
    } finally {
      setCreating(null);
    }
  };

  const autoTypes = ["agents", "skill"];
  const manualTypes = ["agent", "prompt", "hook", "plugin", "instruction"];

  const hasAuto = autoTypes.some((t) => byType[t]?.length > 0);
  const hasManual = manualTypes.some((t) => byType[t]?.length > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <FileText className="size-4" /> Инструкции проекта
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefactor}
          disabled={refactoring || files.length === 0}
          className="gap-1"
        >
          <Sparkles className="size-3.5" />
          {refactoring ? "Анализ..." : "Рефакторинг"}
        </Button>
      </div>

      {/* Info banner */}
      <div className="rounded-md bg-muted/40 p-2.5 space-y-1.5">
        <div className="flex items-start gap-2">
          <Info className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="text-[10px] text-muted-foreground leading-relaxed space-y-1">
            <p>
              <strong className="text-foreground">Project root:</strong> {data.project_root}
            </p>
            <p>
              <strong className="text-foreground">Work dir:</strong> {data.work_dir}
            </p>
            <p>
              Kimi CLI ищет AGENTS.md от project_root (ближайший .git) до work_dir.
              Skills подхватываются из .kimi/skills/*/, .agents/skills/*/, .claude/skills/*/, .codex/skills/*/
            </p>
          </div>
        </div>
      </div>

      {/* Auto-loaded section */}
      <div className="space-y-2">
        <p className="text-[10px] font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider flex items-center gap-1">
          <CheckCircle2 className="size-3" />
          Автоматически подхватывается Kimi CLI
        </p>

        {autoTypes.map((type) => {
          const typeFiles = byType[type] || [];
          if (type === "skill") {
            const project = typeFiles.filter((f) => !f.is_builtin);
            return (
              <div key={type}>
                {project.length > 0 && (
                  <TypeSection
                    type={type}
                    files={project}
                    onOpenFile={openFile}
                    onCreate={handleCreate}
                    creating={creating}
                    createType={createType}
                    setCreateType={setCreateType}
                    newName={newName}
                    setNewName={setNewName}
                    sessionId={sessionId}
                  />
                )}
                {/* Builtin skills hidden — only project skills shown */}
              </div>
            );
          }
          return (
            <TypeSection
              key={type}
              type={type}
              files={typeFiles}
              onOpenFile={openFile}
              onCreate={handleCreate}
              creating={creating}
              createType={createType}
              setCreateType={setCreateType}
              newName={newName}
              setNewName={setNewName}
              sessionId={sessionId}
            />
          );
        })}
      </div>

      {/* Manual section */}
      {(hasManual || files.length === 0) && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
            <AlertCircle className="size-3" />
            Найдено в проекте (требует ручной настройки)
          </p>

          {manualTypes.map((type) => {
            const typeFiles = byType[type];
            if (!typeFiles || typeFiles.length === 0) return null;
            return (
              <TypeSection
                key={type}
                type={type}
                files={typeFiles}
                onOpenFile={openFile}
                onCreate={handleCreate}
                creating={creating}
                createType={createType}
                setCreateType={setCreateType}
                newName={newName}
                setNewName={setNewName}
                sessionId={sessionId}
              />
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {files.length === 0 && (
        <div className="rounded-lg border border-dashed p-4 text-center space-y-3">
          <p className="text-sm text-muted-foreground">Инструкции не найдены</p>
          <div className="text-[10px] text-muted-foreground text-left space-y-2">
            <p><strong>Что подхватывает Kimi CLI автоматически:</strong></p>
            <ul className="list-disc pl-4 space-y-1">
              <li><code>AGENTS.md</code> — правила поведения AI (ищется от .git до work_dir)</li>
              <li><code>.kimi/AGENTS.md</code> — дополнительные правила</li>
              <li><code>.kimi/skills/*/SKILL.md</code> — навыки проекта</li>
              <li><code>.agents/skills/*/SKILL.md</code> — альтернативный путь навыков</li>
              <li><code>.claude/skills/*/SKILL.md</code>, <code>.codex/skills/*/SKILL.md</code></li>
            </ul>
            <p><strong>Не подхватывается Kimi CLI:</strong></p>
            <ul className="list-disc pl-4 space-y-1">
              <li><code>.kimi/prompts/*.md</code> — legacy VS Code extension</li>
              <li><code>.kimi/agents/*.md</code> — Kimi CLI использует YAML-агенты</li>
              <li><code>.kimi/hooks/*.sh</code> — настраиваются в config.toml</li>
              <li><code>.kimi/plugins/</code> — устанавливаются через CLI команду</li>
            </ul>
          </div>
          <div className="flex gap-2 justify-center pt-1">
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleCreate("agents")} disabled={creating === "agents"}>
              <Plus className="size-3" /> AGENTS.md
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setCreateType("skill")}>
              <Plus className="size-3" /> Skill
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function RefactorResult({ result }: { result: any }) {
  if (!result) return null;

  return (
    <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
      <h4 className="text-sm font-medium flex items-center gap-2">
        <Sparkles className="size-4" /> Результат рефакторинга
      </h4>
      {result.summary && (
        <p className="text-xs text-muted-foreground">{result.summary}</p>
      )}
      {result.recommendations && result.recommendations.length > 0 && (
        <ul className="space-y-1.5">
          {result.recommendations.map((rec: any, i: number) => (
            <li key={i} className="text-xs flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>
                <strong>{rec.file || "Общее"}:</strong> {rec.message}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function SessionSettingsDialog({ sessionId }: { sessionId: string }) {
  const [open, setOpen] = useState(false);
  const [params, setParams] = useState<SessionModelParams>({ ...DEFAULT_PARAMS });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [instructions, setInstructions] = useState<InstructionsData | null>(null);
  const [instructionsLoading, setInstructionsLoading] = useState(false);
  const [refactoring, setRefactoring] = useState(false);
  const [refactorResult, setRefactorResult] = useState<any>(null);
  const [gitDiff, setGitDiff] = useState<GitDiffStats | null>(null);
  const [guardian, setGuardian] = useState<GuardianSettings>({ enabled: false, model: null });
  const [guardianLoading, setGuardianLoading] = useState(false);
  const [guardianDirty, setGuardianDirty] = useState(false);
  const [configModels, setConfigModels] = useState<Record<string, { provider: string; model: string; display_name?: string }>>({});
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const guardianSaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const paramsRef = useRef<SessionModelParams>({ ...DEFAULT_PARAMS });

  const loadParams = useCallback(async () => {
    if (!sessionId || sessionId === "undefined") {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/model-params`, {
        headers: getAuthHeader(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const loadedParams = {
        temperature: data.temperature !== null ? Number(data.temperature) : DEFAULT_PARAMS.temperature,
        top_p: data.top_p !== null ? Number(data.top_p) : DEFAULT_PARAMS.top_p,
        max_tokens: data.max_tokens !== null ? Number(data.max_tokens) : DEFAULT_PARAMS.max_tokens,
        thinking_keep: data.thinking_keep ?? DEFAULT_PARAMS.thinking_keep,
      };
      setParams(loadedParams);
      paramsRef.current = loadedParams;
      setDirty(false);
    } catch (e: any) {
      toast.error("Не удалось загрузить параметры сессии", { description: e.message });
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const loadInstructions = useCallback(async () => {
    if (!sessionId || sessionId === "undefined") {
      setInstructionsLoading(false);
      return;
    }
    setInstructionsLoading(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/instructions`, {
        headers: getAuthHeader(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setInstructions(data);
    } catch (e: any) {
      toast.error("Не удалось загрузить инструкции", { description: e.message });
    } finally {
      setInstructionsLoading(false);
    }
  }, [sessionId]);

  const loadGitDiff = useCallback(async () => {
    if (!sessionId || sessionId === "undefined") return;
    try {
      const res = await fetch(`/api/sessions/${sessionId}/git-diff`, {
        headers: getAuthHeader(),
      });
      if (res.ok) {
        setGitDiff(await res.json());
      }
    } catch (e: any) {
      // Silently fail — git diff is non-critical
    }
  }, [sessionId]);

  const loadGuardian = useCallback(async () => {
    if (!sessionId || sessionId === "undefined") return;
    setGuardianLoading(true);
    try {
      const [gRes, mRes] = await Promise.all([
        fetch(`/api/sessions/${sessionId}/guardian`, { headers: getAuthHeader() }),
        fetch("/api/config/models", { headers: getAuthHeader() }),
      ]);
      if (!gRes.ok) throw new Error(`HTTP ${gRes.status}`);
      const gData = await gRes.json();
      setGuardian({ enabled: !!gData.enabled, model: gData.model || null });
      setGuardianDirty(false);
      if (mRes.ok) {
        const mData = await mRes.json();
        setConfigModels(mData.models || {});
      }
    } catch (e: any) {
      toast.error("Не удалось загрузить настройки Guardian AI", { description: e.message });
    } finally {
      setGuardianLoading(false);
    }
  }, [sessionId]);

  const saveGuardian = useCallback(async (settings: GuardianSettings) => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/guardian`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ enabled: settings.enabled, model: settings.model }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Guardian AI сохранён", {
          description: settings.enabled ? "Двойная проверка включена" : "Двойная проверка отключена",
        });
        setGuardianDirty(false);
      } else {
        toast.error("Ошибка сохранения Guardian AI", { description: data.error || "Неизвестная ошибка" });
      }
    } catch (e: any) {
      toast.error("Ошибка сохранения Guardian AI", { description: e.message });
    }
  }, [sessionId]);

  useEffect(() => {
    if (open) {
      loadParams();
      loadInstructions();
      loadGitDiff();
      loadGuardian();
      setRefactorResult(null);
    }
  }, [open, loadParams, loadInstructions, loadGitDiff, loadGuardian]);

  const doSave = useCallback(async (current: SessionModelParams) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/model-params`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({
          temperature: current.temperature,
          top_p: current.top_p,
          max_tokens: current.max_tokens,
          thinking_keep: current.thinking_keep ?? undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Параметры сессии сохранены", {
          description: "Перезапустите сессию для применения",
        });
        setDirty(false);
      } else {
        toast.error("Ошибка сохранения", { description: data.error || "Неизвестная ошибка" });
      }
    } catch (e: any) {
      toast.error("Ошибка сохранения", { description: e.message });
    } finally {
      setSaving(false);
    }
  }, [sessionId]);

  const scheduleSave = useCallback(() => {
    setDirty(true);
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      // Read latest params from ref to avoid stale closure
      doSave(paramsRef.current);
    }, 1200);
  }, [doSave]);

  useEffect(() => {
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      if (guardianSaveTimeout.current) clearTimeout(guardianSaveTimeout.current);
    };
  }, []);

  const updateParam = <K extends keyof SessionModelParams>(key: K, value: SessionModelParams[K]) => {
    setParams((prev) => {
      const next = { ...prev, [key]: value };
      paramsRef.current = next;
      return next;
    });
    scheduleSave();
  };

  const handleRefactor = useCallback(async () => {
    setRefactoring(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/refactor-instructions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRefactorResult(data);
      toast.success("Рефакторинг завершён", { description: data.summary || "Анализ выполнен" });
    } catch (e: any) {
      toast.error("Ошибка рефакторинга", { description: e.message });
    } finally {
      setRefactoring(false);
    }
  }, [sessionId]);

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) {
        // Force save immediately when closing dialog with pending changes
        if (dirty && saveTimeout.current) {
          clearTimeout(saveTimeout.current);
          saveTimeout.current = null;
          doSave(paramsRef.current);
        }
        if (guardianDirty && guardianSaveTimeout.current) {
          clearTimeout(guardianSaveTimeout.current);
          guardianSaveTimeout.current = null;
          saveGuardian(guardian);
        }
      }
      setOpen(newOpen);
    }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Параметры сессии" title="Параметры сессии">
          <Settings className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85dvh] p-0 gap-0 flex flex-col" showCloseButton={false}>
        <DialogTitle className="sr-only">Параметры сессии</DialogTitle>
        <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30 shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">⚙️ Параметры сессии</h2>
            {dirty && (
              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                {saving ? "сохранение..." : "изменено"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => doSave(params)} disabled={saving || loading}>
              {saving ? "Сохранение..." : "Сохранить"}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Закрыть">
              <X className="size-4" />
            </Button>
          </div>
        </div>

        <div className="px-6 py-4 flex-1 min-h-0 overflow-y-auto">
          <div className="space-y-6 pb-8">
            {loading ? (
              <div className="text-muted-foreground text-sm">Загрузка параметров...</div>
            ) : (
              <SessionParamsForm params={params} onChange={updateParam} />
            )}

            <Separator />

            {/* Guardian AI */}
            <section>
              <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <span>🛡️</span> Guardian AI (двойная проверка)
              </h3>
              {guardianLoading ? (
                <div className="text-muted-foreground text-sm">Загрузка...</div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <label className="text-sm font-medium">Включить двойную проверку</label>
                      <p className="text-[10px] text-muted-foreground">
                        Перед выполнением каждого инструмента второй LLM проверяет безопасность вызова
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const next = { ...guardian, enabled: !guardian.enabled };
                        setGuardian(next);
                        setGuardianDirty(true);
                        saveGuardian(next);
                      }}
                      className={`
                        relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                        ${guardian.enabled ? "bg-primary" : "bg-muted"}
                      `}
                      aria-label={guardian.enabled ? "Отключить Guardian AI" : "Включить Guardian AI"}
                    >
                      <span
                        className={`
                          inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                          ${guardian.enabled ? "translate-x-6" : "translate-x-1"}
                        `}
                      />
                    </button>
                  </div>

                  {guardian.enabled && (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Модель для проверки</label>
                        {Object.keys(configModels).length > 0 ? (
                          <select
                            value={guardian.model || ""}
                            onChange={(e) => {
                              const val = e.target.value || null;
                              const next = { ...guardian, model: val };
                              setGuardian(next);
                              setGuardianDirty(true);
                              if (guardianSaveTimeout.current) clearTimeout(guardianSaveTimeout.current);
                              guardianSaveTimeout.current = setTimeout(() => saveGuardian(next), 800);
                            }}
                            className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          >
                            <option value="">— Основная модель сессии —</option>
                            {Object.entries(configModels).map(([name, m]) => (
                              <option key={name} value={name}>
                                {name} ({m.provider}) {m.display_name ? `— ${m.display_name}` : ""}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <Input
                            value={guardian.model || ""}
                            onChange={(e) => {
                              const next = { ...guardian, model: e.target.value || null };
                              setGuardian(next);
                              setGuardianDirty(true);
                              if (guardianSaveTimeout.current) clearTimeout(guardianSaveTimeout.current);
                              guardianSaveTimeout.current = setTimeout(() => saveGuardian(next), 1200);
                            }}
                            placeholder="provider/model или оставьте пустым для основной модели"
                            className="w-full"
                          />
                        )}
                        <p className="text-[10px] text-muted-foreground">
                          Оставьте пустым чтобы использовать ту же модель что и основной чат.
                          Настраивается в <a href="#" onClick={(e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent("open-settings")); }} className="text-primary underline">глобальных настройках</a>.
                        </p>
                      </div>

                      {/* Preset recommendations */}
                      <div className="rounded-md border bg-muted/20 p-3 space-y-2">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Рекомендуемые модели для Guardian</p>
                        <div className="space-y-1.5">
                          {[
                            { name: "Llama 3.2 3B (Fireworks)", price: "$0.10 / 1M токенов", desc: "Самая дешевая, ~$0.00007 за проверку", color: "text-green-600 dark:text-green-400" },
                            { name: "Llama 3.1 8B (Fireworks)", price: "$0.20 / 1M токенов", desc: "Лучший баланс, ~$0.00014 за проверку", color: "text-blue-600 dark:text-blue-400" },
                            { name: "Qwen2.5 7B (Fireworks)", price: "$0.20 / 1M токенов", desc: "Хорошая точность, ~$0.00014 за проверку", color: "text-amber-600 dark:text-amber-400" },
                            { name: "DeepSeek V3 (Fireworks)", price: "$0.56 / 1M токенов", desc: "Высокая точность, ~$0.00040 за проверку", color: "text-purple-600 dark:text-purple-400" },
                          ].map((preset) => (
                            <div key={preset.name} className="flex items-center justify-between text-xs">
                              <div>
                                <span className="font-medium">{preset.name}</span>
                                <span className={`ml-1.5 ${preset.color}`}>{preset.price}</span>
                              </div>
                              <span className="text-[10px] text-muted-foreground">{preset.desc}</span>
                            </div>
                          ))}
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Добавьте Fireworks в <a href="#" onClick={(e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent("open-settings")); }} className="text-primary underline">глобальных настройках</a> (кнопка + Fireworks), затем выберите модель из списка выше.
                        </p>
                      </div>
                    </div>
                  )}

                  {guardianDirty && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400">
                      сохранение...
                    </span>
                  )}
                </div>
              )}
            </section>

            <Separator />

            <InstructionsSection
              data={instructionsLoading ? null : instructions}
              sessionId={sessionId}
              onRefactor={handleRefactor}
              refactoring={refactoring}
              onCreated={loadInstructions}
            />

            {refactorResult && <RefactorResult result={refactorResult} />}

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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SessionSettingsDialog;
