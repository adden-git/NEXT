"""
NEXUS Station — Mission Control API
FastAPI backend for the Neural EXecution Universal System
"""

import asyncio
import json
import uuid
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from typing import Any, AsyncGenerator

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

# ─── CONFIG ───
STATION_CONFIG = {
    "name": "NEXUS STATION",
    "version": "2.0.0",
    "codename": "NEXT",
    "max_sessions": 100,
    "providers": ["openai", "anthropic", "google", "fireworks", "local"],
}

WEB_ROOT = Path(__file__).parent.parent.parent.parent / "web"

# ─── MODELS ───
class ProviderConfig(BaseModel):
    name: str
    type: str
    base_url: str | None = None
    api_key: str | None = None
    models: list[str] = Field(default_factory=list)


class ModelParams(BaseModel):
    temperature: float = 0.7
    top_p: float = 0.9
    max_tokens: int = 4096
    thinking_keep: int | None = None


class ShieldSettings(BaseModel):
    enabled: bool = False
    model: str | None = None


class SessionState(BaseModel):
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    provider: str | None = None
    model_params: ModelParams = Field(default_factory=ModelParams)
    shield: ShieldSettings = Field(default_factory=ShieldSettings)
    messages: list[dict[str, Any]] = Field(default_factory=list)
    status: str = "idle"


class TransmitRequest(BaseModel):
    text: str
    session_id: str | None = None


class TransmitResponse(BaseModel):
    message_id: str
    session_id: str
    text: str
    status: str
    timestamp: str


# ─── SESSION STORE ───
class SessionStore:
    def __init__(self):
        self._sessions: dict[str, SessionState] = {}

    def create(self) -> SessionState:
        session = SessionState()
        self._sessions[session.session_id] = session
        return session

    def get(self, session_id: str) -> SessionState | None:
        return self._sessions.get(session_id)

    def update(self, session: SessionState) -> None:
        self._sessions[session.session_id] = session

    def list_all(self) -> list[SessionState]:
        return list(self._sessions.values())

    def delete(self, session_id: str) -> bool:
        if session_id in self._sessions:
            del self._sessions[session_id]
            return True
        return False


store = SessionStore()


# ─── APP LIFESPAN ───
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    print("═" * 60)
    print("  ◈ NEXUS STATION BOOT SEQUENCE INITIATED ◈")
    print(f"  Version: {STATION_CONFIG['version']}")
    print(f"  Codename: {STATION_CONFIG['codename']}")
    print("  All systems nominal.")
    print("═" * 60)
    yield
    print("═" * 60)
    print("  ◈ NEXUS STATION SHUTDOWN SEQUENCE COMPLETE ◈")
    print("═" * 60)


# ─── FASTAPI APP ───
app = FastAPI(
    title="NEXUS Station API",
    description="Neural EXecution Universal System — Mission Control Interface",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
if WEB_ROOT.exists():
    app.mount("/static", StaticFiles(directory=str(WEB_ROOT)), name="static")


# ─── ROUTES ───
@app.get("/", response_class=HTMLResponse)
async def root():
    """Serve the NEXUS Station interface"""
    index_path = WEB_ROOT / "index.html"
    if index_path.exists():
        return FileResponse(str(index_path))
    return HTMLResponse("<h1>NEXUS STATION</h1><p>Interface not found. Please build the web app.</p>")


@app.get("/api/status")
async def status() -> dict[str, Any]:
    """Station status report"""
    return {
        "station": STATION_CONFIG["name"],
        "version": STATION_CONFIG["version"],
        "codename": STATION_CONFIG["codename"],
        "status": "online",
        "timestamp": datetime.utcnow().isoformat(),
        "active_sessions": len(store.list_all()),
        "max_sessions": STATION_CONFIG["max_sessions"],
        "providers_available": STATION_CONFIG["providers"],
    }


@app.get("/api/providers")
async def list_providers() -> dict[str, Any]:
    """List available LLM providers"""
    return {
        "providers": {
            "openai": {
                "name": "OpenAI",
                "models": ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"],
                "requires_key": True,
            },
            "anthropic": {
                "name": "Anthropic",
                "models": ["claude-3-5-sonnet", "claude-3-opus", "claude-3-haiku"],
                "requires_key": True,
            },
            "google": {
                "name": "Google",
                "models": ["gemini-1.5-pro", "gemini-1.5-flash"],
                "requires_key": True,
            },
            "fireworks": {
                "name": "Fireworks AI",
                "models": ["llama-v3p1-8b", "llama-v3p1-70b", "qwen2p5-7b"],
                "requires_key": True,
            },
            "local": {
                "name": "Local (Ollama)",
                "models": ["llama3", "codellama", "mistral"],
                "requires_key": False,
            },
        }
    }


@app.post("/api/sessions")
async def create_session() -> SessionState:
    """Initialize new mission session"""
    session = store.create()
    print(f"[NEXUS] New session established: {session.session_id}")
    return session


@app.get("/api/sessions")
async def list_sessions() -> list[SessionState]:
    """List all active sessions"""
    return store.list_all()


@app.get("/api/sessions/{session_id}")
async def get_session(session_id: str) -> SessionState | dict[str, str]:
    """Get session details"""
    session = store.get(session_id)
    if not session:
        return {"error": "Session not found"}
    return session


@app.put("/api/sessions/{session_id}")
async def update_session(session_id: str, state: SessionState) -> SessionState | dict[str, str]:
    """Update session configuration"""
    existing = store.get(session_id)
    if not existing:
        return {"error": "Session not found"}
    store.update(state)
    return state


@app.delete("/api/sessions/{session_id}")
async def delete_session(session_id: str) -> dict[str, str]:
    """Terminate session"""
    if store.delete(session_id):
        return {"status": "terminated", "session_id": session_id}
    return {"error": "Session not found"}


@app.post("/api/transmit")
async def transmit(request: TransmitRequest) -> TransmitResponse:
    """Transmit message to AI engine"""
    session_id = request.session_id or store.create().session_id
    session = store.get(session_id)
    if not session:
        session = store.create()
        session_id = session.session_id

    message_id = str(uuid.uuid4())
    timestamp = datetime.utcnow().isoformat()

    session.messages.append({
        "id": message_id,
        "role": "user",
        "content": request.text,
        "timestamp": timestamp,
    })
    store.update(session)

    return TransmitResponse(
        message_id=message_id,
        session_id=session_id,
        text=request.text,
        status="received",
        timestamp=timestamp,
    )


# ─── WEBSOCKET ───
@app.websocket("/api/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """Real-time comms channel"""
    await websocket.accept()
    session = store.get(session_id) or store.create()

    await websocket.send_json({
        "type": "connected",
        "station": STATION_CONFIG["name"],
        "session_id": session.session_id,
        "message": "NEXUS Station comms channel established.",
    })

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type", "unknown")

            if msg_type == "transmit":
                text = data.get("text", "")
                session.messages.append({
                    "role": "user",
                    "content": text,
                    "timestamp": datetime.utcnow().isoformat(),
                })
                store.update(session)

                await websocket.send_json({
                    "type": "response",
                    "role": "ai",
                    "content": f"NEXUS received transmission: {text}",
                    "timestamp": datetime.utcnow().isoformat(),
                })

            elif msg_type == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        print(f"[NEXUS] Session disconnected: {session_id}")
    except Exception as e:
        print(f"[NEXUS] Comms error: {e}")


# ─── MAIN ───
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5600)
