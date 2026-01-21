from fastapi import HTTPException
from typing import Tuple, Optional, Dict, Any, List, Literal
from datetime import datetime, timezone
from pathlib import Path
import logging

from app.infra.supabase_client import supabase
from langchain_core.messages import SystemMessage, HumanMessage
from pydantic import BaseModel, Field

HANDOFF_ROUTER_PROMPT = """
You are a banking support router.

You will be given:
- recent_message: the customer's latest message
- conversation_history: a list of raw message dicts (chronological)

Your job:
Perform lightweight sentiment analysis and decide whether the next response
should be handled by a human or an AI agent.

Return a JSON object that matches this schema exactly:
HandoffDecision = {
  "decision": "human" | "agent",
  "reason": string
}

Decide "human" if any of the following are true:
- The customer explicitly asks for a human/agent/representative.
- The customer is dissatisfied, frustrated, or escalatory.
- The customer reports fraud/unauthorized/suspicious activity, scams, chargebacks,
  stolen cards, account hacking, or identity theft.

Otherwise, decide "agent".

Rules:
1) Output ONLY valid JSON. No markdown, no extra keys, no commentary.
2) Base your decision only on the provided messages.
3) Keep the reason short and specific.
"""

# AI Agent ID constant
AI_AGENT_ID = "11111111-1111-1111-1111-111111111111"  # your bot agent row in public.agents

LOG_BASE_DIR = Path(__file__).resolve().parent.parent / "logs"
APP_LOG_NAME = "app"
ERROR_LOG_NAME = "app.errors"


def init_logging() -> None:
    log_dir = LOG_BASE_DIR
    log_dir.mkdir(parents=True, exist_ok=True)

    formatter = logging.Formatter(
        "%(asctime)s | %(levelname)s | %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S%z",
    )

    app_logger = logging.getLogger(APP_LOG_NAME)
    if not app_logger.handlers:
        app_logger.setLevel(logging.INFO)
        app_handler = logging.FileHandler(log_dir / "app.log", mode="w", encoding="utf-8")
        app_handler.setLevel(logging.INFO)
        app_handler.setFormatter(formatter)
        app_logger.addHandler(app_handler)

    error_logger = logging.getLogger(ERROR_LOG_NAME)
    if not error_logger.handlers:
        error_logger.setLevel(logging.ERROR)
        error_handler = logging.FileHandler(log_dir / "errors.log", mode="w", encoding="utf-8")
        error_handler.setLevel(logging.ERROR)
        error_handler.setFormatter(formatter)
        error_logger.addHandler(error_handler)


def get_app_logger() -> logging.Logger:
    return logging.getLogger(APP_LOG_NAME)


def get_error_logger() -> logging.Logger:
    return logging.getLogger(ERROR_LOG_NAME)


def log_node_entry(logger: logging.Logger, node_name: str, detail: str | None = None) -> None:
    separator = "=" * 90
    logger.info(separator)
    if detail:
        logger.info(">>> NODE: %s (%s)", node_name, detail)
    else:
        logger.info(">>> NODE: %s", node_name)
    logger.info(separator)


def ensure_data(res, err_msg: str):
    """Helper to extract data from Supabase response and handle errors."""
    if hasattr(res, "error") and res.error:
        raise HTTPException(status_code=500, detail=f"{err_msg}: {res.error}")
    data = getattr(res, "data", None)
    if not data:
        raise HTTPException(status_code=500, detail=err_msg)
    return data


def now_iso() -> str:
    """Get current UTC time as ISO string."""
    return datetime.now(timezone.utc).isoformat()


def get_conversation(conversation_id: str) -> Dict[str, Any]:
    """Fetch a conversation by ID with all its messages in ascending order."""
    # Fetch conversation with messages using foreign key relationship
    res = (
        supabase()
        .table("conversations")
        .select("*, messages:messages(*)")
        .eq("id", conversation_id)
        .limit(1)
        .execute()
    )
    data = ensure_data(res, "Failed to load conversation")
    conversation = data[0]
    
    # If messages were fetched via join, sort them by created_at ascending
    if "messages" in conversation and conversation["messages"]:
        conversation["messages"] = sorted(
            conversation["messages"],
            key=lambda m: m.get("created_at", ""),
            reverse=False  # ascending order
        )
    else:
        # Fallback: fetch messages separately if join didn't work
        messages_res = (
            supabase()
            .table("messages")
            .select("*")
            .eq("conversation_id", conversation_id)
            .order("created_at", desc=False)  # ascending order
            .execute()
        )
        conversation["messages"] = messages_res.data or []
    
    return conversation


def update_conversation(conversation_id: str, fields: Dict[str, Any]) -> None:
    """Update conversation fields."""
    # fields example: {"handling_mode": "human", "handoff_status": "queued", ...}
    res = (
        supabase()
        .table("conversations")
        .update(fields)
        .eq("id", conversation_id)
        .execute()
    )
    if hasattr(res, "error") and res.error:
        raise HTTPException(status_code=500, detail=f"Failed to update conversation: {res.error}")


def insert_message(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Insert a message into the messages table."""
    res = supabase().table("messages").insert(payload).execute()
    data = ensure_data(res, "Failed to send message")
    return data[0]


class HandoffDecision(BaseModel):
    decision: Literal["human", "agent"] = Field(..., description="Routing decision")
    reason: str = Field(..., description="Short reason for the decision")


def should_handoff_to_human(
    llm: Any,
    conversation_history: List[Dict[str, Any]],
    recent_message: str,
) -> Tuple[bool, Optional[str]]:
    if llm is None:
        return False, None

    llm_with_structured_output = llm.with_structured_output(
        HandoffDecision,
        method="json_schema",
    )
    payload = {
        "recent_message": recent_message,
        "conversation_history": conversation_history,
    }
    messages = [
        SystemMessage(content=HANDOFF_ROUTER_PROMPT),
        HumanMessage(content=str(payload)),
    ]
    decision = llm_with_structured_output.invoke(messages)
    return decision.decision == "human", decision.reason


def build_handoff_summary(conversation_id: str) -> str:
    """
    Minimal: fetch last few messages and summarize.
    You can replace this with an LLM summarizer later.
    """
    res = (
        supabase()
        .table("messages")
        .select("sender_type,content,created_at")
        .eq("conversation_id", conversation_id)
        .order("created_at", desc=True)
        .limit(8)
        .execute()
    )
    msgs = res.data or []
    msgs.reverse()

    lines = []
    for m in msgs:
        who = m.get("sender_type", "unknown")
        content = (m.get("content") or "").strip().replace("\n", " ")
        lines.append(f"- {who}: {content[:180]}")

    return "Handoff summary (last messages):\n" + "\n".join(lines)

