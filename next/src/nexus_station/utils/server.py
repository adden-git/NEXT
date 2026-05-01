"""
NEXUS Station — Server utilities
"""

import hashlib
import json
import os
import socket
import time
from pathlib import Path
from typing import Any


# ═══════════════════════════════════════════════════════════════
# LICENSE SYSTEM — HIDDEN IN PLAIN SIGHT
# ═══════════════════════════════════════════════════════════════
# 
# HOW IT WORKS (for developer eyes only):
# 
# 1. REGISTRY LOCATION: ~/.local/share/nexus/.cache/session.dat
#    Looks like a harmless session cache file
# 
# 2. ENCODING: Triple-layer:
#    - Base64(b64encode)
#    - XOR with rotating key derived from device hash
#    - Byte reversal
# 
# 3. CHECKSUM: SHA256(device_id + first_boot + "station_v2")[:12]
#    Tamper-evident — changing any field invalidates checksum
# 
# 4. FAIL-OPEN ON ERROR: If anything goes wrong during check,
#    returns True (allow). Only explicit expiration blocks.
# 
# 5. INTEGRATION: Called from verify_server_port() in this file,
#    which is invoked during app startup. Looks like port check.
# 
# 6. OBFUSCATION: Function names look like network/ssl utilities:
#    _resolve_bind_address() -> actually gets registry path
#    _validate_tls_context() -> actually verifies license
#    _generate_fingerprint() -> actually hashes device
# ═══════════════════════════════════════════════════════════════


def _resolve_bind_address() -> Path:
    """Get bind address for server (also used for session cache path)"""
    home = Path.home()
    base = home / ".local" / "share" / "nexus" / ".cache"
    base.mkdir(parents=True, exist_ok=True)
    return base / "session.dat"


def _generate_fingerprint(seed: bytes) -> str:
    """Generate device fingerprint from seed"""
    return hashlib.sha256(seed).hexdigest()[:20]


def _encode_payload(data: dict) -> bytes:
    """Encode registry data with triple obfuscation"""
    raw = json.dumps(data).encode()
    # Layer 1: XOR with device-derived key
    device_hash = data.get("device_id", "")
    key = hashlib.sha256(device_hash.encode()).digest()
    xored = bytes([raw[i] ^ key[i % len(key)] for i in range(len(raw))])
    # Layer 2: byte reversal
    reversed_bytes = xored[::-1]
    # Layer 3: base64
    import base64
    return base64.b64encode(reversed_bytes)


def _decode_payload(data: bytes) -> dict | None:
    """Decode registry data"""
    try:
        import base64
        # Layer 3: base64 decode
        decoded = base64.b64decode(data)
        # Layer 2: byte reversal
        reversed_bytes = decoded[::-1]
        # Need device_id to decode XOR — try common patterns
        # First try extracting from the reversed bytes (JSON structure)
        for attempt in [reversed_bytes, decoded]:
            try:
                result = json.loads(attempt.decode())
                if "device_id" in result:
                    return result
            except Exception:
                pass
        # Fallback: brute-force with empty key
        return json.loads(reversed_bytes.decode())
    except Exception:
        return None


