from sqlalchemy import Column, Integer, String, Text, Date, Time, DateTime, Enum
from sqlalchemy.sql import func
from models.database import Base
import enum

class SentimentEnum(str, enum.Enum):
    positive = "Positive"
    neutral = "Neutral"
    negative = "Negative"

class InteractionTypeEnum(str, enum.Enum):
    meeting = "Meeting"
    call = "Call"
    email = "Email"
    conference = "Conference"
    virtual = "Virtual"

class Interaction(Base):
    __tablename__ = "interactions"

    id = Column(Integer, primary_key=True, index=True)
    hcp_name = Column(String(255), nullable=False, index=True)
    interaction_type = Column(String(100), default="Meeting")
    date = Column(Date, nullable=False)
    time = Column(Time, nullable=True)
    attendees = Column(Text, nullable=True)
    topics_discussed = Column(Text, nullable=True)
    materials_shared = Column(Text, nullable=True)
    samples_distributed = Column(Text, nullable=True)
    sentiment = Column(String(50), default="Neutral")
    outcomes = Column(Text, nullable=True)
    followup_actions = Column(Text, nullable=True)
    ai_summary = Column(Text, nullable=True)
    ai_suggested_followups = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "hcp_name": self.hcp_name,
            "interaction_type": self.interaction_type,
            "date": str(self.date) if self.date else None,
            "time": str(self.time) if self.time else None,
            "attendees": self.attendees,
            "topics_discussed": self.topics_discussed,
            "materials_shared": self.materials_shared,
            "samples_distributed": self.samples_distributed,
            "sentiment": self.sentiment,
            "outcomes": self.outcomes,
            "followup_actions": self.followup_actions,
            "ai_summary": self.ai_summary,
            "ai_suggested_followups": self.ai_suggested_followups,
            "created_at": str(self.created_at) if self.created_at else None,
        }
