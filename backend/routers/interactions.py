from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from models.database import get_db
from models.interaction import Interaction
from schemas.interaction import InteractionCreate, InteractionUpdate, InteractionResponse
from agent import run_agent

router = APIRouter()

@router.post("/", response_model=dict)
def create_interaction(payload: InteractionCreate, db: Session = Depends(get_db)):
    """Create a new HCP interaction (from structured form)."""
    try:
        # Use AI to generate summary and follow-up suggestions
        context = f"""
        Log this HCP interaction and suggest follow-ups:
        HCP: {payload.hcp_name}
        Type: {payload.interaction_type}
        Date: {payload.date}
        Topics: {payload.topics_discussed}
        Sentiment: {payload.sentiment}
        Outcomes: {payload.outcomes}
        """
        agent_result = run_agent(context)
        ai_suggestions = agent_result.get("extracted_data", {}).get("suggested_followups", [])
        ai_summary = f"Interaction with {payload.hcp_name} on {payload.date} via {payload.interaction_type}. Topics: {payload.topics_discussed}."

        interaction = Interaction(
            hcp_name=payload.hcp_name,
            interaction_type=payload.interaction_type,
            date=payload.date,
            attendees=payload.attendees,
            topics_discussed=payload.topics_discussed,
            materials_shared=payload.materials_shared,
            samples_distributed=payload.samples_distributed,
            sentiment=payload.sentiment,
            outcomes=payload.outcomes,
            followup_actions=payload.followup_actions,
            ai_summary=ai_summary,
            ai_suggested_followups=str(ai_suggestions) if ai_suggestions else None,
        )
        db.add(interaction)
        db.commit()
        db.refresh(interaction)
        return {"success": True, "interaction": interaction.to_dict()}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=dict)
def get_interactions(
    hcp_name: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """Get all interactions, optionally filtered by HCP name."""
    query = db.query(Interaction)
    if hcp_name:
        query = query.filter(Interaction.hcp_name.ilike(f"%{hcp_name}%"))
    interactions = query.order_by(Interaction.created_at.desc()).offset(skip).limit(limit).all()
    return {"success": True, "interactions": [i.to_dict() for i in interactions], "total": len(interactions)}

@router.get("/{interaction_id}", response_model=dict)
def get_interaction(interaction_id: int, db: Session = Depends(get_db)):
    """Get a single interaction by ID."""
    interaction = db.query(Interaction).filter(Interaction.id == interaction_id).first()
    if not interaction:
        raise HTTPException(status_code=404, detail="Interaction not found")
    return {"success": True, "interaction": interaction.to_dict()}

@router.put("/{interaction_id}", response_model=dict)
def update_interaction(interaction_id: int, payload: InteractionUpdate, db: Session = Depends(get_db)):
    """Update an existing interaction."""
    interaction = db.query(Interaction).filter(Interaction.id == interaction_id).first()
    if not interaction:
        raise HTTPException(status_code=404, detail="Interaction not found")
    for field, value in payload.dict(exclude_none=True).items():
        setattr(interaction, field, value)
    db.commit()
    db.refresh(interaction)
    return {"success": True, "interaction": interaction.to_dict()}

@router.delete("/{interaction_id}", response_model=dict)
def delete_interaction(interaction_id: int, db: Session = Depends(get_db)):
    """Delete an interaction record."""
    interaction = db.query(Interaction).filter(Interaction.id == interaction_id).first()
    if not interaction:
        raise HTTPException(status_code=404, detail="Interaction not found")
    db.delete(interaction)
    db.commit()
    return {"success": True, "message": f"Interaction {interaction_id} deleted."}
