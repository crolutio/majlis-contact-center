import sys
from pathlib import Path

# Ensure backend directory is on sys.path before imports so `app` package resolves
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.routes.health import router as health_router
from app.routes.chat import router as chat_router
from app.routes.utils import init_logging
from app.infra.mcp_supabase import shutdown_mcp, get_mcp_tools
import uvicorn

from langchain_groq import ChatGroq
from langchain_anthropic import ChatAnthropic
import os
from app.agents.banking_agent.graphbuilder import BankingAgentGraphBuilder


# llm = ChatAnthropic(
#      model="claude-sonnet-4-5-20250929",
#      api_key=os.getenv("CLAUDE_API_KEY"),
# )

llm = ChatGroq(
   model="moonshotai/kimi-k2-instruct-0905",
   api_key=os.getenv("GROQ_API_KEY"),
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for FastAPI app lifecycle.
    Startup:
    - Open ONE persistent MCP session
    - Load MCP tools bound to that session
    - Filter to only execute_sql and list_tables
    - Store filtered tools and ToolNode in app.state

    Shutdown:
    - Close the persistent MCP session
    """
    init_logging()

    # Single MCP server (supabase), filtered to execute_sql and list_tables
    app.state.mcp_tools = await get_mcp_tools() 

    app.state.llm = llm

    app.state.banking_agent_graph = BankingAgentGraphBuilder(llm, app.state.mcp_tools).build_graph()

    yield

    try:
        await shutdown_mcp()
    except Exception:
        pass


app = FastAPI(title="Support API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, tags=["health"])
app.include_router(chat_router, tags=["chat"])

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)
