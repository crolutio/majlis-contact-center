import asyncio
import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

from langgraph.prebuilt import ToolNode
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_mcp_adapters.tools import load_mcp_tools

logger = logging.getLogger(__name__)

_MODULE_DIR = Path(__file__).resolve().parent

DEFAULT_SERVER_NAME = "supabase"

# Module-level cached state (single server)
_client: Optional[MultiServerMCPClient] = None
_session_cm: Optional[Any] = None
_session: Optional[Any] = None
_tools: Optional[List[Any]] = None
_tool_node: Optional[ToolNode] = None
_init_lock = asyncio.Lock()


def load_mcp_servers(config_path: str | None = None) -> Dict[str, Any]:
    """
    Load MCP server definitions from a JSON config file.
    Expects a top-level 'mcpServers' dict in the config.

    Also injects Authorization header for supabase server entries:
    - Prefer SUPABASE_ACCESS_TOKEN (PAT)
    - Fall back to existing config Authorization header (if present)
    - Finally fall back to SUPABASE_ANON_KEY (last resort; usually not enough for hosted MCP)
    """
    if config_path is None:
        config_path = str(_MODULE_DIR / "mcp.json")

    if not os.path.exists(config_path):
        raise FileNotFoundError(f"MCP config file not found: {config_path}")

    with open(config_path, "r", encoding="utf-8") as f:
        config = json.load(f)

    servers = config.get("mcpServers", {})

    supabase_pat = os.getenv("SUPABASE_ACCESS_TOKEN")

    for name, server in servers.items():
        # If server uses a local command, default to stdio transport.
        if "command" in server and "transport" not in server:
            server["transport"] = "stdio"

        # If server uses a URL, default to streamable_http transport.
        if "url" in server and "transport" not in server:
            server["transport"] = "streamable_http"

        # Add headers if this is an HTTP-based MCP server.
        if "url" in server:
            server.setdefault("headers", {})

            # Only inject auth for supabase entries
            if "supabase" in name.lower():
                if not supabase_pat:
                    raise RuntimeError(
                        "SUPABASE_ACCESS_TOKEN is required for MCP Supabase access."
                    )
                server["headers"]["Authorization"] = f"Bearer {supabase_pat}"

    return servers


async def init_mcp(server_name: str | None = None) -> None:
    """
    Initialize MCP once per process:
    - Create MultiServerMCPClient
    - Open a persistent session to the given server_name
    - Load tools from that session
    - Build a ToolNode from those tools
    """
    global _client, _session_cm, _session, _tools, _tool_node
    resolved_name = server_name or DEFAULT_SERVER_NAME

    async with _init_lock:
        if _tool_node is not None:
            return

        mcp_servers = load_mcp_servers()
        _client = MultiServerMCPClient(mcp_servers)

        # Open a single long-lived session and keep it open.
        _session_cm = _client.session(resolved_name)
        _session = await _session_cm.__aenter__()

        # Load tools bound to the persistent session.
        _tools = await load_mcp_tools(_session)

        # ToolNode is what LangGraph uses to execute tool calls
        _tool_node = ToolNode(_tools, handle_tool_errors=True)

        logger.info("MCP initialized with persistent session (server=%s)", resolved_name)


async def shutdown_mcp() -> None:
    """
    Close the persistent MCP session and clear caches.
    Call once at application shutdown.
    """
    global _client, _session_cm, _session, _tools, _tool_node

    async with _init_lock:
        if _session_cm is not None:
            try:
                await _session_cm.__aexit__(None, None, None)
            except (RuntimeError, GeneratorExit, Exception) as exc:
                logger.debug(
                    "MCP session cleanup warning (non-critical): %s: %s",
                    type(exc).__name__,
                    exc,
                )
            finally:
                _session_cm = None
                _session = None
                _tools = None
                _tool_node = None

        _client = None

        logger.info("MCP shutdown complete")


async def get_mcp_tools() -> List[Any]:
    """Get cached tools; lazily initializes MCP if needed."""
    if _tools is None:
        await init_mcp()

    # Only expose the two tools we want to use
    tools = _tools or []
    filtered_tools = [
        tool for tool in tools if tool.name in ["execute_sql", "list_tables"]
    ]
    return filtered_tools


def get_mcp_tools_sync() -> List[Any]:
    """
    Synchronous version of get_mcp_tools().
    Use this in synchronous contexts.
    """
    if _tools is not None:
        return [tool for tool in _tools if tool.name in ["execute_sql", "list_tables"]]

    try:
        loop = asyncio.get_running_loop()
        raise RuntimeError(
            "Cannot use get_mcp_tools_sync() in an async context. "
            "Use await get_mcp_tools() instead."
        )
    except RuntimeError as exc:
        if "Cannot use get_mcp_tools_sync" in str(exc):
            raise

    asyncio.run(init_mcp())
    tools = _tools or []
    return [tool for tool in tools if tool.name in ["execute_sql", "list_tables"]]


async def get_mcp_tool_node() -> ToolNode:
    """Get cached ToolNode; lazily initializes MCP if needed."""
    if _tool_node is None:
        await init_mcp()
    return _tool_node
