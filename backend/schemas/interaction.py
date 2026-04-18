from pydantic import BaseModel
from typing import Optional
from datetime import date, time

class InteractionCreate(BaseModel):
    hcp_name: str
    interaction_type: Optional[str] = "Meeting"
    date: date
    time: Optional[str] = None
    attendees: Optional[str] = None
    topics_discussed: Optional[str] = None
    materials_shared: Optional[str] = None
    samples_distributed: Optional[str] = None
    sentiment: Optional[str] = "Neutral"
    outcomes: Optional[str] = None
    followup_actions: Optional[str] = None

class InteractionUpdate(BaseModel):
    hcp_name: Optional[str] = None
    interaction_type: Optional[str] = None
    date: Optional[date] = None
    time: Optional[str] = None
    attendees: Optional[str] = None
    topics_discussed: Optional[str] = None
    materials_shared: Optional[str] = None
    samples_distributed: Optional[str] = None
    sentiment: Optional[str] = None
    outcomes: Optional[str] = None
    followup_actions: Optional[str] = None

class InteractionResponse(BaseModel):
    id: int
    hcp_name: str
    interaction_type: Optional[str]
    date: Optional[str]
    time: Optional[str]
    attendees: Optional[str]
    topics_discussed: Optional[str]
    materials_shared: Optional[str]
    samples_distributed: Optional[str]
    sentiment: Optional[str]
    outcomes: Optional[str]
    followup_actions: Optional[str]
    ai_summary: Optional[str]
    ai_suggested_followups: Optional[str]
    created_at: Optional[str]

    class Config:
        from_attributes = True

class ChatMessage(BaseModel):
    message: str
    conversation_history: Optional[list] = []

class ChatResponse(BaseModel):
    response: str
    extracted_data: Optional[dict] = None
    tool_used: Optional[str] = None
