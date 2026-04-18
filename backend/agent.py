"""
LangGraph Agent for HCP CRM
- llama-3.3-70b-versatile : tool-calling agent
- gemma2-9b-it            : NL → structured JSON extraction (all 11 form fields)
"""

import os
import json
import re
from datetime import date, datetime
from typing import TypedDict, Annotated, Sequence
from dotenv import load_dotenv

from langchain_groq import ChatGroq
from langchain_core.messages import (
    BaseMessage, HumanMessage, SystemMessage, AIMessage, ToolMessage
)
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode

from tools.hcp_tools import ALL_TOOLS

load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "your-groq-api-key-here")

# ── Prompts ───────────────────────────────────────────────────────────────────

AGENT_SYSTEM = """You are an intelligent AI assistant for a Life Sciences CRM system,
helping pharmaceutical field representatives log and manage interactions with
Healthcare Professionals (HCPs).

Tools available:
1. log_interaction    – Save a new HCP interaction to the database
2. edit_interaction   – Update/correct an existing interaction
3. get_hcp_history    – Fetch past interactions for an HCP
4. suggest_followup   – Generate AI follow-up recommendations
5. analyze_sentiment  – Detect HCP sentiment from interaction text

Rules:
- When the user describes meeting/visiting/calling a doctor → call log_interaction
- Always extract HCP name, date (default {today}), sentiment from natural language
- Be concise and professional
- Confirm success after every tool call
Today: {today}
"""

# Robust extraction prompt — covers all 11 form fields with examples
EXTRACTION_PROMPT = """You are a precise data extraction engine for a pharma CRM.
Read the HCP interaction description below and extract ALL available fields.

Return ONLY a valid JSON object — no explanation, no markdown fences, no extra text.

JSON schema (use null only if genuinely not mentioned):
{{
  "hcp_name":             "<Full name of doctor/HCP, e.g. Dr. Anjali Sharma>",
  "interaction_type":     "<exactly one of: Meeting | Call | Email | Conference | Virtual>",
  "date":                 "<YYYY-MM-DD — use {today} if user says 'today'>",
  "time":                 "<HH:MM 24h format, e.g. 14:30 — null if not mentioned>",
  "attendees":            "<comma-separated list of people present besides the rep>",
  "topics_discussed":     "<all clinical/product topics covered, full sentence>",
  "materials_shared":     "<brochures/PDFs/slides/detail aids shared, comma-separated>",
  "samples_distributed":  "<drug samples handed out, with quantity if given, comma-separated>",
  "sentiment":            "<exactly one of: Positive | Neutral | Negative>",
  "outcomes":             "<agreements reached, commitments made, decisions taken>",
  "followup_actions":     "<next steps, tasks, scheduled meetings>"
}}

Inference rules:
- "met", "visited", "dropped by" → interaction_type = Meeting
- "called", "phoned", "rang" → interaction_type = Call
- "emailed", "sent email" → interaction_type = Email
- "webinar", "online", "zoom", "teams" → interaction_type = Virtual
- "conference", "summit", "congress" → interaction_type = Conference
- "interested", "agreed", "enthusiastic", "willing", "positive", "happy" → sentiment = Positive
- "skeptical", "refused", "concerned", "unhappy", "rejected", "negative" → sentiment = Negative
- If no clear positive/negative cues → sentiment = Neutral
- Always fill date with {today} if user says today/this morning/just now

Today is {today}.
User message: {message}
"""


# ── LLM factories ─────────────────────────────────────────────────────────────

def get_agent_llm():
    return ChatGroq(
        api_key=GROQ_API_KEY,
        model="llama-3.3-70b-versatile",
        temperature=0.1,
        max_tokens=1024,
    )

def get_extraction_llm():
    return ChatGroq(
        api_key=GROQ_API_KEY,
        model="gemma2-9b-it",
        temperature=0,
        max_tokens=600,
    )


# ── Entity extraction (gemma2-9b-it) ─────────────────────────────────────────

