#!/usr/bin/env python3
"""Benchmark LLM API latency from this server.

Measures DNS resolve time and TTFB (Time To First Byte) for popular LLM API endpoints.
"""

import asyncio
import socket
import time
from dataclasses import dataclass
from urllib.parse import urlparse

import aiohttp


@dataclass
class BenchmarkResult:
    name: str
    url: str
    dns_ms: float
    ttfb_ms: float
    total_ms: float
    status: int
    error: str | None = None


async def benchmark_endpoint(
    name: str,
    url: str,
    session: aiohttp.ClientSession,
) -> BenchmarkResult:
    """Benchmark a single endpoint."""
    start = time.perf_counter()
    dns_ms = ttfb_ms = 0.0
    status = 0
    error = None

    try:
        parsed = urlparse(url)
        host = parsed.hostname
        if not host:
            raise ValueError(f"Could not parse hostname from {url}")
        port = parsed.port or (443 if parsed.scheme == "https" else 80)

        # DNS resolve
        dns_start = time.perf_counter()
        loop = asyncio.get_running_loop()
        addrinfo = await loop.getaddrinfo(host, port, type=socket.SOCK_STREAM)
        dns_ms = (time.perf_counter() - dns_start) * 1000

        if not addrinfo:
            raise OSError(f"Could not resolve {host}")

        # HTTP GET with fresh connection
        req_start = time.perf_counter()
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as resp:
            first_byte = time.perf_counter()
            ttfb_ms = (first_byte - req_start) * 1000
            status = resp.status
            await resp.read()

    except Exception as e:
        error = f"{e.__class__.__name__}: {e}"

    total_ms = (time.perf_counter() - start) * 1000
    return BenchmarkResult(
        name=name,
        url=url,
        dns_ms=dns_ms,
        ttfb_ms=ttfb_ms,
        total_ms=total_ms,
        status=status,
        error=error,
    )


ENDPOINTS = [
    ("Moonshot (intl)", "https://api.moonshot.ai/v1/models"),
    ("Moonshot (CN)", "https://api.moonshot.cn/v1/models"),
    ("OpenRouter", "https://openrouter.ai/api/v1/models"),
    ("DeepSeek", "https://api.deepseek.com/models"),
    ("Groq", "https://api.groq.com/openai/v1/models"),
    ("OpenAI", "https://api.openai.com/v1/models"),
    ("Anthropic", "https://api.anthropic.com/v1/models"),
]


async def main() -> None:
    print("=" * 70)
    print("LLM API Latency Benchmark")
    print(f"Timestamp: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)

    # force_close=True ensures each request opens a new TCP connection
    connector = aiohttp.TCPConnector(limit=10, force_close=True)
    async with aiohttp.ClientSession(connector=connector) as session:
        tasks = [benchmark_endpoint(name, url, session) for name, url in ENDPOINTS]
        results = await asyncio.gather(*tasks)

    print(f"\n{'Provider':<20} {'DNS':>8} {'TTFB':>10} {'Total':>10} {'Status':>8} {'Error'}")
    print("-" * 80)
    for r in results:
        if r.error:
            print(f"{r.name:<20} {'—':>8} {'—':>10} {'—':>10} {'—':>8} {r.error}")
        else:
            print(
                f"{r.name:<20} {r.dns_ms:>7.1f}ms {r.ttfb_ms:>9.1f}ms "
                f"{r.total_ms:>9.1f}ms {r.status:>8}"
            )

    print("\n" + "=" * 70)
    print("Notes:")
    print("  • DNS  = Time to resolve hostname")
    print("  • TTFB = Time To First Byte (DNS + TCP + TLS + server processing)")
    print("  • Total = DNS + full HTTP response download")
    print("  • 401/403 without auth key is OK — latency still valid")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(main())
