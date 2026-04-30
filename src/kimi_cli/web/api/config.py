"""Config API routes."""

from __future__ import annotations

import asyncio
import json
import os
import shutil
import subprocess
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field

from kimi_cli import logger
from kimi_cli.config import Config, LLMModel, get_config_file, load_config, save_config
from kimi_cli.llm import ProviderType, derive_model_capabilities
from kimi_cli.utils.subprocess_env import get_clean_env
from kimi_cli.web.auth_users import get_sync_status
from kimi_cli.web.runner.process import KimiCLIRunner

router = APIRouter(prefix="/api/config", tags=["config"])


class ConfigModel(LLMModel):
    """Model configuration for frontend."""

    name: str = Field(description="Model key in kimi-cli config (Config.models)")
    provider_type: ProviderType = Field(description="Provider type (LLMProvider.type)")


class GlobalConfig(BaseModel):
    """Global configuration snapshot for frontend."""

    default_model: str = Field(description="Current default model key")
    default_thinking: bool = Field(description="Current default thinking mode")
    models: list[ConfigModel] = Field(description="All configured models")


class UpdateGlobalConfigRequest(BaseModel):
    """Request to update global config."""

    default_model: str | None = Field(default=None, description="New default model key")
    default_thinking: bool | None = Field(default=None, description="New default thinking mode")
    restart_running_sessions: bool | None = Field(
        default=None, description="Whether to restart running sessions"
    )
    force_restart_busy_sessions: bool | None = Field(
        default=None, description="Whether to force restart busy sessions"
    )


class UpdateGlobalConfigResponse(BaseModel):
    """Response after updating global config."""

    config: GlobalConfig = Field(description="Updated config snapshot")
    restarted_session_ids: list[str] | None = Field(
        default=None, description="IDs of restarted sessions"
    )
    skipped_busy_session_ids: list[str] | None = Field(
        default=None, description="IDs of busy sessions that were skipped"
    )


class ConfigToml(BaseModel):
    """Raw config.toml content."""

    content: str = Field(description="Raw TOML content")
    path: str = Field(description="Path to config file")


class UpdateConfigTomlRequest(BaseModel):
    """Request to update config.toml."""

    content: str = Field(description="New TOML content")


class UpdateConfigTomlResponse(BaseModel):
    """Response after updating config.toml."""

    success: bool = Field(description="Whether the update was successful")
    error: str | None = Field(default=None, description="Error message if failed")


def _build_global_config() -> GlobalConfig:
    """Build GlobalConfig from kimi-cli config."""
    config = load_config()

    models: list[ConfigModel] = []
    for model_name, model in config.models.items():
        provider = config.providers.get(model.provider)
        if provider is None:
            continue

        # Derive capabilities
        derived_caps = derive_model_capabilities(model)
        capabilities = derived_caps or None

        models.append(
            ConfigModel(
                name=model_name,
                model=model.model,
                provider=model.provider,
                provider_type=provider.type,
                max_context_size=model.max_context_size,
                capabilities=capabilities,
            )
        )

    return GlobalConfig(
        default_model=config.default_model,
        default_thinking=config.default_thinking,
        models=models,
    )


def _get_runner(req: Request) -> KimiCLIRunner:
    """Get KimiCLIRunner from FastAPI app state."""
    return req.app.state.runner


def _ensure_sensitive_apis_allowed(request: Request) -> None:
    """Block sensitive config writes when restricted."""
    if getattr(request.app.state, "restrict_sensitive_apis", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sensitive config APIs are disabled in this mode.",
        )


@router.get("/", summary="Get global (kimi-cli) config snapshot")
async def get_global_config() -> GlobalConfig:
    """Get global (kimi-cli) config snapshot."""
    return _build_global_config()


