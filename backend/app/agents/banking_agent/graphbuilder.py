from langgraph.graph import START, StateGraph, END
from langgraph.prebuilt import ToolNode, tools_condition
from langgraph.checkpoint.memory import MemorySaver

from .state import BankingState
from .nodes import BankingNode


class BankingAgentGraphBuilder:
    """
    This class builds the graph used to execute banking queries based on the user's query.
    """

    def __init__(self, llm, tools):
        self.llm = llm
        self.tools = tools
        self.graph = StateGraph(BankingState)

    def build_graph(self):
        """
        Builds the graph used to execute banking queries based on the user's query.
        """
        banking_node = BankingNode(self.llm, self.tools)

        # ToolNode needs access to all tools the LLM can call.
        tool_node = ToolNode(self.tools, handle_tool_errors=True)

        # Add nodes to the graph
        self.graph.add_node("summarize_conversation_messages", banking_node.summarize_conversation_messages)
        self.graph.add_node("answer_user_query", banking_node.answer_user_query)
        self.graph.add_node("tools", tool_node)

        # Start with conversation summarization, then answer the user query
        self.graph.add_edge(START, "summarize_conversation_messages")
        self.graph.add_edge("summarize_conversation_messages", "answer_user_query")

        # If the LLM issues tool calls, route to tools then back to answer_user_query
        self.graph.add_conditional_edges(
            "answer_user_query",
            tools_condition,
            {
                "tools": "tools",
                END: END,
            },
        )
        self.graph.add_edge("tools", "answer_user_query")

        return self.graph.compile(checkpointer=MemorySaver())