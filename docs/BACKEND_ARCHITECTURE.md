# Backend Architecture - FastAPI Support API

This document explains the backend file structure and code implementation for the FastAPI-based Support API that handles chat conversations and messages.

## File Structure

```
backend/
├── .env                    # Environment variables (not in repo)
├── .env.example            # Template for environment variables
├── pyproject.toml          # Python project configuration
├── requirements.txt        # Python dependencies
└── app/
    ├── __init__.py         # Package marker
    ├── main.py             # FastAPI application entry point
    ├── core/
    │   ├── __init__.py     # Package marker
    │   └── config.py       # Environment configuration & settings
    ├── infra/
    │   ├── __init__.py     # Package marker
    │   └── supabase_client.py  # Supabase client singleton
    └── routes/
        ├── __init__.py     # Package marker
        ├── health.py       # Health check endpoints
        └── chat.py         # Chat/conversation endpoints
```

---

## File-by-File Breakdown

### 1. `backend/app/main.py` - FastAPI Application Entry Point

**Purpose:** Creates and configures the FastAPI application, registers middleware, and includes route routers.

**Code Explanation:**

```python
import sys
from pathlib import Path

# Ensure backend directory is on sys.path before imports so `app` package resolves
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
```

- **Path Setup:** Adds the `backend` directory to Python's module search path. This ensures that when running from the `app/` directory, imports like `from app.core.config import settings` work correctly.

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routes.health import router as health_router
from app.routes.chat import router as chat_router
import uvicorn

app = FastAPI(title="Support API")
```

- **FastAPI App:** Creates the main FastAPI application instance with title "Support API".
- **Imports:** Imports CORS middleware, settings, and route routers.

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

- **CORS Configuration:** Adds Cross-Origin Resource Sharing middleware to allow frontend requests from configured origins. Uses `settings.cors_origin_list` which is parsed from the `CORS_ORIGINS` environment variable.

```python
app.include_router(health_router, prefix="/api", tags=["health"])
app.include_router(chat_router, prefix="/api", tags=["chat"])
```

- **Route Registration:** Includes the health and chat routers under the `/api` prefix. All endpoints will be accessible at `/api/...`.

```python
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)
```

- **Development Server:** Allows running the server directly with `python app/main.py`. Uses uvicorn ASGI server.

---

### 2. `backend/app/core/config.py` - Environment Configuration

**Purpose:** Loads and validates environment variables using Pydantic Settings, ensuring required configuration is present.

**Code Explanation:**

```python
from pydantic_settings import BaseSettings
from pydantic import Field
from pathlib import Path
from dotenv import load_dotenv

# Get the backend directory (parent of app/)
BACKEND_DIR = Path(__file__).parent.parent.parent.resolve()
ENV_FILE = BACKEND_DIR / ".env"

# Explicitly load .env file before Settings initialization
load_dotenv(ENV_FILE)
```

- **Path Resolution:** Calculates the absolute path to the `backend/` directory and locates the `.env` file there. This ensures the `.env` file is found regardless of where the script is run from.
- **Explicit Loading:** Uses `python-dotenv` to explicitly load environment variables before Pydantic Settings reads them. This prevents issues with BOM characters or encoding problems.

```python
class Settings(BaseSettings):
    supabase_url: str = Field(..., alias="SUPABASE_URL")
    supabase_service_role_key: str = Field(..., alias="SUPABASE_SERVICE_ROLE_KEY")
    cors_origins: str = Field("http://localhost:3000", alias="CORS_ORIGINS")
```

- **Settings Class:** Defines required and optional environment variables:
  - `supabase_url`: Required Supabase project URL
  - `supabase_service_role_key`: Required service role key (backend-only, never exposed to frontend)
  - `cors_origins`: Optional, defaults to `http://localhost:3000`

```python
    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]
```

- **CORS List Parser:** Converts comma-separated CORS origins string into a list, trimming whitespace and filtering empty values.

```python
    class Config:
        env_file = str(ENV_FILE)
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()
```

- **Configuration:** Tells Pydantic to read from the `.env` file with UTF-8 encoding and ignore extra fields.
- **Singleton Instance:** Creates a global `settings` instance that can be imported throughout the app.

---

### 3. `backend/app/infra/supabase_client.py` - Supabase Client Singleton

**Purpose:** Provides a singleton Supabase client instance using the service role key for backend operations.

**Code Explanation:**

```python
from supabase import create_client, Client
from app.core.config import settings

_supabase: Client | None = None
```

