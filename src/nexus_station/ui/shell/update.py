from __future__ import annotations

import asyncio
import contextlib
import json
import os
import re
import shlex
import subprocess
from enum import Enum, auto
from pathlib import Path

import aiohttp

from nexus_station.share import get_share_dir
from nexus_station.ui.shell.console import console
from nexus_station.utils.aiohttp import new_client_session
from nexus_station.utils.logging import logger

GITHUB_REPO = "adden-git/NEXT"
LATEST_VERSION_URL = f"https://api.github.com/repos/{GITHUB_REPO}/releases/latest"
CHANGELOG_URL = f"https://github.com/{GITHUB_REPO}/releases"

# Upgrade command shown in toast notifications.
# Detects the project root from the current file location.
_ProjectRoot = Path(__file__).resolve().parents[4]
UPGRADE_COMMAND = f"cd {_ProjectRoot} && git pull origin main && python3 setup.py --auto"


class UpdateResult(Enum):
    UPDATE_AVAILABLE = auto()
    UPDATED = auto()
    UP_TO_DATE = auto()
    FAILED = auto()
    UNSUPPORTED = auto()


_UPDATE_LOCK = asyncio.Lock()


def semver_tuple(version: str) -> tuple[int, int, int]:
    v = version.strip()
    if v.startswith("v"):
        v = v[1:]
    match = re.match(r"^(\d+)\.(\d+)(?:\.(\d+))?", v)
    if not match:
        return (0, 0, 0)
    major = int(match.group(1))
    minor = int(match.group(2))
    patch = int(match.group(3) or 0)
    return (major, minor, patch)


async def _get_latest_version(session: aiohttp.ClientSession) -> str | None:
    try:
        async with session.get(LATEST_VERSION_URL) as resp:
            if resp.status == 404:
                logger.debug("No releases found on GitHub.")
                return None
            resp.raise_for_status()
            data = await resp.json()
            tag = data.get("tag_name", "").strip()
            if tag.startswith("v"):
                tag = tag[1:]
            return tag or None
    except (TimeoutError, aiohttp.ClientError):
        logger.exception("Failed to get latest version from GitHub:")
        return None


async def do_update(*, print: bool = True, check_only: bool = False) -> UpdateResult:
    async with _UPDATE_LOCK:
        return await _do_update(print=print, check_only=check_only)


LATEST_VERSION_FILE = get_share_dir() / "latest_version.txt"
SKIPPED_VERSION_FILE = get_share_dir() / "skipped_version.txt"


def _read_key() -> str:
    """Read a single character from stdin in raw terminal mode."""
    import sys

    if sys.platform == "win32":
        import msvcrt

        return msvcrt.getwch()
    else:
        import termios
        import tty

        fd = sys.stdin.fileno()
        old = termios.tcgetattr(fd)
        try:
            tty.setraw(fd)
            return sys.stdin.read(1)
        finally:
            termios.tcsetattr(fd, termios.TCSADRAIN, old)


def check_update_gate() -> None:
    """Block interactive shell startup if a newer version is cached locally."""
    import sys

    from nexus_station.constant import VERSION as current_version
    from nexus_station.utils.envvar import get_env_bool

    if get_env_bool("KIMI_CLI_NO_AUTO_UPDATE"):
        return
    if not sys.stdin.isatty() or not sys.stdout.isatty():
        return
    if not LATEST_VERSION_FILE.exists():
        return

    try:
        latest_version = LATEST_VERSION_FILE.read_text(encoding="utf-8").strip()
    except OSError:
        return
    if semver_tuple(latest_version) <= semver_tuple(current_version):
        return

    if SKIPPED_VERSION_FILE.exists():
        try:
            skipped = SKIPPED_VERSION_FILE.read_text(encoding="utf-8").strip()
        except OSError:
            skipped = ""
        if skipped == latest_version:
            return

    _run_update_gate(current_version, latest_version)


