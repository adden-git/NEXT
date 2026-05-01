#!/usr/bin/env python3
"""
NEXUS Station — Bootstrap Sequence
Run: python run.py
"""

import os
import sys
import subprocess
from pathlib import Path

STATION_ROOT = Path(__file__).parent
os.chdir(STATION_ROOT)

# Add src to path
sys.path.insert(0, str(STATION_ROOT / "src"))

def check_deps():
    """Verify critical systems are online"""
    try:
        import fastapi
        import uvicorn
        import pydantic
        print("✓ Core systems verified")
        return True
    except ImportError as e:
        print(f"✗ Missing dependency: {e}")
        print("  Install: pip install fastapi uvicorn pydantic")
        return False

def main():
    print("═" * 60)
    print("  ◈ NEXUS STATION BOOT SEQUENCE ◈")
    print("  Neural EXecution Universal System v2.0.0")
    print("═" * 60)

    if not check_deps():
        sys.exit(1)

    print("\n  Initializing subsystems...")
    print("  ├── Web Interface ......... ONLINE")
    print("  ├── Comms Channel ......... ONLINE")
    print("  ├── Session Manager ....... ONLINE")
    print("  └── Provider Router ....... STANDBY")
    print("\n  🚀 Launching on http://0.0.0.0:5600")
    print("═" * 60)

    from nexus_core.web.main import app
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=5600,
        log_level="info",
        access_log=True,
    )

if __name__ == "__main__":
    main()
