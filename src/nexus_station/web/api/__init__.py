"""API routes."""

from nexus_station.web.api import auth, config, open_in, sessions

auth_router = auth.router
config_router = config.router
sessions_router = sessions.router
work_dirs_router = sessions.work_dirs_router
open_in_router = open_in.router

__all__ = [
    "auth_router",
    "config_router",
    "open_in_router",
    "sessions_router",
    "work_dirs_router",
]
