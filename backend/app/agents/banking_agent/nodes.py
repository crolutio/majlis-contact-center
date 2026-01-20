import json
from typing import List, Any

from .state import BankingState, SummarizedMessages
from app.routes.utils import get_app_logger, get_error_logger, log_node_entry
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage, ToolMessage
from .prompts import MESSAGE_SUMMARY_PROMPT, EXECUTE_QUERY_PROMPT


def serialize_summarized_history(summarized_conversation_history: list[SummarizedMessages]) -> str:
    return json.dumps(
        [message.model_dump() for message in summarized_conversation_history],
        ensure_ascii=False,
    )


class BankingNode:

    def __init__(self, llm, tools):
        """
        Initialize the HR_Node with an LLM and tools.
        """
        self.llm = llm

        # MCP tools (e.g., execute_sql, list_tables) passed in from app/graphbuilder
        self.tools = tools
        
        # Bind both MCP tools to the LLM for the main execute node
        self.llm_with_tools = llm.bind_tools(self.tools)


    
    
    def summarize_conversation_messages(self, state: BankingState) -> BankingState:
        logger = get_app_logger()
        error_logger = get_error_logger()
        log_node_entry(logger, "banking_node", "summarize_conversation_messages")

        conversation_messages = state['raw_conversation_history']
        logger.info(
            "banking_node:summarize start messages_count=%s",
            len(conversation_messages),
        )

        llm_with_structured_output = self.llm.with_structured_output(
            SummarizedMessages,
            method="json_schema",
        )

        messages=[
            SystemMessage(content=MESSAGE_SUMMARY_PROMPT),
            HumanMessage(content=json.dumps(conversation_messages))
        ]

        try:
            response = llm_with_structured_output.invoke(messages)
        except Exception as exc:
            error_logger.exception("banking_node:summarize error %s", exc)
            raise

        logger.info(
            "banking_node:summarize done summarized_count=%s",
            len(response.messages),
        )
        logger.info(
            "banking_node:summarize preview=%s",
            json.dumps([m.model_dump() for m in response.messages])[:500],
        )
        return {
            'summarized_conversation_history': response.messages
        }


    async def answer_user_query(self, state: BankingState) -> BankingState:
        logger = get_app_logger()
        error_logger = get_error_logger()
        log_node_entry(logger, "banking_node", "answer_user_query")
        user_query = state['user_query']
        summarized_conversation_history = state['summarized_conversation_history']
        customer_id = state['customer_id']

        # Serialize the structured summary before feeding it to the LLM.
        serialized_summary = serialize_summarized_history(summarized_conversation_history)

        human_content = f"User query: {user_query}\nCustomer ID: {customer_id}\nSummarized conversation history: {serialized_summary}"

        messages=[
            SystemMessage(content=EXECUTE_QUERY_PROMPT),
            *state['messages'],
            HumanMessage(content=human_content),
        ]

        logger.info(
            "banking_node:answer start customer_id=%s query=%s",
            customer_id,
            user_query,
        )
        try:
            response = await self.llm_with_tools.ainvoke(messages)
        except Exception as exc:
            error_logger.exception("banking_node:answer error %s", exc)
            raise

        tool_calls = getattr(response, "tool_calls", None)
        logger.info(
            "banking_node:answer done has_tool_calls=%s response_length=%s",
            bool(tool_calls),
            len(getattr(response, "content", "") or ""),
        )
        if tool_calls:
            for idx, tool_call in enumerate(tool_calls, 1):
                logger.info(
                    "banking_node:answer tool_call_%s name=%s args=%s",
                    idx,
                    tool_call.get("name"),
                    tool_call.get("args"),
                )

        tool_messages = [
            msg for msg in state.get("messages", []) if isinstance(msg, ToolMessage)
        ]
        for idx, tool_msg in enumerate(tool_messages, 1):
            logger.info(
                "banking_node:answer tool_response_%s name=%s preview=%s",
                idx,
                getattr(tool_msg, "name", ""),
                (tool_msg.content or "")[:500],
            )

        # Preserve tool_calls and other metadata on the response message.
        return {
            'messages': [response]
        }
        