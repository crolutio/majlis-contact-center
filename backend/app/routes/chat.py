from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Literal, Optional

from app.infra.supabase_client import supabase

router = APIRouter()


class CreateConversationRequest(BaseModel):
    customer_id: str
    subject: Optional[str] = None
    channel: str = "app"
    priority: str = "medium"


class SendMessageRequest(BaseModel):
    conversation_id: str
    sender_type: Literal["customer", "agent"]
    sender_customer_id: Optional[str] = None
    sender_agent_id: Optional[str] = None
    content: str = Field(min_length=1)
    is_internal: bool = False


def _ensure_data(res, err_msg: str):
    # supabase-py typically returns object with .data and optional .error
    if hasattr(res, "error") and res.error:
        raise HTTPException(status_code=500, detail=f"{err_msg}: {res.error}")
    data = getattr(res, "data", None)
    if not data:
        raise HTTPException(status_code=500, detail=err_msg)
    return data


@router.post("/conversations")
def create_conversation(body: CreateConversationRequest):
    # Default agent ID for testing purposes
    DEFAULT_AGENT_ID = "e66fa391-28b5-44ec-b3a9-4397c2f2d225"
    
    payload = {
        "customer_id": body.customer_id,
        "subject": body.subject,
        "channel": body.channel,
        "priority": body.priority,
        "status": "open",
        "assigned_agent_id": DEFAULT_AGENT_ID,
    }
    
    print(f"[backend] Creating conversation with payload: {payload}")
    print(f"[backend] assigned_agent_id: {DEFAULT_AGENT_ID}")

    res = supabase().table("conversations").insert(payload).execute()
    data = _ensure_data(res, "Failed to create conversation")
    
    created_conversation = data[0]
    print(f"[backend] Conversation created: id={created_conversation.get('id')}, assigned_agent_id={created_conversation.get('assigned_agent_id')}")
    
    return created_conversation


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