@router.patch("/", summary="Update global (kimi-cli) default model/thinking")
async def update_global_config(
    request: UpdateGlobalConfigRequest,
    http_request: Request,
    runner: KimiCLIRunner = Depends(_get_runner),
) -> UpdateGlobalConfigResponse:
    """Update global (kimi-cli) default model/thinking."""
    _ensure_sensitive_apis_allowed(http_request)
    config = load_config()

    # Validate and update default_model
    if request.default_model is not None:
        if request.default_model not in config.models:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Model '{request.default_model}' not found in config",
            )
        config.default_model = request.default_model

    # Update default_thinking
    if request.default_thinking is not None:
        config.default_thinking = request.default_thinking

    # Save config
    save_config(config)

    # Restart running workers to apply config changes
    restarted: list[str] = []
    skipped_busy: list[str] = []

    restart_running = request.restart_running_sessions
    if restart_running is None:
        restart_running = True  # Default to restarting sessions

    if restart_running:
        summary = await runner.restart_running_workers(
            reason="config_update",
            force=request.force_restart_busy_sessions or False,
        )
        restarted = [str(sid) for sid in summary.restarted_session_ids]
        skipped_busy = [str(sid) for sid in summary.skipped_busy_session_ids]

    return UpdateGlobalConfigResponse(
        config=_build_global_config(),
        restarted_session_ids=restarted if restarted else None,
        skipped_busy_session_ids=skipped_busy if skipped_busy else None,
    )


@router.get("/toml", summary="Get kimi-cli config.toml")
async def get_config_toml(http_request: Request) -> ConfigToml:
    """Get kimi-cli config.toml."""
    _ensure_sensitive_apis_allowed(http_request)
    config_file = get_config_file()
    if not config_file.exists():
        return ConfigToml(content="", path=str(config_file))
    return ConfigToml(content=config_file.read_text(encoding="utf-8"), path=str(config_file))


@router.put("/toml", summary="Update kimi-cli config.toml")
async def update_config_toml(
    request: UpdateConfigTomlRequest,
    http_request: Request,
) -> UpdateConfigTomlResponse:
    """Update kimi-cli config.toml."""
    from kimi_cli.config import load_config_from_string

    _ensure_sensitive_apis_allowed(http_request)
    try:
        # Validate the config first
        load_config_from_string(request.content)

        # Write to file
        config_file = get_config_file()
        config_file.parent.mkdir(parents=True, exist_ok=True)
        config_file.write_text(request.content, encoding="utf-8")

        return UpdateConfigTomlResponse(success=True)
    except Exception as e:
        logger.warning(f"Failed to update config.toml: {e}")
        return UpdateConfigTomlResponse(success=False, error=str(e))


class ExtendedConfig(BaseModel):
    """Full configuration for advanced settings panel."""

    config: dict = Field(description="Complete kimi-cli configuration as JSON")


@router.get("/extended", summary="Get full kimi-cli config as JSON")
async def get_extended_config(http_request: Request) -> ExtendedConfig:
    """Get complete configuration including loop_control, providers, services, mcp, hooks."""
    _ensure_sensitive_apis_allowed(http_request)
    config = load_config()
    return ExtendedConfig(config=config.model_dump(mode="json"))


class UpdateExtendedConfigRequest(BaseModel):
    """Request to update full config from JSON."""

    config: dict = Field(description="Complete kimi-cli configuration as JSON")
    restart_running_sessions: bool | None = Field(
        default=None, description="Whether to restart running sessions"
    )
    force_restart_busy_sessions: bool | None = Field(
        default=None, description="Whether to force restart busy sessions"
    )


class UpdateExtendedConfigResponse(BaseModel):
    """Response after updating full config."""

    success: bool = Field(description="Whether the update was successful")
    error: str | None = Field(default=None, description="Error message if failed")
    restarted_session_ids: list[str] | None = Field(
        default=None, description="IDs of restarted sessions"
    )
    skipped_busy_session_ids: list[str] | None = Field(
        default=None, description="IDs of busy sessions that were skipped"
    )


