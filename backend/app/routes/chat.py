from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from typing import Optional

from app.infra.supabase_client import supabase
from app.routes.utils import (
    ensure_data,
    now_iso,
    get_conversation,
    update_conversation,
    insert_message,
    should_handoff_to_human,
    build_handoff_summary,
    get_app_logger,
    get_error_logger,
    AI_AGENT_ID,
)

router = APIRouter()

# Default agent ID for testing purposes (human agent)
DEFAULT_AGENT_ID = "e66fa391-28b5-44ec-b3a9-4397c2f2d225"


class CreateConversationRequest(BaseModel):
    customer_id: str
    subject: Optional[str] = None
    channel: str = "app"
    priority: str = "medium"


class SendMessageRequest(BaseModel):
    conversation_id: str
    sender_type: str  # "customer" | "agent" | "ai" | "system"
    sender_customer_id: Optional[str] = None
    sender_agent_id: Optional[str] = None
    content: str = Field(min_length=1)
    is_internal: bool = False


@router.post("/conversations")
def create_conversation(body: CreateConversationRequest):
    logger = get_app_logger()
    error_logger = get_error_logger()
    payload = {
        "customer_id": body.customer_id,
        "subject": body.subject,
        "channel": body.channel,
        "priority": body.priority,
        "status": "open",
        "assigned_agent_id": DEFAULT_AGENT_ID,
    }
    
    logger.info(
        "create_conversation:start customer_id=%s channel=%s priority=%s",
        body.customer_id,
        body.channel,
        body.priority,
    )

    try:
        res = supabase().table("conversations").insert(payload).execute()
        data = ensure_data(res, "Failed to create conversation")
    except Exception as exc:
        error_logger.exception("create_conversation:error %s", exc)
        raise
    
    created_conversation = data[0]
    logger.info(
        "create_conversation:created id=%s assigned_agent_id=%s",
        created_conversation.get("id"),
        created_conversation.get("assigned_agent_id"),
    )
    
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
async def send_message(body: SendMessageRequest, request: Request):
    logger = get_app_logger()
    error_logger = get_error_logger()
    # -------------------------
    # 1) Validate request
    # -------------------------
    sender_type = (body.sender_type or "").strip().lower()

    if sender_type == "customer":
        if not body.sender_customer_id or body.sender_agent_id is not None:
            raise HTTPException(400, "customer message requires sender_customer_id only")
        if body.is_internal:
            raise HTTPException(400, "customers cannot send internal messages")
    else:
        # Normalize non-customer senders: agent/ai/system should always have a sender_agent_id
        if not body.sender_agent_id or body.sender_customer_id is not None:
            raise HTTPException(400, "non-customer message requires sender_agent_id only")

    # If it's not a CUSTOMER message, we're done (human/ai/system messages just get stored)
    if sender_type != "customer":
        incoming_payload = {
            "conversation_id": body.conversation_id,
            "sender_type": sender_type,
            "sender_customer_id": body.sender_customer_id,
            "sender_agent_id": body.sender_agent_id,
            "content": body.content,
            "is_internal": body.is_internal,
        }
        try:
            inserted_message = insert_message(incoming_payload)
        except Exception as exc:
            error_logger.exception("messages:non_customer error %s", exc)
            raise

        # Always update conversation.last_message/updated_at
        update_conversation(
            body.conversation_id,
            {"last_message": body.content[:200], "updated_at": now_iso()},
        )

        logger.info(
            "messages:non_customer stored conversation_id=%s sender_type=%s message_id=%s",
            body.conversation_id,
            sender_type,
            inserted_message.get("id"),
        )
        return inserted_message

    # Persist incoming customer message immediately.
    incoming_payload = {
        "conversation_id": body.conversation_id,
        "sender_type": sender_type,
        "sender_customer_id": body.sender_customer_id,
        "sender_agent_id": None,
        "content": body.content,
        "is_internal": body.is_internal,
    }
    try:
        inserted_message = insert_message(incoming_payload)
    except Exception as exc:
        error_logger.exception("messages:insert_customer error %s", exc)
        raise

    # Always update conversation.last_message/updated_at
    update_conversation(
        body.conversation_id,
        {"last_message": body.content[:200], "updated_at": now_iso()},
    )

    # -------------------------
    # 2) Orchestrate ONLY for customer messages
    # -------------------------
    try:
        conv = get_conversation(body.conversation_id)
    except Exception as exc:
        error_logger.exception("messages:load_conversation error %s", exc)
        raise
    logger.info(
        "messages:history preview=%s",
        str(conv.get("messages") or [])[:500],
    )

    # If conversation is already in human-handling mode, do not call AI.
    handling_mode = conv.get("handling_mode")
    is_human_handling = handling_mode == "human"

    # -------------------------
    # 3) Router decision: AI vs handoff
    # -------------------------
    try:
        needs_human, reason = should_handoff_to_human(
            getattr(request.app.state, "llm", None),
            conv.get("messages") or [],
            body.content,
        )
    except Exception as exc:
        error_logger.exception("messages:routing error %s", exc)
        raise
    should_route_to_human = is_human_handling or needs_human
    logger.info(
        "messages:routing conversation_id=%s is_human_handling=%s needs_human=%s reason=%s",
        body.conversation_id,
        is_human_handling,
        needs_human,
        reason,
    )

    if is_human_handling:
        # Customer message persisted; a human will reply via call-center UI
        logger.info(
            "messages:human_mode conversation_id=%s customer_message_id=%s",
            body.conversation_id,
            inserted_message.get("id"),
        )
        return {
            "status": "handoff",
            "customer_message_id": inserted_message.get("id"),
            "ai_reply": None,
            "ai_message_id": None,
        }

    if needs_human:
        # 4a) Mark conversation as handed off
        update_conversation(
            body.conversation_id,
            {
                "handling_mode": "human",
                "updated_at": now_iso(),
            },
        )

        # 4b) Create internal handoff summary for the human agent
        try:
            summary_text = build_handoff_summary(body.conversation_id)
            insert_message(
                {
                    "conversation_id": body.conversation_id,
                    "sender_type": "ai",
                    "sender_customer_id": None,
                    "sender_agent_id": AI_AGENT_ID,
                    "content": summary_text,
                    "is_internal": True,
                }
            )
        except Exception as exc:
            error_logger.exception("messages:handoff_summary error %s", exc)
            raise

        # 4c) Optionally send a customer-visible message acknowledging handoff
        try:
            insert_message(
                {
                    "conversation_id": body.conversation_id,
                    "sender_type": "ai",
                    "sender_customer_id": None,
                    "sender_agent_id": AI_AGENT_ID,
                    "content": "I'm connecting you to a human agent now for further assistance.",
                    "is_internal": False,
                }
            )
        except Exception as exc:
            error_logger.exception("messages:handoff_ack error %s", exc)
            raise

        logger.info(
            "messages:handoff conversation_id=%s customer_message_id=%s",
            body.conversation_id,
            inserted_message.get("id"),
        )
        return inserted_message

    # -------------------------
    # 5) AI answers
    # -------------------------
    agent_graph = getattr(request.app.state, "banking_agent_graph", None)
    try:
        ai_reply_text = await invoke_banking_agent(
            agent_graph,
            body.conversation_id,
            conv.get("customer_id") or "",
            body.content,
            conv.get("messages") or [],
        )
    except Exception as exc:
        error_logger.exception("messages:ai_invoke error %s", exc)
        raise

    try:
        ai_msg = insert_message(
            {
                "conversation_id": body.conversation_id,
                "sender_type": "ai",
                "sender_customer_id": None,
                "sender_agent_id": AI_AGENT_ID,
                "content": ai_reply_text,
                "is_internal": False,
            }
        )
    except Exception as exc:
        error_logger.exception("messages:ai_insert error %s", exc)
        raise

    update_conversation(
        body.conversation_id,
        {"last_message": ai_reply_text[:200], "updated_at": now_iso()},
    )

    logger.info(
        "messages:ai conversation_id=%s customer_message_id=%s ai_message_id=%s ai_reply=%s",
        body.conversation_id,
        inserted_message.get("id"),
        ai_msg.get("id"),
        ai_reply_text,
    )

    # Return a consistent schema for all customer messages.
    return {
        "status": "ai",
        "customer_message_id": inserted_message.get("id"),
        "ai_reply": ai_reply_text,
        "ai_message_id": ai_msg.get("id"),
    }


async def invoke_banking_agent(
    agent_graph,
    conversation_id: str,
    customer_id: str,
    customer_text: str,
    conversation_messages: list[dict],
) -> str:
    if agent_graph is None:
        return "Error: Banking agent graph not found"

    state = {
        "messages": [],
        "customer_id": customer_id,
        "user_query": customer_text,
        "raw_conversation_history": conversation_messages,
        "summarized_conversation_history": [],
    }
    logger = get_app_logger()
    logger.info(
        "banking_agent:invoke state_preview=%s",
        str(state)[:500],
    )
    result = await agent_graph.ainvoke(
        state,
        config={"configurable": {"thread_id": conversation_id}},
    )
    
    msg = result["messages"][-1].content if result.get("messages") else ""
    return msg
