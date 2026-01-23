from typing import Annotated, List, TypedDict, Literal, Dict, Any
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages
from pydantic import BaseModel, Field



class Message(BaseModel):
    timestamp: str = Field(..., description="ISO timestamp (e.g., created_at)")
    sender_type: Literal["customer", "ai", "human"] = Field(..., description="who sent the message")
    content: str = Field(..., description="Message content or compressed gist")


class SummarizedMessages(BaseModel):
    messages: List[Message]
    

class BankingState(TypedDict):
    """
    Lean state for the Banking Support Agent demo.
    You can add fields later without refactoring the whole graph.
    """
    messages: Annotated[List[BaseMessage], add_messages]
    customer_id: str
    user_query: str
    raw_conversation_history: List[Dict[str, Any]]
    summarized_conversation_history: List[Message]

    