- **Module-Level State:** Stores the Supabase client instance in a module-level variable. Starts as `None` and is initialized on first use.

```python
def supabase() -> Client:
    global _supabase
    if _supabase is None:
        _supabase = create_client(settings.supabase_url, settings.supabase_service_role_key)
    return _supabase
```

- **Singleton Pattern:** 
  - Checks if client is already created
  - If not, creates it using settings from `config.py`
  - Uses **service role key** (not anon key) - this bypasses Row Level Security (RLS) policies
  - Returns the same instance on subsequent calls
  - This ensures connection reuse and prevents multiple client instances

**Why Service Role Key?**
- Backend needs full database access to insert messages
- Service role key bypasses RLS policies
- Never exposed to frontend (security)
- Allows backend to write to any table without permission checks

---

### 4. `backend/app/routes/health.py` - Health Check Endpoints

**Purpose:** Provides health check endpoints to monitor API and database connectivity.

**Code Explanation:**

```python
from fastapi import APIRouter
from app.infra.supabase_client import supabase

router = APIRouter()
```

- **Router Creation:** Creates a FastAPI router for health endpoints.

```python
@router.get("/health")
def health():
    return {"status": "ok"}
```

- **Basic Health Check:** Simple endpoint that returns `{"status": "ok"}`. Used to verify the API is running.

```python
@router.get("/health/db")
def health_db():
    try:
        # lightweight connectivity check
        supabase().table("customers").select("id").limit(1).execute()
        return {"status": "ok", "db": "ok"}
    except Exception as e:
        # demo-friendly: return JSON instead of raising
        return {"status": "degraded", "db": "error", "detail": str(e)}
```

