# api/py/index.py
import sys
from pathlib import Path

# Add backend directory to Python path
ROOT = Path(__file__).resolve().parents[2]  # repo root
BACKEND_DIR = ROOT / "backend"
sys.path.insert(0, str(BACKEND_DIR))

# Import FastAPI app instance
# Note: IDE may show import error, but this works at runtime due to sys.path modification above
from app.main import app  # type: ignore  # noqa: E402
