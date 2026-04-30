"""API routes."""

from kimi_cli.web.api import auth, config, files, open_in, sessions, ssh

auth_router = auth.router
config_router = config.router
files_router = files.router
sessions_router = sessions.router
work_dirs_router = sessions.work_dirs_router
open_in_router = open_in.router
ssh_router = ssh.router

__all__ = [
    "auth_router",
    "config_router",
    "files_router",
    "open_in_router",
    "sessions_router",
    "ssh_router",
    "work_dirs_router",
]
