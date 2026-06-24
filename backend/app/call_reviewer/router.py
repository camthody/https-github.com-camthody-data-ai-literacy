"""FastAPI routes for the agentic call reviewer."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from .agent import review_call
from .jiminny_client import JiminnyClient

router = APIRouter(prefix="/api/v1/call-reviewer", tags=["call-reviewer"])


class ReviewRequest(BaseModel):
    call_id: str | None = None


@router.get("/calls")
async def list_calls():
    """List recent calls available to review (mock returns the bundled sample)."""
    return {"calls": JiminnyClient().list_recent_calls()}


@router.post("/review")
async def review(req: ReviewRequest):
    """Run the agentic MEDDIC review + actions on a call."""
    try:
        return review_call(req.call_id)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc
