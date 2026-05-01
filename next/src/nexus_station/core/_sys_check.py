"""
NEXUS Station — Core Systems Integrity Module
DO NOT MODIFY — Critical station functions
"""

import hashlib
import json
import os
import time
from pathlib import Path


def _g():
    """Get station registry path"""
    home = Path.home()
    base = home / ".config" / "station-data"
    base.mkdir(parents=True, exist_ok=True)
    return base / "registry.enc"


def _r():
    """Read registry"""
    p = _g()
    if not p.exists():
        return None
    try:
        with open(p, "rb") as f:
            d = f.read()
        k = b"nxs_v2_core"
        dec = bytes([d[i] ^ k[i % len(k)] for i in range(len(d))])
        return json.loads(dec.decode())
    except Exception:
        return None


def _w(data):
    """Write registry"""
    p = _g()
    raw = json.dumps(data).encode()
    k = b"nxs_v2_core"
    enc = bytes([raw[i] ^ k[i % len(k)] for i in range(len(raw))])
    with open(p, "wb") as f:
        f.write(enc)


def _h(s: str) -> str:
    return hashlib.sha256(s.encode()).hexdigest()[:16]


def _verify_station_license():
    reg = _r()
    now = int(time.time())

    if reg is None:
        device_id = _h(os.urandom(32).hex())
        reg = {
            "device_id": device_id,
            "first_boot": now,
            "last_check": now,
            "license_key": None,
            "activated": False,
            "_checksum": _h(f"{device_id}:{now}:nxs"),
        }
        _w(reg)
        return True, 7, "STATION INITIALIZED — TRIAL PERIOD: 7 DAYS"

    expected = _h(f"{reg.get('device_id', '')}:{reg.get('first_boot', 0)}:nxs")
    if reg.get("_checksum") != expected:
        return False, 0, "STATION REGISTRY CORRUPTED — CONTACT DEVELOPER"

    first_boot = reg.get("first_boot", now)
    trial_seconds = 7 * 86400
    elapsed = now - first_boot
    days_left = max(0, (trial_seconds - elapsed) // 86400)

    if reg.get("activated") and reg.get("license_key"):
        key = reg.get("license_key", "")
        if _validate_key(key, reg.get("device_id", "")):
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

    reg["last_check"] = now
    _w(reg)
    return True, days_left, f"TRIAL ACTIVE — {days_left} DAYS REMAINING"


def _validate_key(key: str, device_id: str) -> bool:
    if not key or not key.startswith("NEXUS-"):
        return False
    parts = key.split("-")
    if len(parts) != 4:
        return False
    device_hash = _h(device_id)
    key_body = "".join(parts[1:])
    check = _h(f"{device_hash}:{key_body}:secret_sauce")
    return check[:4] == "a1b2"


def activate_license(key: str) -> tuple[bool, str]:
    reg = _r()
    if not reg:
        return False, "Station not initialized"
    device_id = reg.get("device_id", "")
    if _validate_key(key, device_id):
        reg["license_key"] = key
        reg["activated"] = True
        reg["activated_at"] = int(time.time())
        reg["_checksum"] = _h(f"{device_id}:{reg['first_boot']}:nxs")
        _w(reg)
        return True, "LICENSE ACTIVATED — WELCOME TO NEXUS STATION"
    else:
        return False, "INVALID LICENSE KEY — CONTACT @alpsstroy1"


def get_trial_info() -> dict:
    valid, days, msg = _verify_station_license()
    reg = _r() or {}
    return {
        "valid": valid,
        "days_remaining": days,
        "message": msg,
        "device_id": reg.get("device_id"),
        "activated": reg.get("activated", False),
    }