class ModelEnvVars(BaseModel):
    """Model generation parameters passed via environment variables."""

    temperature: float | None = Field(default=None, ge=0.0, le=2.0, description="Sampling temperature (0.0-2.0)")
    top_p: float | None = Field(default=None, ge=0.0, le=1.0, description="Nucleus sampling top_p (0.0-1.0)")
    max_tokens: int | None = Field(default=None, ge=1, le=200_000, description="Maximum tokens per response")
    thinking_keep: str | None = Field(default=None, description="Kimi thinking keep mode")


class UpdateModelEnvVarsResponse(BaseModel):
    """Response after updating model env vars."""

    success: bool = Field(description="Whether the update was successful")
    env: dict[str, str | None] = Field(description="Current env var values")


@router.get("/env", summary="Get current model env vars")
async def get_model_env_vars() -> dict[str, str | None]:
    """Get current KIMI_MODEL_* environment variables."""
    return {
        "temperature": os.environ.get("KIMI_MODEL_TEMPERATURE"),
        "top_p": os.environ.get("KIMI_MODEL_TOP_P"),
        "max_tokens": os.environ.get("KIMI_MODEL_MAX_TOKENS"),
        "thinking_keep": os.environ.get("KIMI_MODEL_THINKING_KEEP"),
    }


@router.put("/env", summary="Update model generation env vars")
async def update_model_env_vars(
    request: ModelEnvVars,
    http_request: Request,
    runner: KimiCLIRunner = Depends(_get_runner),
) -> UpdateModelEnvVarsResponse:
    """Update KIMI_MODEL_* environment variables and restart workers."""
    _ensure_sensitive_apis_allowed(http_request)

    env_mapping = {
        "temperature": "KIMI_MODEL_TEMPERATURE",
        "top_p": "KIMI_MODEL_TOP_P",
        "max_tokens": "KIMI_MODEL_MAX_TOKENS",
        "thinking_keep": "KIMI_MODEL_THINKING_KEEP",
    }

    updated: dict[str, str | None] = {}
    for field, env_key in env_mapping.items():
        value = getattr(request, field)
        if value is not None:
            str_value = str(value)
            os.environ[env_key] = str_value
            updated[field] = str_value
        else:
            os.environ.pop(env_key, None)
            updated[field] = None

    # Restart running workers so they pick up new env vars
    summary = await runner.restart_running_workers(reason="env_vars_update", force=False)

    return UpdateModelEnvVarsResponse(
        success=True,
        env=updated,
    )


@router.put("/extended", summary="Update full kimi-cli config from JSON")
async def update_extended_config(
    request: UpdateExtendedConfigRequest,
    http_request: Request,
    runner: KimiCLIRunner = Depends(_get_runner),
) -> UpdateExtendedConfigResponse:
    """Update complete configuration from JSON."""
    _ensure_sensitive_apis_allowed(http_request)
    try:
        # Validate the config by parsing it through Pydantic
        new_config = Config.model_validate(request.config)
        save_config(new_config)

        restarted: list[str] = []
        skipped_busy: list[str] = []

        restart_running = request.restart_running_sessions
        if restart_running is None:
            restart_running = True

        if restart_running:
            summary = await runner.restart_running_workers(
                reason="config_update",
                force=request.force_restart_busy_sessions or False,
            )
            restarted = [str(sid) for sid in summary.restarted_session_ids]
            skipped_busy = [str(sid) for sid in summary.skipped_busy_session_ids]

        return UpdateExtendedConfigResponse(
            success=True,
            restarted_session_ids=restarted if restarted else None,
            skipped_busy_session_ids=skipped_busy if skipped_busy else None,
        )
    except Exception as e:
        logger.warning(f"Failed to update extended config: {e}")
        return UpdateExtendedConfigResponse(success=False, error=str(e))


class GitFileDiff(BaseModel):
    """Single file diff entry."""

    path: str
    additions: int
    deletions: int
    status: str


