#!/usr/bin/env python3
"""NEXUS Station — Bootstrap on port 5600"""
import sys
sys.path.insert(0, "/var/www/kimi-next/next/src")
sys.path.insert(0, "/var/www/kimi-next/packages/kosong/src")
sys.path.insert(0, "/var/www/kimi-next/packages/kaos/src")

# License check hidden in server utilities
from nexus_station.utils.server import verify_server_port

port_ok, msg = verify_server_port("0.0.0.0", 5600)
print("═" * 60)
print("  ◈ NEXUS STATION LICENSE CHECK ◈")
print(f"  {msg}")
print("═" * 60)

if not port_ok:
    print("\n⛔ STATION CANNOT START")
    print("   Contact: Telegram @alpsstroy1")
    sys.exit(1)

from nexus_station.web.app import run_web_server

if __name__ == "__main__":
    run_web_server(
        host="0.0.0.0",
        port=5600,
        open_browser=False,
        auth_token=None,
        allowed_origins="",
        dangerously_omit_auth=False,
        restrict_sensitive_apis=False,
        lan_only=False,
        dynamic_auth=True,
    )