- **Database Health Check:**
  - Performs a minimal query (`SELECT id FROM customers LIMIT 1`) to test Supabase connectivity
  - Returns success if query succeeds
  - Returns error details if query fails (doesn't raise exception - returns JSON for better UX)
  - Used by monitoring systems to check database availability

**Endpoints:**
- `GET /api/health` → `{"status": "ok"}`
- `GET /api/health/db` → `{"status": "ok", "db": "ok"}` or `{"status": "degraded", "db": "error", "detail": "..."}`

---

### 5. `backend/app/routes/chat.py` - Chat/Conversation Endpoints

**Purpose:** Handles conversation creation and message sending/retrieval. This is the core API for chat functionality.

**Code Explanation:**

```python
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Literal, Optional

from app.infra.supabase_client import supabase

router = APIRouter()
```

- **Router Setup:** Creates router for chat endpoints.

#### Request Models

```python
class CreateConversationRequest(BaseModel):
    customer_id: str
    subject: Optional[str] = None
    channel: str = "app"
    priority: str = "medium"
```

- **CreateConversationRequest:** Pydantic model for creating conversations:
  - `customer_id`: Required customer identifier
  - `subject`: Optional conversation subject
  - `channel`: Communication channel (defaults to "app")
  - `priority`: Priority level (defaults to "medium")

```python
class SendMessageRequest(BaseModel):
    conversation_id: str
    sender_type: Literal["customer", "agent"]
    sender_customer_id: Optional[str] = None
    sender_agent_id: Optional[str] = None
    content: str = Field(min_length=1)
    is_internal: bool = False
```

- **SendMessageRequest:** Pydantic model for sending messages:
  - `conversation_id`: Required conversation UUID
  - `sender_type`: Must be "customer" or "agent"
  - `sender_customer_id`: Required if sender_type is "customer"
  - `sender_agent_id`: Required if sender_type is "agent"
  - `content`: Message content (minimum 1 character)
  - `is_internal`: Whether message is internal/whisper (defaults to False)

#### Helper Function

```python
def _ensure_data(res, err_msg: str):
    # supabase-py typically returns object with .data and optional .error
    if hasattr(res, "error") and res.error:
        raise HTTPException(status_code=500, detail=f"{err_msg}: {res.error}")
    data = getattr(res, "data", None)
    if not data:
        raise HTTPException(status_code=500, detail=err_msg)
    return data
```

- **Error Handling Helper:** 
  - Checks for Supabase errors in response
  - Raises HTTP 500 if error found
  - Returns data array if successful
  - Centralizes error handling logic

#### Endpoints

```python
@router.post("/conversations")
def create_conversation(body: CreateConversationRequest):
    payload = {
        "customer_id": body.customer_id,
        "subject": body.subject,
        "channel": body.channel,
        "priority": body.priority,
        "status": "open",
    }

    res = supabase().table("conversations").insert(payload).execute()
    data = _ensure_data(res, "Failed to create conversation")
    return data[0]
```

- **Create Conversation:**
  - Accepts `CreateConversationRequest`
  - Sets status to "open" by default
  - Inserts into `public.conversations` table
  - Returns the created conversation row

```python
@router.get("/conversations/{conversation_id}/messages")
def list_messages(conversation_id: str):
    res = (
        supabase()
        .table("messages")
        .select("*")
        .eq("conversation_id", conversation_id)
        .order("created_at", desc=False)
        .execute()
    )
    if hasattr(res, "error") and res.error:
        raise HTTPException(status_code=500, detail=str(res.error))
    return res.data or []
```

- **List Messages:**
  - Fetches all messages for a conversation
  - Filters by `conversation_id`
  - Orders by `created_at` ascending (oldest first)
  - Returns empty array if no messages or error

```python
@router.post("/messages")
def send_message(body: SendMessageRequest):
    # Validate sender fields based on sender_type
    if body.sender_type == "customer":
        if not body.sender_customer_id or body.sender_agent_id is not None:
            raise HTTPException(400, "customer message requires sender_customer_id only")
        if body.is_internal:
            raise HTTPException(400, "customers cannot send internal messages")
    else:
        if not body.sender_agent_id or body.sender_customer_id is not None:
            raise HTTPException(400, "agent message requires sender_agent_id only")

    payload = {
        "conversation_id": body.conversation_id,
        "sender_type": body.sender_type,
        "sender_customer_id": body.sender_customer_id,
        "sender_agent_id": body.sender_agent_id,
        "content": body.content,
        "is_internal": body.is_internal,
    }

    res = supabase().table("messages").insert(payload).execute()
    data = _ensure_data(res, "Failed to send message")
    return data[0]
```

- **Send Message:**
  - **Validation Logic:**
    - Customer messages: Must have `sender_customer_id`, cannot have `sender_agent_id`, cannot be internal
    - Agent messages: Must have `sender_agent_id`, cannot have `sender_customer_id`, can be internal
  - **Insert:** Inserts message into `public.messages` table
  - **Return:** Returns the inserted message row (includes generated `id` and `created_at`)

**Endpoints:**
- `POST /api/conversations` → Creates conversation, returns conversation object
- `GET /api/conversations/{conversation_id}/messages` → Returns array of messages
- `POST /api/messages` → Sends message, returns message object

---

## Architecture Principles

### 1. **Backend-Only Writes**
- Frontend **never** writes directly to Supabase tables
- All writes go through FastAPI backend
- Backend uses service role key for full access
- Frontend uses anon key only for Realtime subscriptions (read-only)

### 2. **Singleton Pattern**
- Supabase client is created once and reused
- Prevents connection pool exhaustion
- Ensures consistent configuration

### 3. **Environment-Based Configuration**
- All sensitive data in `.env` file
- Pydantic validates required fields at startup
- Fails fast if configuration is missing

### 4. **Error Handling**
- Consistent error responses
- HTTP status codes for different error types
- Detailed error messages for debugging

### 5. **Type Safety**
- Pydantic models validate request/response data
- Type hints throughout codebase
- Catches errors at request validation stage

---

## Database Schema Dependencies

The backend expects these Supabase tables:

### `public.conversations`
- `id` (UUID, primary key)
- `customer_id` (string)
- `subject` (string, nullable)
- `channel` (string)
- `priority` (string)
- `status` (string)

### `public.messages`
- `id` (UUID, primary key)
- `conversation_id` (UUID, foreign key)
- `sender_type` ("customer" | "agent")
- `sender_customer_id` (UUID, nullable)
- `sender_agent_id` (UUID, nullable)
- `content` (text)
- `is_internal` (boolean)
- `created_at` (timestamp)

---

## Running the Backend

**Development:**
```bash
cd backend
python app/main.py
```

**Production:**
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**Environment Variables Required:**
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

---

## Summary

The backend provides a clean, type-safe API for:
- ✅ Health monitoring
- ✅ Conversation management
- ✅ Message sending and retrieval
- ✅ Supabase integration with service role key
- ✅ CORS configuration for frontend access
- ✅ Environment-based configuration
- ✅ Error handling and validation

All database writes go through the backend, ensuring security and data integrity while allowing the frontend to subscribe to Realtime updates for instant message delivery.
