#!/usr/bin/env python3
"""Run Kimi Web UI from source on port 5500 with network access."""
import sys
sys.path.insert(0, "/var/www/kimi-next/src")

from kimi_cli.web.app import run_web_server

if __name__ == "__main__":
    run_web_server(
        host="0.0.0.0",
        port=5500,
        open_browser=False,
        auth_token=None,
        allowed_origins="",
        dangerously_omit_auth=False,
        restrict_sensitive_apis=False,
        lan_only=False,
        dynamic_auth=True,
    )