class GitDiffStats(BaseModel):
    """Git diff statistics."""

    is_git_repo: bool = True
    has_changes: bool = False
    total_additions: int = 0
    total_deletions: int = 0
    files: list[GitFileDiff] | None = None
    error: str | None = None


@router.get("/git-diff", summary="Get git diff for startup directory")
async def get_startup_git_diff(request: Request) -> GitDiffStats:
    """Get git diff stats for the startup directory."""
    work_dir = Path(request.app.state.startup_dir)

    if not (work_dir / ".git").exists():
        return GitDiffStats(is_git_repo=False)

    try:
        files: list[GitFileDiff] = []
        total_add, total_del = 0, 0

        check_proc = await asyncio.create_subprocess_exec(
            "git", "rev-parse", "--verify", "HEAD",
            cwd=str(work_dir),
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.DEVNULL,
            env=get_clean_env(),
        )
        await check_proc.wait()
        has_head = check_proc.returncode == 0

        if has_head:
            proc = await asyncio.create_subprocess_exec(
                "git", "diff", "--numstat", "HEAD",
                cwd=str(work_dir),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=get_clean_env(),
            )
            stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=5.0)

            for line in stdout.decode().strip().split("\n"):
                if not line:
                    continue
                parts = line.split("\t")
                if len(parts) >= 3:
                    add = int(parts[0]) if parts[0] != "-" else 0
                    dele = int(parts[1]) if parts[1] != "-" else 0
                    total_add += add
                    total_del += dele
                    file_status = "modified"
                    if dele == 0 and add > 0:
                        file_status = "added"
                    elif add == 0 and dele > 0:
                        file_status = "deleted"
                    files.append(GitFileDiff(path=parts[2], additions=add, deletions=dele, status=file_status))

        untracked_proc = await asyncio.create_subprocess_exec(
            "git", "ls-files", "--others", "--exclude-standard",
            cwd=str(work_dir),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.DEVNULL,
            env=get_clean_env(),
        )
        untracked_stdout, _ = await asyncio.wait_for(untracked_proc.communicate(), timeout=5.0)

        for line in untracked_stdout.decode().strip().split("\n"):
            if line:
                files.append(GitFileDiff(path=line, additions=0, deletions=0, status="added"))

        if not has_head:
            return GitDiffStats(
                is_git_repo=True,
                has_changes=len(files) > 0,
                total_additions=0,
                total_deletions=0,
                files=files,
            )

        return GitDiffStats(
            is_git_repo=True,
            has_changes=len(files) > 0,
            total_additions=total_add,
            total_deletions=total_del,
            files=files,
        )
    except TimeoutError:
        return GitDiffStats(is_git_repo=True, error="Git command timed out")
    except Exception as e:
        return GitDiffStats(is_git_repo=True, error=str(e))


@router.get("/license", summary="Get session sync status")
async def get_license() -> dict[str, Any]:
    """Return session sync status. Public endpoint — no auth required."""
    info = get_sync_status()
    return {
        "valid": info["_ok"],
        "expired": info.get("_exp", False),
        "days_remaining": info.get("_rem", 0),
        "expires_at": info.get("_expires"),
        "trial_days": 7,
    }


@router.get("/version", summary="Get current app version")
async def get_version() -> dict[str, str]:
    """Return current version from pyproject.toml."""
    try:
        import tomllib
    except ImportError:
        import tomli as tomllib
    config_path = Path(__file__).resolve().parents[4] / "pyproject.toml"
    try:
        with open(config_path, "rb") as f:
            data = tomllib.load(f)
        return {"version": data.get("project", {}).get("version", "unknown")}
    except Exception:
        return {"version": "unknown"}


def _get_current_branch(cwd: Path) -> str:
    """Detect the currently checked-out git branch."""
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            cwd=str(cwd),
            capture_output=True,
            text=True,
            timeout=30,
        )
        branch = result.stdout.strip()
        if branch and branch != "HEAD":
            return branch
    except Exception:
        pass
    return "main"


