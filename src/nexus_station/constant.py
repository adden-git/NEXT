from __future__ import annotations

from functools import cache
from typing import TYPE_CHECKING

NAME = "NEXUS Station"
VERSION = "2.0.0"
USER_AGENT = "RooCode/3.0.0"

if TYPE_CHECKING:
    VERSION: str
    USER_AGENT: str


@cache
def get_version() -> str:
    try:
        from importlib import metadata
        return metadata.version("nexus-station")
    except Exception:
        return VERSION


@cache
def get_user_agent() -> str:
    return f"NexusCLI/{get_version()}"


def __getattr__(name: str) -> str:
    if name == "VERSION":
        return get_version()
    if name == "USER_AGENT":
        return get_user_agent()
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


__all__ = ["NAME", "VERSION", "USER_AGENT", "get_version", "get_user_agent"]
