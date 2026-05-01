"""
NEXUS Mission Control — Agent Execution Engine
Manages autonomous task execution, planning, and tool orchestration.
"""

import asyncio
from dataclasses import dataclass, field
from typing import Any, Callable

from nexus_core.shield import ShieldAI, ShieldConfig
from nexus_core.providers import ProviderRouter, ModelMessage


@dataclass
class MissionContext:
    """Context for a single mission (task)"""
    mission_id: str
    session_id: str
    objective: str
    provider: str = "openai"
    model: str = "gpt-4o"
    history: list[dict[str, Any]] = field(default_factory=list)
    tools_available: list[str] = field(default_factory=list)
    shield: ShieldAI | None = None


@dataclass
class ToolResult:
    """Result of a tool execution"""
    tool_name: str
    success: bool
    output: str
    error: str | None = None


class ToolRegistry:
    """Registry of available tools for missions"""

    def __init__(self):
        self._tools: dict[str, Callable] = {}

    def register(self, name: str, func: Callable) -> None:
        self._tools[name] = func

    def get(self, name: str) -> Callable | None:
        return self._tools.get(name)

    def list_tools(self) -> list[str]:
        return list(self._tools.keys())


class MissionControl:
    """
    Central mission controller.
    Receives objectives, plans steps, executes tools, delivers results.
    """

    SYSTEM_PROMPT = """You are NEXUS Station AI — an advanced software engineering assistant.
You help developers write, debug, and refactor code.
You can execute shell commands, read/write files, and search the web.

When given a task:
1. Analyze the objective
2. Plan your approach
3. Execute necessary tools
4. Report results clearly

Always be concise but thorough. Use code blocks for code.
"""

    def __init__(self, provider_router: ProviderRouter, tool_registry: ToolRegistry):
        self.router = provider_router
        self.tools = tool_registry
        self.active_missions: dict[str, MissionContext] = {}

    async def start_mission(
        self,
        session_id: str,
        objective: str,
        provider: str = "openai",
        model: str = "gpt-4o",
        shield_config: dict[str, Any] | None = None,
    ) -> MissionContext:
        """Begin a new mission"""
        import uuid
        mission_id = f"m-{uuid.uuid4().hex[:8]}"

        shield = None
        if shield_config and shield_config.get("enabled"):
            shield = ShieldAI(ShieldConfig(**shield_config))

        mission = MissionContext(
            mission_id=mission_id,
            session_id=session_id,
            objective=objective,
            provider=provider,
            model=model,
            shield=shield,
            tools_available=self.tools.list_tools(),
        )

        self.active_missions[mission_id] = mission
        return mission

    async def execute_step(self, mission: MissionContext, user_input: str) -> str:
        """Execute one step of the mission"""
        # Build message history
        messages = [ModelMessage(role="system", content=self.SYSTEM_PROMPT)]
        for h in mission.history:
            messages.append(ModelMessage(role=h["role"], content=h["content"]))
        messages.append(ModelMessage(role="user", content=user_input))

        # Call LLM
        try:
            response = await self.router.generate(
                mission.provider,
                messages,
                mission.model,
                temperature=0.7,
                max_tokens=4096,
            )
            result = response.content
        except Exception as e:
            result = f"⚠️ NEXUS Communication Error: {e}"

        # Store in history
        mission.history.append({"role": "user", "content": user_input})
        mission.history.append({"role": "assistant", "content": result})

        return result

    async def execute_tool(
        self,
        mission: MissionContext,
        tool_name: str,
        tool_input: dict[str, Any],
    ) -> ToolResult:
        """Execute a tool with shield protection"""
        # Shield check
        if mission.shield:
            allowed, reason = await mission.shield.check(tool_name, tool_input)
            if not allowed:
                return ToolResult(
                    tool_name=tool_name,
                    success=False,
                    output="",
                    error=f"🛡️ SHIELD BLOCKED: {reason}",
                )

        # Execute tool
        tool = self.tools.get(tool_name)
        if not tool:
            return ToolResult(
                tool_name=tool_name,
                success=False,
                output="",
                error=f"Tool '{tool_name}' not found in registry",
            )

        try:
            output = await tool(**tool_input) if asyncio.iscoroutinefunction(tool) else tool(**tool_input)
            return ToolResult(tool_name=tool_name, success=True, output=str(output))
        except Exception as e:
            return ToolResult(tool_name=tool_name, success=False, output="", error=str(e))


# Global instances
tools = ToolRegistry()
missions = MissionControl(router=ProviderRouter(), tool_registry=tools)


# ─── BUILTIN TOOLS ───
def tool_read_file(path: str) -> str:
    """Read file contents"""
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as e:
        return f"Error reading file: {e}"


def tool_write_file(path: str, content: str) -> str:
    """Write content to file"""
    try:
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        return f"File written: {path}"
    except Exception as e:
        return f"Error writing file: {e}"


def tool_shell(command: str) -> str:
    """Execute shell command"""
    import subprocess
    try:
        result = subprocess.run(
            command, shell=True, capture_output=True, text=True, timeout=60
        )
        output = result.stdout
        if result.stderr:
            output += "\n[stderr]\n" + result.stderr
        return output
    except Exception as e:
        return f"Error executing command: {e}"


def tool_list_dir(path: str = ".") -> str:
    """List directory contents"""
    import os
    try:
        entries = os.listdir(path)
        return "\n".join(entries)
    except Exception as e:
        return f"Error listing directory: {e}"


# Register builtin tools
tools.register("read_file", tool_read_file)
tools.register("write_file", tool_write_file)
tools.register("shell", tool_shell)
tools.register("list_dir", tool_list_dir)
