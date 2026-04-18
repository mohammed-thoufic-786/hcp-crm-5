from fastapi import APIRouter
from schemas.interaction import ChatMessage, ChatResponse
from agent import run_agent

router = APIRouter()

@router.post("/", response_model=ChatResponse)
async def chat_with_agent(payload: ChatMessage):
    """
    Main chat endpoint — processes natural language through LangGraph agent.
    Always returns extracted_data with parsed form fields when intent is log_interaction.
    """
    result = run_agent(
        user_message=payload.message,
        conversation_history=payload.conversation_history,
    )
    return ChatResponse(
        response=result.get("response", ""),
        extracted_data=result.get("extracted_data", {}),
        tool_used=result.get("tool_used"),
    )
