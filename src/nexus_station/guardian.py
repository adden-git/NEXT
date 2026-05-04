"""Guardian AI — dual-check system for tool call safety.

A lightweight secondary LLM check that runs before tool execution via the
PreToolUse hook. Returns a risk assessment (low/medium/high/critical) that
the approval system uses to decide: auto-allow, ask user, or block.
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

Analyze the proposed tool call and assess its risk level.

Consider:
- Does the tool attempt to delete, overwrite, or modify critical files unexpectedly?
- Does it execute arbitrary or suspicious shell commands?
- Does it expose secrets, credentials, or private data?
- Is the intent clearly aligned with the user's goals?
- Does it touch files in the FORBIDDEN list (if any)?

Respond ONLY with a valid JSON object (no markdown, no explanations):

{
  "risk": "low" | "medium" | "high" | "critical",
  "reason": "brief one-sentence explanation",
  "forbidden_hit": false
}

Risk levels:
- low: clearly safe, routine operation — auto-allow
- medium: slightly unusual but likely safe — ask user
- high: potentially dangerous — ask user with warning
- critical: definitely dangerous or touches forbidden files — block immediately
"""


def _build_prompt(tool_name: str, tool_input: dict[str, Any], forbidden_files: list[str]) -> str:
    """Build the user prompt for the guardian check."""
    lines = [
        f"Tool: {tool_name}",
        f"Arguments: {json.dumps(tool_input, ensure_ascii=False, indent=2)}",
    ]
    if forbidden_files:
        lines.append("\nFORBIDDEN files/patterns (block if tool touches these):")
        for f in forbidden_files:
            lines.append(f"  - {f}")
    return "\n".join(lines)


def _parse_guardian_response(text: str, tool_name: str) -> HookResult:
    """Parse guardian JSON response into HookResult."""
    try:
        # Extract JSON from possible markdown fences
        raw = text.strip()
        if raw.startswith("```"):
            parts = raw.split("\n", 1)
            if len(parts) > 1:
                raw = parts[1]
            if raw.endswith("```"):
                raw = raw.rsplit("\n", 1)[0]
            raw = raw.strip()

        data = json.loads(raw)
        if not isinstance(data, dict):
            raise ValueError("Guardian response is not a JSON object")

        risk = str(data.get("risk", "medium")).lower().strip()
        reason = str(data.get("reason", "No reason provided")).strip()
        forbidden_hit = bool(data.get("forbidden_hit", False))

        # Validate risk
        if risk not in ("low", "medium", "high", "critical"):
            risk = "medium"

        if forbidden_hit or risk == "critical":
            logger.info(
                "Guardian AI blocked tool {tool}: risk={risk} reason={reason}",
                tool=tool_name, risk=risk, reason=reason,
            )
            return HookResult(
                action="block",
                reason=reason,
                risk="critical" if forbidden_hit else risk,
                data=data,
            )

        if risk == "low":
            # Low risk: auto-allow (no need to bother user)
            return HookResult(action="allow", risk="low", data=data)

        # Medium/high: allow but tag with risk — approval system will ask user
        logger.info(
            "Guardian AI flagged tool {tool}: risk={risk} reason={reason}",
            tool=tool_name, risk=risk, reason=reason,
        )
        return HookResult(
            action="allow",
            reason=reason,
            risk=risk,
            data=data,
        )

    except (json.JSONDecodeError, ValueError, TypeError) as e:
        logger.warning("Guardian AI returned invalid JSON for {tool}: {error}", tool=tool_name, error=e)
        # Fail-open on parse error
        return HookResult(action="allow", risk="medium")


class GuardianAI:
    """Guardian AI checker using a secondary LLM evaluation."""

    def __init__(self, chat_provider: ChatProvider, forbidden_files: list[str] | None = None) -> None:
        self._chat_provider = chat_provider
        self._forbidden_files = forbidden_files or []

    async def check(self, tool_name: str, tool_input: dict[str, Any]) -> HookResult:
        """Run the guardian check on a proposed tool call.

        Returns:
            HookResult with action + risk assessment.
            - risk="low" → auto-allow
            - risk="medium"|"high" → approval system asks user
            - risk="critical" → blocked
        """
        try:
            user_content = _build_prompt(tool_name, tool_input, self._forbidden_files)
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
                return HookResult(action="allow", risk="medium")

            return _parse_guardian_response(response, tool_name)

        except Exception as e:
            # Fail-open on any error
            logger.warning("Guardian AI check failed for {tool}: {error}", tool=tool_name, error=e)
            return HookResult(action="allow", risk="medium")


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

    forbidden_files = getattr(session.state, "forbidden_files", None) or []
    return GuardianAI(chat_provider, forbidden_files=forbidden_files)
