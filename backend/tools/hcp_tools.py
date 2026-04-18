"""
LangGraph Tools for HCP CRM Agent
5 Tools:
1. log_interaction      - Capture & save HCP interaction with LLM summarization
2. edit_interaction     - Modify an existing logged interaction
3. get_hcp_history      - Retrieve past interactions for an HCP
4. suggest_followup     - AI-powered follow-up recommendation
5. analyze_sentiment    - Detect HCP sentiment from conversation text
"""

import json
import os
from datetime import date, datetime
from typing import Optional
from langchain_core.tools import tool
from sqlalchemy.orm import Session
from models.database import SessionLocal
from models.interaction import Interaction

def get_db_session() -> Session:
    return SessionLocal()


# ─────────────────────────────────────────────
# TOOL 1: Log Interaction
# ─────────────────────────────────────────────
@tool
def log_interaction(
    hcp_name: str,
    interaction_type: str,
    date_str: str,
    topics_discussed: str,
    attendees: Optional[str] = None,
    materials_shared: Optional[str] = None,
    samples_distributed: Optional[str] = None,
    outcomes: Optional[str] = None,
    followup_actions: Optional[str] = None,
    sentiment: Optional[str] = "Neutral",
    ai_summary: Optional[str] = None,
    ai_suggested_followups: Optional[str] = None,
) -> str:
    """
    Log a new HCP interaction into the database.
    Captures all interaction details including LLM-generated summary and follow-up suggestions.
    Use this tool when the user wants to save/log a new interaction with a healthcare professional.
    """
    db = get_db_session()
    try:
        interaction_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        interaction = Interaction(
            hcp_name=hcp_name,
            interaction_type=interaction_type,
            date=interaction_date,
            attendees=attendees,
            topics_discussed=topics_discussed,
            materials_shared=materials_shared,
            samples_distributed=samples_distributed,
            sentiment=sentiment,
            outcomes=outcomes,
            followup_actions=followup_actions,
            ai_summary=ai_summary,
            ai_suggested_followups=ai_suggested_followups,
        )
        db.add(interaction)
        db.commit()
        db.refresh(interaction)
        return json.dumps({
            "success": True,
            "message": f"Interaction with {hcp_name} logged successfully.",
            "interaction_id": interaction.id,
            "hcp_name": hcp_name,
            "date": date_str,
            "sentiment": sentiment,
        })
    except Exception as e:
        db.rollback()
        return json.dumps({"success": False, "error": str(e)})
    finally:
        db.close()


# ─────────────────────────────────────────────
# TOOL 2: Edit Interaction
# ─────────────────────────────────────────────
@tool
def edit_interaction(
    interaction_id: int,
    hcp_name: Optional[str] = None,
    interaction_type: Optional[str] = None,
    topics_discussed: Optional[str] = None,
    attendees: Optional[str] = None,
    materials_shared: Optional[str] = None,
    samples_distributed: Optional[str] = None,
    sentiment: Optional[str] = None,
    outcomes: Optional[str] = None,
    followup_actions: Optional[str] = None,
    ai_summary: Optional[str] = None,
) -> str:
    """
    Edit/update an existing HCP interaction record by its ID.
    Only the fields provided will be updated; others remain unchanged.
    Use this tool when the user wants to modify or correct a previously logged interaction.
    """
    db = get_db_session()
    try:
        interaction = db.query(Interaction).filter(Interaction.id == interaction_id).first()
        if not interaction:
            return json.dumps({"success": False, "error": f"Interaction ID {interaction_id} not found."})

        if hcp_name: interaction.hcp_name = hcp_name
        if interaction_type: interaction.interaction_type = interaction_type
        if topics_discussed: interaction.topics_discussed = topics_discussed
        if attendees: interaction.attendees = attendees
        if materials_shared: interaction.materials_shared = materials_shared
        if samples_distributed: interaction.samples_distributed = samples_distributed
        if sentiment: interaction.sentiment = sentiment
        if outcomes: interaction.outcomes = outcomes
        if followup_actions: interaction.followup_actions = followup_actions
        if ai_summary: interaction.ai_summary = ai_summary

        db.commit()
        return json.dumps({
            "success": True,
            "message": f"Interaction ID {interaction_id} updated successfully.",
            "updated_fields": {k: v for k, v in {
                "hcp_name": hcp_name, "interaction_type": interaction_type,
                "topics_discussed": topics_discussed, "sentiment": sentiment,
            }.items() if v is not None}
        })
    except Exception as e:
        db.rollback()
        return json.dumps({"success": False, "error": str(e)})
    finally:
        db.close()


