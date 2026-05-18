import { useCallback, useEffect, useState } from "react";
import { getApiBaseUrl } from "./utils";
import { getAuthHeader } from "../lib/auth";

export type SessionModelParams = {
  temperature: number | null;
  topP: number | null;
  maxTokens: number | null;
  thinkingKeep: string | null;
  thinking: boolean | null;
  modelAlias: string | null;
};

export type SessionModelParamsUpdate = {
  temperature?: number | null;
  topP?: number | null;
  maxTokens?: number | null;
  thinkingKeep?: string | null;
  thinking?: boolean | null;
  modelAlias?: string | null;
};

export function useSessionModelParams(sessionId: string | undefined) {
  const [params, setParams] = useState<SessionModelParams | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!sessionId) {
      setParams(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const basePath = getApiBaseUrl();
      const response = await fetch(
        `${basePath}/api/sessions/${sessionId}/model-params`,
        { headers: getAuthHeader() },
      );
      if (!response.ok) {
        throw new Error("Failed to load session model params");
      }
      const data = await response.json();
      setParams({
        temperature: data.temperature ?? null,
        topP: data.top_p ?? null,
        maxTokens: data.max_tokens ?? null,
        thinkingKeep: data.thinking_keep ?? null,
        thinking: data.thinking ?? null,
        modelAlias: data.model_alias ?? null,
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  const updateModelAlias = useCallback(
    async (modelAlias: string | null) => {
      if (!sessionId) {
        throw new Error("No session ID");
      }
      const basePath = getApiBaseUrl();
      const response = await fetch(
        `${basePath}/api/sessions/${sessionId}/model-params`,
        {
          method: "PUT",
          headers: {
            ...getAuthHeader(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ model_alias: modelAlias }),
        },
      );
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to update session model alias");
      }
      const data = await response.json();
      setParams((prev) =>
        prev
          ? { ...prev, modelAlias: data.model_alias ?? null }
          : {
              temperature: null,
              topP: null,
              maxTokens: null,
              thinkingKeep: null,
              thinking: null,
              modelAlias: data.model_alias ?? null,
            },
      );
      return data;
    },
    [sessionId],
  );

  const updateParams = useCallback(
    async (update: SessionModelParamsUpdate) => {
      if (!sessionId) {
        throw new Error("No session ID");
      }
      const basePath = getApiBaseUrl();
      const body: Record<string, unknown> = {};
      if ("temperature" in update) body.temperature = update.temperature;
      if ("topP" in update) body.top_p = update.topP;
      if ("maxTokens" in update) body.max_tokens = update.maxTokens;
      if ("thinkingKeep" in update) body.thinking_keep = update.thinkingKeep;
      if ("thinking" in update) body.thinking = update.thinking;
      if ("modelAlias" in update) body.model_alias = update.modelAlias;

      const response = await fetch(
        `${basePath}/api/sessions/${sessionId}/model-params`,
        {
          method: "PUT",
          headers: {
            ...getAuthHeader(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
      );
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to update session model params");
      }
      const data = await response.json();
      setParams({
        temperature: data.temperature ?? null,
        topP: data.top_p ?? null,
        maxTokens: data.max_tokens ?? null,
        thinkingKeep: data.thinking_keep ?? null,
        thinking: data.thinking ?? null,
        modelAlias: data.model_alias ?? null,
      });
      return data;
    },
    [sessionId],
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { params, isLoading, error, refresh, updateModelAlias, updateParams };
}
