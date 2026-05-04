#!/usr/bin/env python3
"""NEXUS Station — One-click installer

Usage:
    python3 setup.py           # Interactive mode
    python3 setup.py --auto    # Fully automatic, defaults everywhere
    python3 setup.py --port 5600 --host 0.0.0.0
"""

import argparse
import os
import secrets
import shutil
import subprocess
import sys
import textwrap
from pathlib import Path

ROOT = Path(__file__).resolve().parent
VENV_DIR = ROOT / ".venv"
LOGS_DIR = ROOT / "logs"
ENV_FILE = ROOT / ".env"
ECOSYSTEM_FILE = ROOT / "ecosystem.config.js"

REQUIRED_PYTHON = (3, 12)


def run(cmd, cwd=None, capture=True, check=True):
    """Run a shell command."""
    kwargs = {"cwd": cwd or ROOT, "shell": isinstance(cmd, str)}
    if capture:
        kwargs["capture_output"] = True
        kwargs["text"] = True
    result = subprocess.run(cmd, **kwargs)
    if check and result.returncode != 0:
        print(f"⛔ Command failed: {cmd}")
        if capture and result.stderr:
            print(result.stderr)
        sys.exit(1)
    return result


def has_uv():
    """Check if 'uv' is available in PATH."""
    return shutil.which("uv") is not None


def get_system_python_version():
    """Get system python3 version tuple."""
    try:
        result = run("python3 --version", check=False)
        if result.returncode != 0:
            return None
        parts = result.stdout.strip().split()
        if len(parts) >= 2:
            ver = parts[1].split(".")
            return tuple(int(v) for v in ver[:2])
    except Exception:
        pass
    return None


def print_banner():
    print("═" * 60)
    print("  ◈ NEXUS STATION — INSTALLER ◈")
    print("═" * 60)
    print()


def create_venv(auto=False):
    print("📦 Creating virtual environment...")

    if VENV_DIR.exists():
        if auto:
            print(f"   Found existing {VENV_DIR}, reusing.")
            return
        ans = input(f"   {VENV_DIR} already exists. Recreate? [y/N]: ").strip().lower()
        if ans == "y":
            shutil.rmtree(VENV_DIR)
        else:
            print("   Reusing existing venv.")
            return

    if has_uv():
        print("   Using uv (fast)…")
        run("uv venv .venv")
    else:
        py_ver = get_system_python_version()
        if py_ver and py_ver >= REQUIRED_PYTHON:
            print(f"   Using python3 {py_ver[0]}.{py_ver[1]}…")
            run("python3 -m venv .venv")
        else:
            print("⛔ Python 3.12+ is required.")
            print("   Install uv:  curl -LsSf https://astral.sh/uv/install.sh | sh")
            print("   Or upgrade Python to 3.12+")
            sys.exit(1)

    print("   ✅ Virtual environment created.")


def pip_install(*args):
    """Run pip install inside venv."""
    pip = VENV_DIR / "bin" / "pip"
    if not pip.exists():
        pip = VENV_DIR / "Scripts" / "pip.exe"  # Windows
    run([str(pip), "install", "--upgrade", "pip"])
    run([str(pip), "install"] + list(args))


def uv_install(*args):
    """Run uv pip install."""
    run(["uv", "pip", "install", "--python", str(VENV_DIR / "bin" / "python")] + list(args))


def install_dependencies():
    print("📥 Installing dependencies...")

    if has_uv():
        uv_install("-e", ".")
    else:
        pip_install("-e", ".")

    print("   ✅ Dependencies installed.")


def generate_secret(length=32):
    return secrets.token_urlsafe(length)


def create_env_file(auto=False, port=5600, host="0.0.0.0"):
    print("🔐 Creating environment config...")

    if ENV_FILE.exists() and not auto:
        ans = input(f"   {ENV_FILE} exists. Overwrite? [y/N]: ").strip().lower()
        if ans != "y":
            print("   Keeping existing .env")
            return

    admin_secret = generate_secret(24)
    secret_key = generate_secret(32)

    content = textwrap.dedent(f"""\
        # NEXUS Station Environment
        # Main server runs on port 5600 (run.py)
        # Auth server runs on port 5601 (auth_server/config.py)
        NEXUS_ADMIN_SECRET={admin_secret}
        NEXUS_SECRET_KEY={secret_key}
    """)

    ENV_FILE.write_text(content, encoding="utf-8")
    ENV_FILE.chmod(0o600)
    print(f"   ✅ {ENV_FILE} created (port={port}, host={host}).")


def create_ecosystem_config():
    print("⚙️  Creating PM2 config...")

    interpreter = VENV_DIR / "bin" / "python"
    if not interpreter.exists():
        interpreter = VENV_DIR / "Scripts" / "python.exe"

    config = textwrap.dedent(f"""\
        module.exports = {{
          apps: [
            {{
              name: 'nexus-station',
              script: 'run.py',
              cwd: '{ROOT}',
              interpreter: '{interpreter}',
              watch: false,
              autorestart: true,
              max_memory_restart: '512M',
              restart_delay: 3000,
              env: {{
                PYTHONUNBUFFERED: '1',
                PYTHONNOUSERSITE: '1'
              }},
              error_file: '{LOGS_DIR}/nexus.err.log',
              out_file: '{LOGS_DIR}/nexus.out.log',
              log_date_format: 'YYYY-MM-DD HH:mm:ss',
              merge_logs: true
            }},
            {{
              name: 'nexus-auth',
              script: 'auth_server/run_auth.py',
              cwd: '{ROOT}',
              interpreter: '{interpreter}',
              watch: false,
              autorestart: true,
              max_memory_restart: '256M',
              restart_delay: 2000,
              env: {{ PYTHONUNBUFFERED: '1' }},
              error_file: '{LOGS_DIR}/auth.err.log',
              out_file: '{LOGS_DIR}/auth.out.log',
              log_date_format: 'YYYY-MM-DD HH:mm:ss',
              merge_logs: true
            }}
          ]
        }};
    """)

    ECOSYSTEM_FILE.write_text(config, encoding="utf-8")
    print(f"   ✅ {ECOSYSTEM_FILE} created.")


def ensure_logs_dir():
    LOGS_DIR.mkdir(exist_ok=True)


def print_finish(auto=False, port=5600, host="0.0.0.0"):
    print()
    print("═" * 60)
    print("  ✅ NEXUS STATION INSTALLED SUCCESSFULLY")
    print("═" * 60)
    print()
    print(f"   📁 Directory: {ROOT}")
    print(f"   🌐 URL:       http://{host}:{port}")
    print()
    print("   Quick start:")
    print(f"     cd {ROOT}")
    print("     source .venv/bin/activate")
    print("     python run.py")
    print()
    print("   Or with PM2:")
    print("     pm2 start ecosystem.config.js")
    print("     pm2 save")
    print()
    print("   Default admin login (if auth enabled):")
    print("     Check .env for NEXUS_ADMIN_SECRET")
    print()
    print("═" * 60)


def main():
    parser = argparse.ArgumentParser(description="NEXUS Station Installer")
    parser.add_argument("--auto", action="store_true", help="Fully automatic mode")
    parser.add_argument("--port", default=5600, type=int, help="Server port")
    parser.add_argument("--host", default="0.0.0.0", help="Server host")
    args = parser.parse_args()

    print_banner()
    ensure_logs_dir()
    create_venv(auto=args.auto)
    install_dependencies()
    create_env_file(auto=args.auto, port=args.port, host=args.host)
    create_ecosystem_config()
    print_finish(auto=args.auto, port=args.port, host=args.host)


if __name__ == "__main__":
    main()
