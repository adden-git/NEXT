"""
NEXUS Shield AI — Security Defense System
Double-checks all tool executions before they run.
Fail-open design: any error → ALLOW.
"""

from dataclasses import dataclass
from typing import Any


@dataclass
class ShieldConfig:
    enabled: bool = False
    model: str | None = None
    provider: str = "fireworks"


class ShieldAI:
    """
    Security shield that analyzes tool calls before execution.
    Think of it as the ship's security officer.
    """

    SAFETY_RULES = """
You are the NEXUS Station Security Shield AI.
Your job: analyze tool calls and decide if they are SAFE or DANGEROUS.

Rules for BLOCKING:
1. rm -rf / or destructive wildcard deletes
2. Overwriting critical config files without backup
3. Executing unknown/suspicious shell commands
4. Sending secrets/credentials externally
5. Modifying system files (/etc, /usr, /bin)
6. Mass file deletion (>10 files at once)

Rules for ALLOWING:
1. Normal code editing in project directories
2. Running tests or build commands
3. Reading files or logs
4. Git operations in project repos
5. Package installation in venv

Respond with EXACTLY one word: ALLOW or BLOCK.
"""

    def __init__(self, config: ShieldConfig):
        self.config = config

    async def check(self, tool_name: str, tool_input: dict[str, Any]) -> tuple[bool, str]:
        """
        Check if a tool call is safe.
        Returns: (allowed: bool, reason: str)
        """
        if not self.config.enabled:
            return True, ""

        try:
            # In production, this calls a secondary LLM
            # For now, use heuristic checks
            result = self._heuristic_check(tool_name, tool_input)
            return result
        except Exception as e:
            # Fail-open: any error means ALLOW
            return True, f"Shield check error (fail-open): {e}"

    def _heuristic_check(self, tool_name: str, tool_input: dict[str, Any]) -> tuple[bool, str]:
        """Quick heuristic security scan"""
        text = str(tool_input).lower()

        # Dangerous patterns
        dangerous = [
            "rm -rf /",
            "rm -rf /*",
            "dd if=/dev/zero",
            ":(){ :|:& };:",
            "mkfs.",
            "> /dev/sda",
            "chmod 777 /",
        ]

        for pattern in dangerous:
            if pattern in text:
                return False, f"DANGEROUS PATTERN DETECTED: {pattern}"

        # Check for mass deletion
        if "rm" in text and ("*" in text or "-r" in text):
            return True, "WARNING: recursive delete detected — review recommended"

        return True, ""


def load_shield(config: dict[str, Any] | None) -> ShieldAI:
    """Factory: create Shield AI from config"""
    if not config:
        return ShieldAI(ShieldConfig())
    return ShieldAI(ShieldConfig(**config))
