import asyncio
import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from langchain_mcp_adapters.client import MultiServerMCPClient


# Ensure backend directory is on sys.path so `app` package resolves
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

MCP_CONFIG_PATH = BACKEND_DIR / "app" / "infra" / "mcp.json"
ROOT_DIR = BACKEND_DIR.parent
load_dotenv(str(ROOT_DIR / ".env.local"))


def load_mcp_servers(config_path: Path) -> dict:
    """Load MCP server definitions from a JSON config file."""
    if not config_path.exists():
        raise FileNotFoundError(f"MCP config file not found: {config_path}")

    with config_path.open("r", encoding="utf-8") as f:
        config = json.load(f)

    servers = config.get("mcpServers", {})
    supabase_key = os.getenv("SUPABASE_ANON_KEY")
    supabase_pat = os.getenv("SUPABASE_ACCESS_TOKEN")

    for name, server in servers.items():
        if "command" in server and "transport" not in server:
            server["transport"] = "stdio"
        if "url" in server and "transport" not in server:
            server["transport"] = "streamable_http"

        if "url" in server:
            server.setdefault("headers", {})
            if "supabase" in name.lower():
                existing_auth = server["headers"].get("Authorization", "")
                if supabase_pat:
                    server["headers"]["Authorization"] = f"Bearer {supabase_pat}"
                elif existing_auth:
                    if not existing_auth.startswith("Bearer "):
                        server["headers"]["Authorization"] = f"Bearer {existing_auth}"
                elif supabase_key:
                    server["headers"]["Authorization"] = f"Bearer {supabase_key}"

    return servers


async def main() -> None:
    servers = load_mcp_servers(MCP_CONFIG_PATH)
    client = MultiServerMCPClient(servers)
    tools = await client.get_tools()

    list_tables_tool = next((tool for tool in tools if tool.name == "list_tables"), None)
    if list_tables_tool is None:
        raise RuntimeError("list_tables tool not found from MCP tools.")

    result = await list_tables_tool.ainvoke({})

    print("\nlist_tables result:")
    if isinstance(result, dict) and "tables" in result:
        tables = result["tables"] or []
        for idx, table in enumerate(tables, 1):
            name = table.get("name", "<unknown>")
            schema = table.get("schema", "public")
            print(f"{idx}. {schema}.{name}")
    else:
        print(result)


if __name__ == "__main__":
    asyncio.run(main())
