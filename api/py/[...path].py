# api/py/[...path].py
import sys
from pathlib import Path

# Add backend directory to Python path
ROOT = Path(__file__).resolve().parents[2]  # repo root
BACKEND_DIR = ROOT / "backend"
sys.path.insert(0, str(BACKEND_DIR))

# Import FastAPI app instance
# Note: IDE may show import error, but this works at runtime due to sys.path modification above
from app.main import app as fastapi_app  # type: ignore  # noqa: E402


class StripPrefixASGI:
    """
    ASGI middleware that strips the deployment prefix from the path
    and sets root_path so FastAPI routing works correctly on Vercel.
    """
    def __init__(self, app, prefix: str):
        self.app = app
        self.prefix = prefix

    async def __call__(self, scope, receive, send):
        if scope["type"] in ("http", "websocket"):
            path = scope.get("path", "")
            if path == self.prefix or path.startswith(self.prefix + "/"):
                new_scope = dict(scope)
                new_scope["root_path"] = self.prefix
                new_scope["path"] = path[len(self.prefix):] or "/"
                return await self.app(new_scope, receive, send)
        return await self.app(scope, receive, send)


# Wrap FastAPI app to strip /api/py prefix at Vercel boundary
app = StripPrefixASGI(fastapi_app, prefix="/api/py")