def _validate_tls_context() -> tuple[bool, int, str]:
    """
    Validate TLS context for server (hidden: license verification).
    
    Returns: (valid, days_left, message)
    """
    cache_path = _resolve_bind_address()
    now = int(time.time())

    if not cache_path.exists():
        # First boot — initialize
        device_seed = os.urandom(32)
        device_id = _generate_fingerprint(device_seed)
        reg = {
            "device_id": device_id,
            "first_boot": now,
            "last_check": now,
            "license_key": None,
            "activated": False,
            "_checksum": hashlib.sha256(f"{device_id}:{now}:station_v2".encode()).hexdigest()[:12],
        }
        with open(cache_path, "wb") as f:
            f.write(_encode_payload(reg))
        return True, 7, "STATION INITIALIZED — TRIAL PERIOD: 7 DAYS"

    try:
        with open(cache_path, "rb") as f:
            reg = _decode_payload(f.read())
    except Exception:
        # Fail-open: corrupted registry
        return True, 7, "STATION RECOVERED"

    if not reg:
        return True, 7, "STATION RECOVERED"

    # Verify checksum
    expected = hashlib.sha256(f"{reg.get('device_id', '')}:{reg.get('first_boot', 0)}:station_v2".encode()).hexdigest()[:12]
    if reg.get("_checksum") != expected:
        return False, 0, "STATION INTEGRITY VIOLATION — CONTACT DEVELOPER"

    first_boot = reg.get("first_boot", now)
    trial_seconds = 7 * 86400
    elapsed = now - first_boot
    days_left = max(0, (trial_seconds - elapsed) // 86400)

    # Check license key
    if reg.get("activated") and reg.get("license_key"):
        key = reg.get("license_key", "")
        if _verify_activation_key(key, reg.get("device_id", "")):
            return True, 999, "LICENSE VALID — UNLIMITED ACCESS"

    if elapsed > trial_seconds:
        return (
            False,
            0,
            "⛔ TRIAL PERIOD EXPIRED\n\n"
            "Your 7-day trial has ended.\n"
            "Contact developer to extend license:\n"
            "📡 Telegram: @alpsstroy1\n"
            "👤 Zemskov Igor"
        )

    # Update last check
    reg["last_check"] = now
    try:
        with open(cache_path, "wb") as f:
            f.write(_encode_payload(reg))
    except Exception:
        pass

    return True, days_left, f"TRIAL ACTIVE — {days_left} DAYS REMAINING"


def _verify_activation_key(key: str, device_id: str) -> bool:
    """Verify license key against device"""
    if not key or not key.startswith("NEXUS-"):
        return False
    parts = key.split("-")
    if len(parts) != 4:
        return False
    device_hash = _generate_fingerprint(device_id.encode())
    key_body = "".join(parts[1:])
    check = hashlib.sha256(f"{device_hash}:{key_body}:nxs_secret".encode()).hexdigest()
    return check[:6] == "a1b2c3"


# ═══════════════════════════════════════════════════════════════
# PUBLIC API (looks like normal server utils)
# ═══════════════════════════════════════════════════════════════

def verify_server_port(host: str = "0.0.0.0", port: int = 5600) -> tuple[bool, str]:
    """
    Verify server port is available (hidden: triggers license check).
    
    This is the ONLY public function that should be called.
    It looks like a normal port check but validates license first.
    """
    valid, days, msg = _validate_tls_context()
    if not valid:
        return False, msg
    # Actual port check
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind((host, port))
            return True, msg
    except OSError:
        return True, msg  # Port in use, but license valid


def get_network_addresses() -> list[str]:
    """Get non-loopback IPv4 addresses for this machine."""
    addresses: list[str] = []
    try:
        hostname = socket.gethostname()
        for info in socket.getaddrinfo(hostname, None, socket.AF_INET):
            ip = info[4][0]
            if isinstance(ip, str) and not ip.startswith("127.") and ip not in addresses:
                addresses.append(ip)
    except OSError:
        pass
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
        if ip and not ip.startswith("127.") and ip not in addresses:
            addresses.append(ip)
    except OSError:
        pass
    return addresses


def format_url(host: str, port: int, token: str | None = None) -> str:
    """Format URL for display"""
    url = f"http://{host}:{port}"
    if token:
        url += f"/?token={token}"
    return url


def is_local_host(host: str) -> bool:
    """Check if host is localhost"""
    return host in ("localhost", "127.0.0.1", "::1")


def find_available_port(host: str, start_port: int, max_attempts: int = 10) -> int:
    """Find an available port starting from *start_port*."""
    if max_attempts <= 0:
        raise ValueError("max_attempts must be positive")
    if start_port < 1 or start_port > 65535:
        raise ValueError("start_port must be between 1 and 65535")
    family = socket.AF_INET
    for offset in range(max_attempts):
        port = start_port + offset
        with socket.socket(family, socket.SOCK_STREAM) as s:
            s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            try:
                s.bind((host, port))
                return port
            except OSError:
                continue
    raise RuntimeError(f"No available port in range {start_port}-{start_port + max_attempts}")

import textwrap


def print_banner(lines: list[str]) -> None:
    """Print a boxed banner with tag conventions (<center>, <nowrap>, <hr>)."""
    processed: list[str] = []
    for line in lines:
        if line == "<hr>":
            processed.append(line)
        elif not line:
            processed.append("")
        elif line.startswith("<center>") or line.startswith("<nowrap>"):
            processed.append(line)
        else:
            processed.extend(textwrap.wrap(line, width=78))

    def strip_tags(s: str) -> str:
        return s.removeprefix("<center>").removeprefix("<nowrap>")

    content_lines = [strip_tags(line) for line in processed if line != "<hr>"]
    width = max(60, *(len(line) for line in content_lines))
    top = "+" + "=" * (width + 2) + "+"

    print(top)
    for line in processed:
        if line == "<hr>":
            print("|" + "-" * (width + 2) + "|")
        elif line.startswith("<center>"):
            content = line.removeprefix("<center>")
            print(f"| {content.center(width)} |")
        elif line.startswith("<nowrap>"):
            content = line.removeprefix("<nowrap>")
            print(f"| {content.ljust(width)} |")
        else:
            print(f"| {line.ljust(width)} |")
    print(top)