def extract_fields_from_message(message: str) -> dict:
    """
    Extract all 11 form fields from natural language using gemma2-9b-it.
    Returns only non-null fields ready to populate the left form.
    """
    today_str = date.today().isoformat()
    prompt = EXTRACTION_PROMPT.format(today=today_str, message=message)
    try:
        llm = get_extraction_llm()
        resp = llm.invoke([HumanMessage(content=prompt)])
        text = resp.content.strip()
        # Strip markdown fences
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.MULTILINE)
        text = re.sub(r"\s*```$", "", text, flags=re.MULTILINE)
        text = text.strip()

        parsed = json.loads(text)

        # Clean: remove nulls, "null" strings, empty strings
        cleaned = {}
        for k, v in parsed.items():
            if v is None or v == "null" or (isinstance(v, str) and v.strip() == ""):
                continue
            cleaned[k] = str(v).strip()

        # Normalize interaction_type
        valid_types = {"Meeting", "Call", "Email", "Conference", "Virtual"}
        if "interaction_type" in cleaned:
            it = cleaned["interaction_type"].capitalize()
            cleaned["interaction_type"] = it if it in valid_types else "Meeting"

        # Normalize sentiment
        if "sentiment" in cleaned:
            s = cleaned["sentiment"].capitalize()
            if s not in {"Positive", "Neutral", "Negative"}:
                s = "Neutral"
            cleaned["sentiment"] = s

        # Ensure date is valid YYYY-MM-DD
        if "date" in cleaned:
            try:
                datetime.strptime(cleaned["date"], "%Y-%m-%d")
            except ValueError:
                cleaned["date"] = today_str

        return cleaned

    except Exception:
        # Fallback: return today's date at minimum
        return {"date": date.today().isoformat()}


# ── LangGraph state & nodes ───────────────────────────────────────────────────

class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], lambda x, y: x + y]


def agent_node(state: AgentState):
    llm = get_agent_llm().bind_tools(ALL_TOOLS)
    today_str = date.today().isoformat()
    sys = SystemMessage(content=AGENT_SYSTEM.format(today=today_str))
    response = llm.invoke([sys] + list(state["messages"]))
    return {"messages": [response]}


def should_continue(state: AgentState):
    last = state["messages"][-1]
    if hasattr(last, "tool_calls") and last.tool_calls:
        return "tools"
    return END


tool_node = ToolNode(ALL_TOOLS)
_graph = StateGraph(AgentState)
_graph.add_node("agent", agent_node)
_graph.add_node("tools", tool_node)
_graph.set_entry_point("agent")
_graph.add_conditional_edges("agent", should_continue, {"tools": "tools", END: END})
_graph.add_edge("tools", "agent")
hcp_agent = _graph.compile()


# ── Public API ────────────────────────────────────────────────────────────────

def run_agent(user_message: str, conversation_history: list = None) -> dict:
    """
    Run LangGraph agent + entity extraction together.
    Returns:
      response       – final AI text
      tool_used      – which LangGraph tool was invoked
      extracted_data – merged form fields + tool result
    """
    # Build message history
    messages = []
    if conversation_history:
        for m in conversation_history:
            if m.get("role") == "user":
                messages.append(HumanMessage(content=m["content"]))
            elif m.get("role") == "assistant":
                messages.append(AIMessage(content=m["content"]))
    messages.append(HumanMessage(content=user_message))

    # Run extraction (gemma2-9b-it) — always, regardless of intent
    extracted_fields = extract_fields_from_message(user_message)

    try:
        result = hcp_agent.invoke({"messages": messages})
        all_msgs = result["messages"]

        final_response = ""
        tool_used = None
        tool_data = {}

        for msg in reversed(all_msgs):
            if isinstance(msg, AIMessage) and msg.content:
                final_response = msg.content
                break

        for msg in all_msgs:
            if isinstance(msg, AIMessage) and getattr(msg, "tool_calls", None):
                tool_used = msg.tool_calls[0].get("name")
                break

        for msg in all_msgs:
            if isinstance(msg, ToolMessage):
                try:
                    tool_data = json.loads(msg.content)
                except Exception:
                    tool_data = {}
                break

        # Merge: form fields first, tool result overlays (IDs, success flags, etc.)
        merged = {**extracted_fields, **tool_data}

        return {
            "response": final_response or "Done.",
            "tool_used": tool_used,
            "extracted_data": merged,
        }

    except Exception as e:
        return {
            "response": f"Error: {str(e)}",
            "tool_used": None,
            "extracted_data": extracted_fields,
        }
