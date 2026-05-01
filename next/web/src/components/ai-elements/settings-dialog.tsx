import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Settings } from "lucide-react";
import { getAuthHeader } from "@/lib/auth";

const API_BASE = "/api/config";

type ExtendedConfig = {
  default_model: string;
  default_thinking: boolean;
  default_yolo: boolean;
  default_plan_mode: boolean;
  theme: string;
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

export function SettingsDialog() {
  const [open, setOpen] = useState(false);
  const [cfg, setCfg] = useState<ExtendedConfig | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/extended`, { headers: getAuthHeader() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCfg(data.config as ExtendedConfig);
    } catch (e: any) {
      toast.error("Failed to load config", { description: e.message });
    }
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const save = async () => {
    if (!cfg) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/extended`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ config: cfg, restart_running_sessions: true }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Config saved", {
          description: data.restarted_session_ids?.length
            ? `Restarted ${data.restarted_session_ids.length} sessions`
            : "Sessions will pick up changes on next turn",
        });
      } else {
        toast.error("Save failed", { description: data.error || "Unknown error" });
      }
    } catch (e: any) {
      toast.error("Save failed", { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  const updateField = <K extends keyof ExtendedConfig>(key: K, value: ExtendedConfig[K]) => {
    setCfg((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const updateLoop = (key: keyof ExtendedConfig["loop_control"], value: number) => {
    setCfg((prev) => (prev ? { ...prev, loop_control: { ...prev.loop_control, [key]: value } } : prev));
  };

  const updateProvider = (name: string, field: "base_url" | "api_key", value: string) => {
    setCfg((prev) => {
      if (!prev) return prev;
      const providers = { ...prev.providers };
      providers[name] = { ...providers[name], [field]: value };
      return { ...prev, providers };
    });
  };

  const updateService = (svc: "moonshot_search" | "moonshot_fetch", field: "base_url" | "api_key", value: string) => {
    setCfg((prev) => {
      if (!prev) return prev;
      const services = { ...prev.services };
      services[svc] = { ...(services[svc] || {}), [field]: value } as any;
      return { ...prev, services };
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Settings" title="Settings">
          <Settings className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 gap-0">
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Settings</h2>
          <Button size="sm" onClick={save} disabled={saving || !cfg}>
            {saving ? "Saving..." : "Save & Restart"}
          </Button>
        </div>
        <ScrollArea className="px-6 py-4 max-h-[calc(85vh-4rem)]">
          {cfg ? (
            <div className="space-y-6">
              {/* General */}
              <section>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">General</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label htmlFor="default_model" className="text-sm font-medium">Default Model</label>
                    <Input id="default_model" value={cfg.default_model} onChange={(e) => updateField("default_model", e.target.value)} className="w-64" />
                  </div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="default_thinking" className="text-sm font-medium">Thinking Mode</label>
                    <Switch id="default_thinking" checked={cfg.default_thinking} onCheckedChange={(v) => updateField("default_thinking", v)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="default_yolo" className="text-sm font-medium">YOLO Mode</label>
                    <Switch id="default_yolo" checked={cfg.default_yolo} onCheckedChange={(v) => updateField("default_yolo", v)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="default_plan_mode" className="text-sm font-medium">Plan Mode</label>
                    <Switch id="default_plan_mode" checked={cfg.default_plan_mode} onCheckedChange={(v) => updateField("default_plan_mode", v)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="theme" className="text-sm font-medium">Theme</label>
                    <Input id="theme" value={cfg.theme} onChange={(e) => updateField("theme", e.target.value)} className="w-32" />
                  </div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="show_thinking_stream" className="text-sm font-medium">Show Thinking Stream</label>
                    <Switch id="show_thinking_stream" checked={cfg.show_thinking_stream} onCheckedChange={(v) => updateField("show_thinking_stream", v)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="merge_all_available_skills" className="text-sm font-medium">Merge All Skills</label>
                    <Switch id="merge_all_available_skills" checked={cfg.merge_all_available_skills} onCheckedChange={(v) => updateField("merge_all_available_skills", v)} />
                  </div>
                </div>
              </section>

              <Separator />

              {/* Loop Control */}
              <section>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Loop Control</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="max_steps_per_turn" className="text-sm font-medium">Max Steps / Turn</label>
                    <Input id="max_steps_per_turn" type="number" value={cfg.loop_control.max_steps_per_turn} onChange={(e) => updateLoop("max_steps_per_turn", Number(e.target.value))} />
                  </div>
                  <div>
                    <label htmlFor="max_retries_per_step" className="text-sm font-medium">Max Retries / Step</label>
                    <Input id="max_retries_per_step" type="number" value={cfg.loop_control.max_retries_per_step} onChange={(e) => updateLoop("max_retries_per_step", Number(e.target.value))} />
                  </div>
                  <div>
                    <label htmlFor="reserved_context_size" className="text-sm font-medium">Reserved Context</label>
                    <Input id="reserved_context_size" type="number" value={cfg.loop_control.reserved_context_size} onChange={(e) => updateLoop("reserved_context_size", Number(e.target.value))} />
                  </div>
                  <div>
                    <label htmlFor="compaction_trigger_ratio" className="text-sm font-medium">Compaction Ratio</label>
                    <Input id="compaction_trigger_ratio" type="number" step={0.01} value={cfg.loop_control.compaction_trigger_ratio} onChange={(e) => updateLoop("compaction_trigger_ratio", Number(e.target.value))} />
                  </div>
                </div>
              </section>

              <Separator />

              {/* Providers */}
              <section>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Providers</h3>
                <div className="space-y-3">
                  {Object.entries(cfg.providers).map(([name, p]) => (
                    <div key={name} className="border rounded-md p-3 space-y-2">
                      <div className="font-medium text-sm">{name} <span className="text-muted-foreground">({p.type})</span></div>
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
                </div>
              </section>

              <Separator />

              {/* Services */}
              <section>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Services</h3>
                {(["moonshot_search", "moonshot_fetch"] as const).map((svc) => (
                  <div key={svc} className="border rounded-md p-3 space-y-2 mb-2">
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
                  <label htmlFor="tool_call_timeout_ms" className="text-sm font-medium">Tool Call Timeout (ms)</label>
                  <Input id="tool_call_timeout_ms" type="number" value={cfg.mcp.client.tool_call_timeout_ms} onChange={(e) => setCfg((prev) => prev ? { ...prev, mcp: { client: { tool_call_timeout_ms: Number(e.target.value) } } } : prev)} />
                </div>
              </section>

              <section>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Tools</h3>
                <div className="flex gap-2">
                  <a href="/files.html" target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm">📁 File Manager</Button>
                  </a>
                  <a href="/ssh.html" target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm">🖥 SSH Terminal</Button>
                  </a>
                </div>
              </section>
            </div>
          ) : (
            <div className="text-muted-foreground text-sm">Loading configuration...</div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
