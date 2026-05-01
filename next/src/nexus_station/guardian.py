"""Guardian AI — dual-check system for tool call safety.

A lightweight secondary LLM check that runs before tool execution via the
PreToolUse hook. If the guardian decides the tool call is unsafe, it blocks
execution with a reason.
"""

from __future__ import annotations

import json
from typing import TYPE_CHECKING, Any

from kosong.chat_provider import ChatProvider
from kosong.message import Message, TextPart
from kosong import generate as kosong_generate

from nexus_station import logger
from nexus_station.hooks.runner import HookResult

if TYPE_CHECKING:
    from nexus_station.session import Session
    from nexus_station.soul.agent import Runtime


_GUARDIAN_SYSTEM_PROMPT = """You are a security guardian AI. Your job is to review tool calls before they execute.

Analyze the proposed tool call and decide if it is safe to execute.
Consider:
- Does the tool attempt to delete, overwrite, or modify critical files unexpectedly?
- Does it execute arbitrary or suspicious shell commands?
- Does it expose secrets, credentials, or private data?
- Is the intent clearly aligned with the user's goals?

Respond with ONLY one word on the first line: ALLOW or BLOCK.
If you BLOCK, provide a brief one-sentence reason on the second line."""


class GuardianAI:
    """Guardian AI checker using a secondary LLM evaluation."""

    def __init__(self, chat_provider: ChatProvider) -> None:
        self._chat_provider = chat_provider

    async def check(self, tool_name: str, tool_input: dict[str, Any]) -> HookResult:
        """Run the guardian check on a proposed tool call.

        Returns:
            HookResult with action "allow" or "block".
        """
        try:
            user_content = (
                f"Tool: {tool_name}\n"
                f"Arguments: {json.dumps(tool_input, ensure_ascii=False, indent=2)}"
            )
            history = [Message(role="user", content=user_content)]

            result = await kosong_generate(
                self._chat_provider,
                _GUARDIAN_SYSTEM_PROMPT,
                [],
                history,
            )

            # Extract text from the response message
            text_parts: list[str] = []
            for part in result.message.content:
                if isinstance(part, TextPart) and part.text:
                    text_parts.append(part.text)

            response = "".join(text_parts).strip()
            if not response:
                # Fail-open: empty response means allow
                return HookResult(action="allow")

            first_line = response.splitlines()[0].strip().upper()
            if first_line.startswith("BLOCK"):
                reason = response.split("\n", 1)[1].strip() if "\n" in response else "Blocked by Guardian AI"
                logger.info("Guardian AI blocked tool {tool}: {reason}", tool=tool_name, reason=reason)
                return HookResult(action="block", reason=reason)

            return HookResult(action="allow")
        except Exception as e:
            # Fail-open on any error
            logger.warning("Guardian AI check failed for {tool}: {error}", tool=tool_name, error=e)
            return HookResult(action="allow")


def _get_guardian_chat_provider(runtime: Runtime, guardian_model: str | None) -> ChatProvider | None:
    """Resolve the chat provider to use for the guardian check.

    If guardian_model is specified and found in config, create a dedicated LLM
    for the guardian. Otherwise fall back to the session's primary LLM.
    """
    if runtime.llm is None:
        return None

    if not guardian_model:
        return runtime.llm.chat_provider

    # Try to create a separate LLM for the guardian model
    try:
        from nexus_station.llm import create_llm

        model_config = runtime.config.models.get(guardian_model)
        if model_config is None:
            logger.warning(
                "Guardian model {model} not found in config, falling back to primary LLM",
                model=guardian_model,
            )
            return runtime.llm.chat_provider

        provider_config = runtime.config.providers.get(model_config.provider)
        if provider_config is None:
            logger.warning(
                "Provider {provider} for guardian model not found, falling back to primary LLM",
                provider=model_config.provider,
            )
            return runtime.llm.chat_provider

        guardian_llm = create_llm(
            provider_config,
            model_config,
            oauth=runtime.oauth,
        )
        if guardian_llm is None:
            return runtime.llm.chat_provider
        return guardian_llm.chat_provider
    except Exception as e:
        logger.warning("Failed to create guardian LLM: {error}, falling back to primary", error=e)
        return runtime.llm.chat_provider


def load_guardian_for_session(session: Session, runtime: Runtime) -> GuardianAI | None:
    """Load the guardian AI for a session if enabled.

    Returns None if guardian is disabled or no LLM is available.
    """
    if not session.state.guardian_enabled:
        return None

    chat_provider = _get_guardian_chat_provider(runtime, session.state.guardian_model)
    if chat_provider is None:
        return None

    return GuardianAI(chat_provider)
