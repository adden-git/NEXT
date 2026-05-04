"""SSH API routes — WebSocket SSH terminal."""

from __future__ import annotations

import asyncio
from nexus_station.web.utils._json import json
import os
import subprocess
from typing import cast

import paramiko
from fastapi import APIRouter, HTTPException, Query, Request, WebSocket, WebSocketDisconnect, status
from pydantic import BaseModel, Field

from nexus_station.web.api.config import _ensure_sensitive_apis_allowed

router = APIRouter(prefix="/api/ssh", tags=["ssh"])

# In-memory SSH session store
_ssh_sessions: dict[str, dict] = {}


class ExecRequest(BaseModel):
    host: str = Field(description="SSH host")
    port: int = Field(default=22, description="SSH port")
    username: str = Field(description="SSH username")
    password: str = Field(default="", description="SSH password")
    private_key: str = Field(default="", description="Private key content")
    command: str = Field(default="", description="Command to execute (empty for interactive)")


class ExecResponse(BaseModel):
    stdout: str
    stderr: str
    exit_code: int


class StatusResponse(BaseModel):
    pm2: str = Field(default="", description="PM2 status output")
    disk: str = Field(default="", description="Disk usage")
    uptime: str = Field(default="", description="System uptime")
    load: str = Field(default="", description="Load average")


def _get_client(req: ExecRequest) -> paramiko.SSHClient:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    connect_kwargs: dict = {
        "hostname": req.host,
        "port": req.port,
        "username": req.username,
        "timeout": 10,
    }
    if req.private_key:
        key = paramiko.RSAKey.from_private_key_file(req.private_key) if req.private_key.startswith("/") else paramiko.RSAKey.from_private_key(__import__("io").StringIO(req.private_key))
        connect_kwargs["pkey"] = key
    elif req.password:
        connect_kwargs["password"] = req.password
    client.connect(**connect_kwargs)
    return client


@router.post("/exec", summary="Execute SSH command")
async def ssh_exec(request: ExecRequest, http_request: Request) -> ExecResponse:
    _ensure_sensitive_apis_allowed(http_request)
    try:
        client = await asyncio.get_event_loop().run_in_executor(None, _get_client, request)
        stdin, stdout, stderr = client.exec_command(request.command)
        exit_code = stdout.channel.recv_exit_status()
        out = stdout.read().decode("utf-8", errors="replace")
        err = stderr.read().decode("utf-8", errors="replace")
        client.close()
        return ExecResponse(stdout=out, stderr=err, exit_code=exit_code)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))


@router.get("/status", summary="Server status snapshot")
async def ssh_status(http_request: Request) -> StatusResponse:
    _ensure_sensitive_apis_allowed(http_request)
    pm2_out = ""
    disk_out = ""
    uptime_out = ""
    load_out = ""
    try:
        pm2_out = subprocess.check_output(["pm2", "status"], text=True, stderr=subprocess.STDOUT, timeout=5)
    except Exception:
        pm2_out = "PM2 not available"
    try:
        disk_out = subprocess.check_output(["df", "-h"], text=True, stderr=subprocess.STDOUT, timeout=3)
    except Exception:
        disk_out = "Disk info unavailable"
    try:
        uptime_out = subprocess.check_output(["uptime", "-p"], text=True, stderr=subprocess.STDOUT, timeout=3).strip()
    except Exception:
        try:
            uptime_out = subprocess.check_output(["uptime"], text=True, stderr=subprocess.STDOUT, timeout=3).strip()
        except Exception:
            uptime_out = "Uptime unavailable"
    try:
        with open("/proc/loadavg", "r") as f:
            load_out = f.read().strip()
    except Exception:
        load_out = "Load unavailable"
    return StatusResponse(pm2=pm2_out, disk=disk_out, uptime=uptime_out, load=load_out)


@router.websocket("/ws")
async def ssh_websocket(websocket: WebSocket):
    # Auth check: token must match app session token if one is set
    session_token = getattr(websocket.app.state, "session_token", None)
    if session_token:
        token = websocket.query_params.get("token", "")
        if not token or not _timing_safe_compare(token, session_token):
            await websocket.close(code=1008, reason="Invalid auth token")
            return

    await websocket.accept()
    client: paramiko.SSHClient | None = None
    channel: paramiko.Channel | None = None
    try:
        # Wait for connection params
        msg = await websocket.receive_json()
        host = msg.get("host", "")
        port = int(msg.get("port", 22))
        username = msg.get("username", "")
        password = msg.get("password", "")
        private_key = msg.get("private_key", "")

        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        connect_kwargs = {
            "hostname": host,
            "port": port,
            "username": username,
            "timeout": 10,
        }
        # Auto-use local SSH key for localhost connections
        auto_key_path = "/root/.ssh/id_rsa"
        if not private_key and not password and host in ("localhost", "127.0.0.1"):
            try:
                key = paramiko.RSAKey.from_private_key_file(auto_key_path)
                private_key = "auto"
                connect_kwargs["pkey"] = key
            except Exception:
                pass
        if private_key and private_key != "auto":
            key = paramiko.RSAKey.from_private_key(__import__("io").StringIO(private_key))
            connect_kwargs["pkey"] = key
        elif password:
            connect_kwargs["password"] = password
        elif "pkey" not in connect_kwargs:
            await websocket.send_json({"type": "error", "data": "Нет пароля или ключа"})
            await websocket.close()
            return

        def _connect():
            client.connect(**connect_kwargs)
        await asyncio.get_event_loop().run_in_executor(None, _connect)
        channel = client.invoke_shell(term="xterm-256color")
        # Short prompt: only current dir name, not full path
        channel.send("export PS1=\"\\u@\\h:\\W\\$ \"\n")
        channel.send("cd ~\n")

        loop = asyncio.get_running_loop()
        stdout_queue: asyncio.Queue[str] = asyncio.Queue()

        def _read_ssh():
            while channel and not channel.closed:
                try:
                    if channel.recv_ready():
                        data = channel.recv(4096)
                        if data:
                            try:
                                loop.call_soon_threadsafe(stdout_queue.put_nowait, data.decode("utf-8", errors="replace"))
                            except Exception:
                                pass
                    else:
                        import time
                        time.sleep(0.05)
                except Exception:
                    break

        import threading
        recv_thread = threading.Thread(target=_read_ssh, daemon=True)
        recv_thread.start()

        await websocket.send_json({"type": "connected"})

        while True:
            # Forward stdout from SSH
            try:
                data = stdout_queue.get_nowait()
                await websocket.send_json({"type": "stdout", "data": data})
                continue
            except asyncio.QueueEmpty:
                pass

            # Receive from frontend (with short timeout so we also check stdout)
            try:
                msg = await asyncio.wait_for(websocket.receive_json(), timeout=0.05)
                if msg.get("type") == "stdin" and channel:
                    channel.send(msg.get("data", ""))
                elif msg.get("type") == "resize" and channel:
                    channel.resize_pty(
                        width=msg.get("cols", 80),
                        height=msg.get("rows", 24),
                    )
            except asyncio.TimeoutError:
                pass
    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"type": "error", "data": str(e)})
        except Exception:
            pass
    finally:
        if channel:
            channel.close()
        if client:
            client.close()


def _timing_safe_compare(a: str, b: str) -> bool:
    import hmac
    return hmac.compare_digest(a.encode(), b.encode())
