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

from nexus_station import logger
from nexus_station.config import Config, LLMModel, get_config_file, load_config, save_config
from nexus_station.llm import ProviderType, derive_model_capabilities
from nexus_station.utils.subprocess_env import get_clean_env
from nexus_station.web.auth_users import get_sync_status
from nexus_station.web.runner.process import NexusCLIRunner

router = APIRouter(prefix="/api/config", tags=["config"])


class ConfigModel(LLMModel):
    """Model configuration for frontend."""

    name: str = Field(description="Model key in nexus-station config (Config.models)")
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
    """Build GlobalConfig from nexus-station config."""
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


def _get_runner(req: Request) -> NexusCLIRunner:
    """Get NexusCLIRunner from FastAPI app state."""
    return req.app.state.runner


def _ensure_sensitive_apis_allowed(request: Request) -> None:
    """Block sensitive config writes when restricted."""
    if getattr(request.app.state, "restrict_sensitive_apis", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sensitive config APIs are disabled in this mode.",
        )


@router.get("/", summary="Get global (nexus-station) config snapshot")
async def get_global_config() -> GlobalConfig:
    """Get global (nexus-station) config snapshot."""
    return _build_global_config()


@router.patch("/", summary="Update global (nexus-station) default model/thinking")
async def update_global_config(
    request: UpdateGlobalConfigRequest,
    http_request: Request,
    runner: NexusCLIRunner = Depends(_get_runner),
) -> UpdateGlobalConfigResponse:
    """Update global (nexus-station) default model/thinking."""
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


@router.get("/toml", summary="Get nexus-station config.toml")
async def get_config_toml(http_request: Request) -> ConfigToml:
    """Get nexus-station config.toml."""
    _ensure_sensitive_apis_allowed(http_request)
    config_file = get_config_file()
    if not config_file.exists():
        return ConfigToml(content="", path=str(config_file))
    return ConfigToml(content=config_file.read_text(encoding="utf-8"), path=str(config_file))


@router.put("/toml", summary="Update nexus-station config.toml")
async def update_config_toml(
    request: UpdateConfigTomlRequest,
    http_request: Request,
) -> UpdateConfigTomlResponse:
    """Update nexus-station config.toml."""
    from nexus_station.config import load_config_from_string

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

    config: dict = Field(description="Complete nexus-station configuration as JSON")


@router.get("/extended", summary="Get full nexus-station config as JSON")
async def get_extended_config(http_request: Request) -> ExtendedConfig:
    """Get complete configuration including loop_control, providers, services, mcp, hooks."""
    _ensure_sensitive_apis_allowed(http_request)
    config = load_config()
    return ExtendedConfig(config=config.model_dump(mode="json"))


@router.get("/models", summary="Get available LLM models from config")
async def get_config_models(http_request: Request) -> dict[str, Any]:
    """Get the models registry from the global config."""
    _ensure_sensitive_apis_allowed(http_request)
    config = load_config()
    return {
        "models": {
            name: {
                "provider": m.provider,
                "model": m.model,
                "max_context_size": m.max_context_size,
                "capabilities": list(m.capabilities) if m.capabilities else [],
                "display_name": m.display_name,
            }
            for name, m in config.models.items()
        },
        "providers": list(config.providers.keys()),
    }


class UpdateExtendedConfigRequest(BaseModel):
    """Request to update full config from JSON."""

    config: dict = Field(description="Complete nexus-station configuration as JSON")
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
    runner: NexusCLIRunner = Depends(_get_runner),
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


@router.put("/extended", summary="Update full nexus-station config from JSON")
async def update_extended_config(
    request: UpdateExtendedConfigRequest,
    http_request: Request,
    runner: NexusCLIRunner = Depends(_get_runner),
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


@router.get("/license", summary="Get session sync status")
async def get_license(request: Request) -> dict[str, Any]:
    """Return session sync status. Public endpoint — no auth required."""
    # Check for admin token — returns unlimited license
    from nexus_station.web.auth import extract_token_from_request
    from nexus_station.web.auth_users import verify_admin_token
    token = extract_token_from_request(request)
    if token and verify_admin_token(token):
        return {
            "valid": True,
            "expired": False,
            "days_remaining": 9999,
            "expires_at": None,
            "trial_days": 7,
        }
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
    static_dir = startup_dir / "src" / "nexus_station" / "web" / "static"
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
