from __future__ import annotations


class NexusCLIException(Exception):
    """Base exception class for NEXUS Station."""

    pass


class ConfigError(NexusCLIException, ValueError):
    """Configuration error."""

    pass


class AgentSpecError(NexusCLIException, ValueError):
    """Agent specification error."""

    pass


class InvalidToolError(NexusCLIException, ValueError):
    """Invalid tool error."""

    pass


class SystemPromptTemplateError(NexusCLIException, ValueError):
    """System prompt template error."""

    pass


class MCPConfigError(NexusCLIException, ValueError):
    """MCP config error."""

    pass


class MCPRuntimeError(NexusCLIException, RuntimeError):
    """MCP runtime error."""

    pass