def _get_pm2_name() -> str | None:
    """Try to detect the PM2 process name for the current process."""
    try:
        import os

        my_pid = os.getpid()
        result = subprocess.run(
            ["pm2", "jlist"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        processes = json.loads(result.stdout)
        for proc in processes:
            pm2_env = proc.get("pm2_env", {})
            pid_path = pm2_env.get("pm_pid_path", "")
            if pid_path and str(my_pid) in pid_path:
                return proc.get("name")
            # fallback: compare PID from pm2_env.pid
            if pm2_env.get("pid") == my_pid:
                return proc.get("name")
    except Exception:
        pass
    # Final fallback: env override
    return os.environ.get("KIMI_PM2_NAME")


@router.post("/update", summary="Update app from git and rebuild")
async def post_update(request: Request) -> dict[str, Any]:
    """Run git pull, npm build, copy static, pm2 restart."""
    _ensure_sensitive_apis_allowed(request)
    startup_dir = Path(request.app.state.startup_dir)
    logs: list[str] = []

    def run(cmd: list[str], cwd: Path, env: dict[str, str] | None = None) -> str:
        try:
            result = subprocess.run(
                cmd,
                cwd=str(cwd),
                capture_output=True,
                text=True,
                timeout=300,
                env=env,
            )
            return (result.stdout + result.stderr).strip()
        except subprocess.TimeoutExpired:
            return f"TIMEOUT: {' '.join(cmd)}"
        except Exception as e:
            return f"ERROR: {e}"

    branch = _get_current_branch(startup_dir)
    logs.append(f"=== git pull (branch: {branch}) ===")
    pull_output = run(["git", "pull", "origin", branch], startup_dir)
    logs.append(pull_output)
    if "Already up to date" in pull_output:
        logs.append("Already up to date")
        return {"success": True, "logs": logs}
    if "error" in pull_output.lower() or "fatal" in pull_output.lower():
        logs.append("Git pull failed, aborting")
        return {"success": False, "logs": logs, "error": "Git pull failed"}

    logs.append("=== npm build ===")
    web_dir = startup_dir / "web"
    env = os.environ.copy()
    env["VITE_DISABLE_TYPESCRIPT"] = "1"
    build_output = run(["npx", "vite", "build"], web_dir, env=env)
    logs.append(build_output)
    if "error" in build_output.lower() or "ERR_" in build_output:
        logs.append("Build failed, aborting")
        return {"success": False, "logs": logs, "error": "Build failed"}

    logs.append("=== copy static ===")
    dist_dir = web_dir / "dist"
    static_dir = startup_dir / "src" / "kimi_cli" / "web" / "static"
    if dist_dir.exists() and static_dir.exists():
        try:
            for item in dist_dir.iterdir():
                dest = static_dir / item.name
                if item.is_dir():
                    if dest.exists():
                        shutil.rmtree(dest)
                    shutil.copytree(item, dest)
                else:
                    shutil.copy2(item, dest)
            logs.append("OK")
        except Exception as e:
            logs.append(f"Copy failed: {e}")
            return {"success": False, "logs": logs, "error": f"Copy failed: {e}"}
    else:
        logs.append("MISSING dirs")

    logs.append("=== pm2 restart ===")
    pm2_name = _get_pm2_name()
    if pm2_name:
        # Schedule restart after a short delay so the HTTP response can be
        # fully sent before the process is killed.
        import threading

        def _delayed_restart() -> None:
            import time

            time.sleep(2)
            subprocess.run(
                ["pm2", "restart", pm2_name],
                cwd=str(startup_dir),
                capture_output=True,
                text=True,
            )

        threading.Thread(target=_delayed_restart, daemon=True).start()
        logs.append(f"PM2 restart of '{pm2_name}' scheduled in 2s")
    else:
        logs.append("PM2 name not detected, skipping restart")

    return {"success": True, "logs": logs}
