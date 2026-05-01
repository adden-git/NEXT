"""
NEXUS Provider Engine — Universal LLM Router
Connects to any LLM provider: OpenAI, Anthropic, Google, Fireworks, Local
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, AsyncIterator

import httpx


@dataclass
class ModelMessage:
    role: str  # system, user, assistant
    content: str


@dataclass
class ModelResponse:
    content: str
    model: str
    usage: dict[str, int] | None = None
    finish_reason: str | None = None


@dataclass
class StreamChunk:
    content: str
    finish_reason: str | None = None


class BaseProvider(ABC):
    """Abstract base for all LLM providers"""

    name: str = "base"

    def __init__(self, api_key: str | None, base_url: str | None = None):
        self.api_key = api_key
        self.base_url = base_url

    @abstractmethod
    async def generate(
        self,
        messages: list[ModelMessage],
        model: str,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        top_p: float = 0.9,
    ) -> ModelResponse:
        """Generate a complete response"""
        pass

    @abstractmethod
    async def stream(
        self,
        messages: list[ModelMessage],
        model: str,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        top_p: float = 0.9,
    ) -> AsyncIterator[StreamChunk]:
        """Stream response chunks"""
        pass


class OpenAIProvider(BaseProvider):
    """OpenAI-compatible provider (OpenAI, Fireworks, Local)"""

    name = "openai"

    def __init__(self, api_key: str | None, base_url: str | None = None):
        super().__init__(api_key, base_url)
        self.base_url = base_url or "https://api.openai.com/v1"
        self.client = httpx.AsyncClient(
            base_url=self.base_url,
            headers={"Authorization": f"Bearer {api_key}"} if api_key else {},
            timeout=120.0,
        )

    async def generate(
        self, messages, model, temperature=0.7, max_tokens=4096, top_p=0.9
    ) -> ModelResponse:
        payload = {
            "model": model,
            "messages": [{"role": m.role, "content": m.content} for m in messages],
            "temperature": temperature,
            "max_tokens": max_tokens,
            "top_p": top_p,
        }
        r = await self.client.post("/chat/completions", json=payload)
        r.raise_for_status()
        data = r.json()
        choice = data["choices"][0]
        return ModelResponse(
            content=choice["message"]["content"],
            model=data.get("model", model),
            usage=data.get("usage"),
            finish_reason=choice.get("finish_reason"),
        )

    async def stream(
        self, messages, model, temperature=0.7, max_tokens=4096, top_p=0.9
    ) -> AsyncIterator[StreamChunk]:
        payload = {
            "model": model,
            "messages": [{"role": m.role, "content": m.content} for m in messages],
            "temperature": temperature,
            "max_tokens": max_tokens,
            "top_p": top_p,
            "stream": True,
        }
        async with self.client.stream("POST", "/chat/completions", json=payload) as response:
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data = line[6:]
                    if data == "[DONE]":
                        break
                    try:
                        import json
                        chunk = json.loads(data)
                        delta = chunk["choices"][0].get("delta", {})
                        if "content" in delta:
                            yield StreamChunk(content=delta["content"])
                    except Exception:
                        continue


class AnthropicProvider(BaseProvider):
    """Anthropic Claude provider"""

    name = "anthropic"

    def __init__(self, api_key: str | None, base_url: str | None = None):
        super().__init__(api_key, base_url)
        self.base_url = base_url or "https://api.anthropic.com/v1"
        self.client = httpx.AsyncClient(
            base_url=self.base_url,
            headers={
                "x-api-key": api_key or "",
                "anthropic-version": "2023-06-01",
            },
            timeout=120.0,
        )

    async def generate(
        self, messages, model, temperature=0.7, max_tokens=4096, top_p=0.9
    ) -> ModelResponse:
        system_msg = ""
        chat_msgs = []
        for m in messages:
            if m.role == "system":
                system_msg = m.content
            else:
                chat_msgs.append({"role": m.role, "content": m.content})

        payload = {
            "model": model,
            "messages": chat_msgs,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "top_p": top_p,
        }
        if system_msg:
            payload["system"] = system_msg

        r = await self.client.post("/messages", json=payload)
        r.raise_for_status()
        data = r.json()
        content = ""
        for block in data.get("content", []):
            if block.get("type") == "text":
                content += block.get("text", "")

        return ModelResponse(
            content=content,
            model=data.get("model", model),
            usage=data.get("usage"),
            finish_reason=data.get("stop_reason"),
        )

    async def stream(self, messages, model, temperature=0.7, max_tokens=4096, top_p=0.9):
        # Simplified — return full response as single chunk
        response = await self.generate(messages, model, temperature, max_tokens, top_p)
        yield StreamChunk(content=response.content, finish_reason=response.finish_reason)


class ProviderRouter:
    """Routes requests to the correct provider"""

    PROVIDERS = {
        "openai": OpenAIProvider,
        "anthropic": AnthropicProvider,
        "fireworks": OpenAIProvider,  # Fireworks is OpenAI-compatible
        "google": OpenAIProvider,     # Gemini via OpenAI compat
        "local": OpenAIProvider,      # Ollama via OpenAI compat
    }

    def __init__(self):
        self._instances: dict[str, BaseProvider] = {}

    def register(self, name: str, provider: BaseProvider) -> None:
        self._instances[name] = provider

    def get(self, name: str, api_key: str | None = None, base_url: str | None = None) -> BaseProvider:
        if name in self._instances:
            return self._instances[name]

        provider_class = self.PROVIDERS.get(name, OpenAIProvider)
        provider = provider_class(api_key=api_key, base_url=base_url)
        self._instances[name] = provider
        return provider

    async def generate(
        self,
        provider_name: str,
        messages: list[ModelMessage],
        model: str,
        **kwargs: Any,
    ) -> ModelResponse:
        provider = self.get(provider_name)
        return await provider.generate(messages, model, **kwargs)

    async def stream(
        self,
        provider_name: str,
        messages: list[ModelMessage],
        model: str,
        **kwargs: Any,
    ) -> AsyncIterator[StreamChunk]:
        provider = self.get(provider_name)
        async for chunk in provider.stream(messages, model, **kwargs):
            yield chunk


# Global router instance
router = ProviderRouter()
