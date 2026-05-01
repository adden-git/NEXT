def acp_main() -> None:
    """Entry point for the multi-session ACP server."""
    import asyncio

    import acp

    from nexus_station.acp.server import ACPServer
    from nexus_station.app import enable_logging
    from nexus_station.utils.logging import logger

    enable_logging()
    logger.info("Starting ACP server on stdio")
    asyncio.run(acp.run_agent(ACPServer(), use_unstable_protocol=True))
