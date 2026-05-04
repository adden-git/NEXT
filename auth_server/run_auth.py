"""Run the NEXUS Auth Server."""

from __future__ import annotations

import sys
import os

# Add parent to path so we can import auth_server
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import uvicorn
from auth_server.config import settings

if __name__ == "__main__":
    print(f"Starting NEXUS Auth Server on {settings.host}:{settings.port}")
    print(f"Database: {settings.database_url}")
    print(f"Admin secret: {settings.admin_secret[:8]}...")
    uvicorn.run(
        "auth_server.main:app",
        host=settings.host,
        port=settings.port,
        reload=False,
        log_level="info",
    )