# ─────────────────────────────────────────────
# TOOL 3: Get HCP History
# ─────────────────────────────────────────────
@tool
def get_hcp_history(hcp_name: str, limit: int = 5) -> str:
    """
    Retrieve the interaction history for a specific Healthcare Professional (HCP).
    Returns the most recent interactions sorted by date descending.
    Use this tool when the user asks about past interactions with a doctor or HCP.
    """
    db = get_db_session()
    try:
        interactions = (
            db.query(Interaction)
            .filter(Interaction.hcp_name.ilike(f"%{hcp_name}%"))
            .order_by(Interaction.date.desc())
            .limit(limit)
            .all()
        )
        if not interactions:
            return json.dumps({"success": True, "message": f"No interactions found for {hcp_name}.", "interactions": []})

        results = [
            {
                "id": i.id,
                "date": str(i.date),
                "interaction_type": i.interaction_type,
                "topics_discussed": i.topics_discussed,
                "sentiment": i.sentiment,
                "outcomes": i.outcomes,
                "followup_actions": i.followup_actions,
            }
            for i in interactions
        ]
        return json.dumps({"success": True, "hcp_name": hcp_name, "total": len(results), "interactions": results})
    except Exception as e:
        return json.dumps({"success": False, "error": str(e)})
    finally:
        db.close()


# ─────────────────────────────────────────────
# TOOL 4: Suggest Follow-up
# ─────────────────────────────────────────────
@tool
def suggest_followup(
    hcp_name: str,
    topics_discussed: str,
    sentiment: str,
    outcomes: Optional[str] = None,
) -> str:
    """
    Generate AI-powered follow-up action suggestions based on HCP interaction context.
    Returns 3 specific recommended next steps for the sales representative.
    Use this tool when the user asks what they should do next after an HCP meeting.
    """
    suggestions = []

    topics_lower = topics_discussed.lower()
    sentiment_lower = sentiment.lower()

    if sentiment_lower == "positive":
        suggestions.append(f"Schedule a follow-up meeting with {hcp_name} within 2 weeks to maintain momentum.")
        if "trial" in topics_lower or "sample" in topics_lower:
            suggestions.append(f"Send a thank-you email and confirm the product trial plan discussed with {hcp_name}.")
        else:
            suggestions.append(f"Share updated clinical data or product brochure with {hcp_name} via email.")
        suggestions.append(f"Nominate {hcp_name} for advisory board or KOL program based on positive engagement.")

    elif sentiment_lower == "negative":
        suggestions.append(f"Review {hcp_name}'s objections and prepare a tailored counter-proposal before next visit.")
        suggestions.append(f"Escalate feedback from {hcp_name} to your medical affairs team for clinical query resolution.")
        suggestions.append(f"Wait 3–4 weeks before re-engaging {hcp_name}; send educational content in the interim.")

    else:  # Neutral
        suggestions.append(f"Send {hcp_name} relevant product comparison data or peer-reviewed study within 3 days.")
        suggestions.append(f"Follow up with a phone call in 1 week to check if {hcp_name} has additional questions.")
        suggestions.append(f"Invite {hcp_name} to an upcoming webinar or product workshop event.")

    if "oncology" in topics_lower:
        suggestions.append(f"Share the latest Phase III oncology trial results with {hcp_name}.")
    if "compliance" in topics_lower or "regulation" in topics_lower:
        suggestions.append(f"Coordinate with compliance team to address regulatory concerns raised by {hcp_name}.")

    return json.dumps({
        "success": True,
        "hcp_name": hcp_name,
        "sentiment": sentiment,
        "suggested_followups": suggestions[:3],
        "message": "AI follow-up suggestions generated based on interaction context."
    })


# ─────────────────────────────────────────────
# TOOL 5: Analyze Sentiment
# ─────────────────────────────────────────────
@tool
def analyze_sentiment(interaction_text: str, hcp_name: Optional[str] = None) -> str:
    """
    Analyze the sentiment (Positive / Neutral / Negative) of an HCP interaction description.
    Uses keyword and pattern analysis to infer the HCP's attitude and engagement level.
    Use this tool when the user wants to determine how receptive or engaged an HCP was.
    """
    text_lower = interaction_text.lower()

    positive_keywords = [
        "interested", "excited", "agreed", "impressed", "happy", "enthusiastic",
        "willing", "positive", "great", "excellent", "love", "perfect", "yes",
        "definitely", "looking forward", "supportive", "recommend", "prescribe"
    ]
    negative_keywords = [
        "refused", "rejected", "unhappy", "concerned", "skeptical", "doubt",
        "worried", "dissatisfied", "not interested", "no", "never", "avoid",
        "complaint", "problem", "issue", "disappointed", "against"
    ]

    pos_count = sum(1 for kw in positive_keywords if kw in text_lower)
    neg_count = sum(1 for kw in negative_keywords if kw in text_lower)

    if pos_count > neg_count:
        sentiment = "Positive"
        confidence = min(95, 60 + (pos_count - neg_count) * 10)
        explanation = f"Detected {pos_count} positive indicators in the interaction text."
    elif neg_count > pos_count:
        sentiment = "Negative"
        confidence = min(95, 60 + (neg_count - pos_count) * 10)
        explanation = f"Detected {neg_count} negative indicators in the interaction text."
    else:
        sentiment = "Neutral"
        confidence = 70
        explanation = "Balanced or neutral language detected in the interaction text."

    return json.dumps({
        "success": True,
        "hcp_name": hcp_name or "Unknown",
        "sentiment": sentiment,
        "confidence_percent": confidence,
        "explanation": explanation,
        "positive_signals": pos_count,
        "negative_signals": neg_count,
    })


# Export all tools as a list for LangGraph
ALL_TOOLS = [
    log_interaction,
    edit_interaction,
    get_hcp_history,
    suggest_followup,
    analyze_sentiment,
]
