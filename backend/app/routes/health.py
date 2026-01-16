from fastapi import APIRouter
from app.infra.supabase_client import supabase

router = APIRouter()

@router.get("/health")
def health():
    return {"status": "ok"}

@router.get("/health/db")
def health_db():
    try:
        # lightweight connectivity check
        supabase().table("customers").select("id").limit(1).execute()
        return {"status": "ok", "db": "ok"}
    except Exception as e:
        # demo-friendly: return JSON instead of raising
        return {"status": "degraded", "db": "error", "detail": str(e)}
