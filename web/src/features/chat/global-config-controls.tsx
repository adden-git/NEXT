import { useCallback, useEffect, useMemo, useState, type ReactElement } from "react";
import { toast } from "sonner";
import { Check, Cpu, Paperclip, RefreshCcw } from "@/components/nexus-icons";
import { usePromptInputAttachments } from "@ai-elements";
import type { ConfigModel } from "@/lib/api/models";
import { ModelCapability } from "@/lib/api/models";
import { useGlobalConfig } from "@/hooks/useGlobalConfig";
import { useSessionModelParams } from "@/hooks/useSessionModelParams";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader } from "@/components/ai-elements/loader";
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorName,
  ModelSelectorTrigger,
} from "@/components/ai-elements/model-selector";
import { cn } from "@/lib/utils";

type ThinkingState = "enabled" | "disabled" | "forced";

function getThinkingState(model: ConfigModel | null): ThinkingState {
  const capabilities = model?.capabilities;
  if (!capabilities) {
    return "disabled";
  }
  if (capabilities.has(ModelCapability.AlwaysThinking)) {
    return "forced";
  }
  if (capabilities.has(ModelCapability.Thinking)) {
    return "enabled";
  }
  return "disabled";
}

export type GlobalConfigControlsProps = {
  className?: string;
  planMode?: boolean;
  onPlanModeChange?: (enabled: boolean) => void;
  sessionId?: string;
};

