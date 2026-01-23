from supabase import create_client, Client
import base64
import json
import logging
from app.core.config import settings

_supabase: Client | None = None
_logger = logging.getLogger("supabase_client")


def _get_key_role(key: str) -> str | None:
    """Best-effort decode of Supabase JWT role claim."""
    try:
        parts = key.split(".")
        if len(parts) < 2:
            return None
        payload = parts[1]
        padding = "=" * (-len(payload) % 4)
        payload_bytes = base64.urlsafe_b64decode(payload + padding)
        data = json.loads(payload_bytes.decode("utf-8"))
        return data.get("role")
    except Exception:
        return None

def supabase() -> Client:
    global _supabase
    if _supabase is None:
        service_key = settings.supabase_service_role_key
        role = _get_key_role(service_key)
        if role and role != "service_role":
            _logger.warning(
                "Supabase key role is %s; inserts into conversations may fail. "
                "Ensure SUPABASE_SERVICE_ROLE_KEY is set to the service role key.",
                role,
            )
        _supabase = create_client(settings.supabase_url, service_key)
    return _supabase