def _run_update_gate(current_version: str, latest_version: str) -> None:
    """Display the blocking update UI and handle user key input."""
    import sys

    from rich.panel import Panel
    from rich.rule import Rule
    from rich.text import Text

    body = Text.assemble(
        ("  Текущая версия    ", ""),
        (current_version + "\n", ""),
        ("  Последняя версия  ", ""),
        (latest_version + "\n\n", "bold green"),
        ("  Что нового:\n", ""),
        ("    · ", ""),
        (CHANGELOG_URL + "\n", "dodger_blue1"),
    )
    console.print()
    console.print(
        Panel(
            body,
            title="[bold]Доступно обновление NEXUS Station[/bold]",
            border_style="yellow",
            expand=False,
            padding=(1, 2),
        )
    )
    console.print(Rule(style="grey50"))
    console.print(
        Text.assemble(
            "  ",
            ("[Enter]", "bold"),
            "  Обновить сейчас  ",
            (f"({UPGRADE_COMMAND})", "grey50"),
        )
    )
    console.print(Text.assemble("  ", ("[q]", "bold"), "      Не сейчас, напомнить позже"))
    console.print(
        Text.assemble("  ", ("[s]", "bold"), f"      Пропустить версию {latest_version}")
    )
    console.print(Rule(style="grey50"))
    console.print()

    key = _read_key()
    console.print()

    if key in ("\r", "\n"):
        console.print(f"[grey50]Выполняется: {UPGRADE_COMMAND}[/grey50]\n")
        try:
            result = subprocess.run(UPGRADE_COMMAND, shell=True)
        except OSError:
            console.print()
            console.print("[red]Ошибка обновления. Выполните вручную:[/red]")
            console.print(f"  {UPGRADE_COMMAND}")
            sys.exit(1)
        console.print()
        if result.returncode == 0:
            console.print("[green]Обновление завершено! Перезапустите NEXUS Station.[/green]")
        else:
            console.print("[red]Ошибка обновления. Выполните вручную:[/red]")
            console.print(f"  {UPGRADE_COMMAND}")
        sys.exit(result.returncode)
    elif key in ("s", "S"):
        with contextlib.suppress(OSError):
            SKIPPED_VERSION_FILE.write_text(latest_version, encoding="utf-8")
        console.print(f"[grey50]Напоминания о версии {latest_version} отключены.[/grey50]\n")
    elif key in ("\x03", "\x1b"):
        sys.exit(0)
    # q/Q/other: fall through, continue startup


async def _do_update(*, print: bool, check_only: bool) -> UpdateResult:
    from nexus_station.constant import VERSION as current_version

    def _print(message: str) -> None:
        if print:
            console.print(message)

    timeout = aiohttp.ClientTimeout(total=30, sock_read=10, sock_connect=10)
    async with new_client_session(timeout=timeout) as session:
        logger.info("Checking for updates from GitHub...")
        _print("Проверка обновлений с GitHub...")
        latest_version = await _get_latest_version(session)
        if latest_version is None:
            _print("[grey50]Нет доступных релизов на GitHub.[/grey50]")
            return UpdateResult.UP_TO_DATE

        logger.debug("Latest version: {latest_version}", latest_version=latest_version)
        LATEST_VERSION_FILE.write_text(latest_version, encoding="utf-8")

        cur_t = semver_tuple(current_version)
        lat_t = semver_tuple(latest_version)

        if cur_t >= lat_t:
            logger.debug("Already up to date: {current_version}", current_version=current_version)
            _print("[green]Уже последняя версия.[/green]")
            return UpdateResult.UP_TO_DATE

        if check_only:
            logger.info(
                "Update available: current={current_version}, latest={latest_version}",
                current_version=current_version,
                latest_version=latest_version,
            )
            _print(f"[yellow]Доступно обновление: {latest_version}[/yellow]")
            return UpdateResult.UPDATE_AVAILABLE

        logger.info(
            "Updating from {current_version} to {latest_version}...",
            current_version=current_version,
            latest_version=latest_version,
        )
        _print(f"Обновление с {current_version} до {latest_version}...")

        try:
            result = subprocess.run(UPGRADE_COMMAND, shell=True, capture_output=True, text=True)
        except Exception:
            logger.exception("Failed to run upgrade command:")
            _print("[red]Ошибка выполнения команды обновления.[/red]")
            return UpdateResult.FAILED

        if result.returncode != 0:
            logger.error("Upgrade failed: {stderr}", stderr=result.stderr)
            _print("[red]Ошибка обновления.[/red]")
            return UpdateResult.FAILED

    _print("[green]Обновление успешно![/green]")
    _print("[yellow]Перезапустите NEXUS Station для применения изменений.[/yellow]")
    return UpdateResult.UPDATED


# @meta_command
# async def update(app: "Shell", args: list[str]):
#     """Check for updates"""
#     await do_update(print=True)
#
#
# @meta_command(name="check-update")
# async def check_update(app: "Shell", args: list[str]):
#     """Check for updates"""
#     await do_update(print=True, check_only=True)