export function GlobalConfigControls({
  className,
  planMode = false,
  onPlanModeChange,
  sessionId,
}: GlobalConfigControlsProps): ReactElement {
  const { config, isLoading, isUpdating, error, refresh, update } =
    useGlobalConfig();

  const {
    params: sessionParams,
    isLoading: sessionParamsLoading,
    refresh: refreshSessionParams,
    updateModelAlias,
    updateParams: updateSessionParams,
  } = useSessionModelParams(sessionId);

  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [lastBusySkip, setLastBusySkip] = useState<string[] | null>(null);

  const effectiveModelName = useMemo(() => {
    if (sessionId && sessionParams?.modelAlias) {
      return sessionParams.modelAlias;
    }
    return config?.defaultModel ?? null;
  }, [sessionId, sessionParams, config]);

  const currentModel = useMemo(() => {
    if (!config || !effectiveModelName) {
      return null;
    }
    return config.models.find((m) => m.name === effectiveModelName) ?? null;
  }, [config, effectiveModelName]);

  const thinkingState = useMemo(
    () => getThinkingState(currentModel),
    [currentModel],
  );

  const thinkingChecked = sessionId
    ? (sessionParams?.thinking ?? config?.defaultThinking ?? false)
    : (config?.defaultThinking ?? false);
  const thinkingDisabled =
    isLoading || isUpdating || sessionParamsLoading || thinkingState !== "enabled";

  const handleSelectModel = useCallback(
    async (modelKey: string) => {
      setIsSelectorOpen(false);
      if (!config || modelKey === effectiveModelName) {
        return;
      }

      if (sessionId) {
        try {
          // 1. Persist current settings for the current model
          if (effectiveModelName) {
            await updateSessionParams({
              modelAlias: effectiveModelName,
              thinking: thinkingChecked,
            });
          }
          // 2. Switch to the new model
          await updateModelAlias(modelKey);
          // 3. Refresh to load the new model's remembered params
          await refreshSessionParams();
          toast.success("Session model updated", {
            description: `Model for this session changed to ${modelKey}. Parameters restored for this model.`,
          });
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Failed to update session model";
          toast.error("Failed to update session model", { description: message });
        }
        return;
      }

      try {
        const resp = await update({ defaultModel: modelKey });
        const restarted = resp.restartedSessionIds ?? [];
        const skippedBusy = resp.skippedBusySessionIds ?? [];

        if (restarted.length > 0) {
          toast.success("Global model updated", {
            description: `Restarted ${restarted.length} running session(s).`,
          });
        } else {
          toast.success("Global model updated");
        }

        if (skippedBusy.length > 0) {
          setLastBusySkip(skippedBusy);
          toast.message("Some sessions were skipped (busy)", {
            description: `Skipped ${skippedBusy.length} busy session(s). You can retry when they are idle, or force restart.`,
          });
        } else {
          setLastBusySkip(null);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to update global model";
        toast.error("Failed to update global model", { description: message });
      }
    },
    [
      config,
      effectiveModelName,
      sessionId,
      thinkingChecked,
      update,
      updateModelAlias,
      updateSessionParams,
      refreshSessionParams,
    ],
  );

  const handleThinkingToggle = useCallback(
    async (checked: boolean) => {
      if (!config) {
        return;
      }
      if (sessionId) {
        try {
          await updateSessionParams({ thinking: checked });
          toast.success("Session thinking updated");
        } catch (err) {
          const message =
            err instanceof Error
              ? err.message
              : "Failed to update session thinking";
          toast.error("Failed to update session thinking", {
            description: message,
          });
        }
        return;
      }
      try {
        const resp = await update({ defaultThinking: checked });
        const skippedBusy = resp.skippedBusySessionIds ?? [];

        if (skippedBusy.length > 0) {
          setLastBusySkip(skippedBusy);
          toast.message("Some sessions were skipped (busy)", {
            description: `Skipped ${skippedBusy.length} busy session(s). You can retry when they are idle, or force restart.`,
          });
        } else {
          setLastBusySkip(null);
        }
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to update global thinking";
        toast.error("Failed to update global thinking", {
          description: message,
        });
      }
    },
    [config, sessionId, update, updateSessionParams],
  );

  const handleForceRestartBusy = useCallback(async () => {
    if (!lastBusySkip || lastBusySkip.length === 0) {
      return;
    }
    try {
      const resp = await update({ forceRestartBusySessions: true });
      const restarted = resp.restartedSessionIds ?? [];
      const skippedBusy = resp.skippedBusySessionIds ?? [];

      if (skippedBusy.length === 0) {
        setLastBusySkip(null);
      } else {
        setLastBusySkip(skippedBusy);
      }

      toast.success("Restarted running sessions", {
        description:
          restarted.length > 0
            ? `Restarted ${restarted.length} session(s).`
            : "No running sessions to restart.",
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to restart busy sessions";
      toast.error("Failed to restart busy sessions", { description: message });
    }
  }, [lastBusySkip, update]);

  const thinkingTooltip = useMemo(() => {
    if (thinkingState === "forced") {
      return "Thinking is forced by the selected model.";
    }
    if (thinkingState === "disabled") {
      return "Thinking is not supported by the selected model.";
    }
    return null;
  }, [thinkingState]);

  const thinkingToggle = (
    <div className="flex h-9 items-center gap-2 rounded-md px-2">
      <span className="text-xs text-muted-foreground">T</span>
      <Switch
        aria-label="Toggle global thinking"
        checked={
          thinkingState === "forced"
            ? true
            : thinkingState === "disabled"
              ? false
              : thinkingChecked
        }
        disabled={thinkingDisabled}
        onCheckedChange={handleThinkingToggle}
      />
    </div>
  );

  const attachments = usePromptInputAttachments();

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Button
        variant="ghost"
        size="icon"
        className="size-9 border-0"
        aria-label="Attach files"
        type="button"
        onClick={() => attachments.openFileDialog()}
      >
        <Paperclip className="size-4" />
      </Button>

      <div className="mx-0 h-4 w-px bg-border/70" />

      <ModelSelector open={isSelectorOpen} onOpenChange={setIsSelectorOpen}>
        <ModelSelectorTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 max-w-[100px] sm:max-w-[160px] justify-start gap-2 border-0"
            aria-label="Change model"
            type="button"
            disabled={isLoading || isUpdating || sessionParamsLoading || !config}
          >
            <Cpu className="size-4 shrink-0" />
            <span className="truncate">
              {effectiveModelName ?? "Model"}
            </span>
            {(isLoading || isUpdating || sessionParamsLoading) && (
              <Loader className="ml-auto shrink-0" size={14} />
            )}
          </Button>
        </ModelSelectorTrigger>
        <ModelSelectorContent title={sessionId ? "Select session model" : "Select global model"}>
          <ModelSelectorInput placeholder="Search models..." />
          <ModelSelectorList>
            <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
            {(() => {
              const groups: Record<string, ConfigModel[]> = {};
              const groupOrder = ["code", "text", "image"];
              const groupLabels: Record<string, string> = {
                code: "💻 Code",
                text: "📝 Text & Analysis",
                image: "🎨 Image Generation",
              };
              for (const m of config?.models ?? []) {
                const cat = m.category ?? "other";
                if (!groups[cat]) groups[cat] = [];
                groups[cat].push(m);
              }
              const tierEmoji: Record<string, string> = {
                budget: "💰",
                standard: "💎",
                premium: "👑",
              };
              const tierClass: Record<string, string> = {
                budget: "text-green-600 bg-green-50 dark:bg-green-950",
                standard: "text-blue-600 bg-blue-50 dark:bg-blue-950",
                premium: "text-amber-600 bg-amber-50 dark:bg-amber-950",
              };
              return [
                ...groupOrder.filter((k) => groups[k]?.length),
                ...Object.keys(groups).filter((k) => !groupOrder.includes(k)),
              ].map((cat) => (
                <ModelSelectorGroup key={cat} heading={groupLabels[cat] ?? cat}>
                  {groups[cat].map((m) => {
                    const isSelected = m.name === effectiveModelName;
                    const label = `${m.name} (${m.provider})${m.pricing ? ` — ${m.pricing}` : ""}`;
                    return (
                      <Tooltip key={m.name}>
                        <TooltipTrigger asChild>
                          <ModelSelectorItem
                            value={`${m.name} ${m.model} ${m.provider}`}
                            onSelect={(_value) => handleSelectModel(m.name)}
                            className="flex items-center gap-2"
                          >
                            {isSelected ? (
                              <Check className="size-4 text-foreground" />
                            ) : (
                              <span className="size-4" />
                            )}
                            <ModelSelectorName title={label}>
                              {m.name}
                            </ModelSelectorName>
                            {m.pricingTier ? (
                              <span
                                className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${tierClass[m.pricingTier] ?? ""}`}
                                title={m.pricing ?? ""}
                              >
                                {tierEmoji[m.pricingTier] ?? "💎"} {m.pricingTier}
                              </span>
                            ) : null}
                            {m.pricing ? (
                              <span className="shrink-0 text-[10px] text-muted-foreground">
                                {m.pricing}
                              </span>
                            ) : null}
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {m.provider}
                            </span>
                          </ModelSelectorItem>
                        </TooltipTrigger>
                        {m.pricing ? (
                          <TooltipContent side="right" sideOffset={8}>
                            {m.pricing}
                          </TooltipContent>
                        ) : null}
                      </Tooltip>
                    );
                  })}
                </ModelSelectorGroup>
              ));
            })()}
          </ModelSelectorList>
        </ModelSelectorContent>
      </ModelSelector>

      <div className="mx-0 h-4 w-px bg-border/70" />
      
      {thinkingTooltip ? (
        <Tooltip>
          <TooltipTrigger asChild>{thinkingToggle}</TooltipTrigger>
          <TooltipContent sideOffset={8}>{thinkingTooltip}</TooltipContent>
        </Tooltip>
      ) : (
        thinkingToggle
      )}



      {(lastBusySkip && lastBusySkip.length > 0) || error ? (
        <div className="mx-1.5 h-4 w-px bg-border/70" />
      ) : null}

      {lastBusySkip && lastBusySkip.length > 0 ? (
        <Button
          variant="outline"
          size="icon"
          className="size-9"
          aria-label="Force restart busy sessions"
          title="Force restart busy sessions"
          type="button"
          onClick={handleForceRestartBusy}
          disabled={isUpdating}
        >
          <RefreshCcw className="size-4" />
        </Button>
      ) : null}

      {error ? (
        <Button
          variant="outline"
          size="icon"
          className="size-9"
          aria-label="Reload global config"
          title="Reload global config"
          type="button"
          onClick={() => {
            refresh();
          }}
        >
          <RefreshCcw className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}
