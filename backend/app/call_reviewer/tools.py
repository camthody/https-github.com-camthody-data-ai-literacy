"""Action tools the agent can invoke after grading a call.

These are the *agentic* part: rather than just emitting prose, the agent decides
which of these to call and with what arguments. In this prototype they record
the intended action and return a confirmation; each has a clear integration
point for the real system (Gmail, Slack, CRM, task tracker).
"""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Tool schemas advertised to the model (Anthropic tool-use format).
# ---------------------------------------------------------------------------

TOOL_SCHEMAS: list[dict[str, Any]] = [
    {
        "name": "draft_followup_email",
        "description": "Draft a follow-up email to the prospect summarizing next steps and any commitments the rep made on the call.",
        "input_schema": {
            "type": "object",
            "properties": {
                "to": {"type": "string", "description": "Primary recipient name or email"},
                "subject": {"type": "string"},
                "body": {"type": "string", "description": "Full email body, ready to send"},
            },
            "required": ["to", "subject", "body"],
        },
    },
    {
        "name": "update_crm",
        "description": "Write the MEDDIC qualification fields back to the CRM opportunity record.",
        "input_schema": {
            "type": "object",
            "properties": {
                "fields": {
                    "type": "object",
                    "description": "Map of CRM field -> value, e.g. {'economic_buyer': 'Janet (COO)', 'next_step': 'Pilot proposal by Fri'}",
                },
            },
            "required": ["fields"],
        },
    },
    {
        "name": "post_coaching_note",
        "description": "Post a private coaching note for the rep (e.g. to a Slack channel) highlighting what to improve next time.",
        "input_schema": {
            "type": "object",
            "properties": {
                "channel": {"type": "string", "description": "Slack channel or DM target"},
                "note": {"type": "string", "description": "Concise, actionable coaching note"},
            },
            "required": ["note"],
        },
    },
    {
        "name": "create_followup_task",
        "description": "Create a task for an unaddressed gap or a commitment the rep made on the call.",
        "input_schema": {
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "due": {"type": "string", "description": "Due date or relative timing, e.g. 'Friday'"},
                "rationale": {"type": "string", "description": "Why this task matters (which MEDDIC gap it closes)"},
            },
            "required": ["title", "rationale"],
        },
    },
]


# ---------------------------------------------------------------------------
# Tool implementations. Mock-mode: record + echo. Replace bodies to go live.
# ---------------------------------------------------------------------------


def draft_followup_email(to: str, subject: str, body: str) -> dict[str, Any]:
    # TODO(live): wire to Gmail — mcp__Gmail__create_draft is connected to this session.
    logger.info("📧 [mock] draft email to %s — %s", to, subject)
    return {"status": "drafted", "to": to, "subject": subject, "chars": len(body)}


def update_crm(fields: dict[str, Any]) -> dict[str, Any]:
    # TODO(live): write to your CRM (Salesforce/HubSpot) opportunity record.
    logger.info("🗂️  [mock] CRM update: %s", ", ".join(fields.keys()))
    return {"status": "updated", "fields_written": list(fields.keys())}


def post_coaching_note(note: str, channel: str = "#sales-coaching") -> dict[str, Any]:
    # TODO(live): wire to Slack — mcp__Slack__slack_send_message is connected.
    logger.info("💬 [mock] coaching note -> %s", channel)
    return {"status": "posted", "channel": channel}


def create_followup_task(title: str, rationale: str, due: str = "TBD") -> dict[str, Any]:
    # TODO(live): wire to Notion / task tracker — mcp__Notion__notion-create-pages is connected.
    logger.info("✅ [mock] task: %s (due %s)", title, due)
    return {"status": "created", "title": title, "due": due}


# Dispatch table used by the agent loop.
TOOL_IMPLS = {
    "draft_followup_email": draft_followup_email,
    "update_crm": update_crm,
    "post_coaching_note": post_coaching_note,
    "create_followup_task": create_followup_task,
}


def execute_tool(name: str, args: dict[str, Any]) -> dict[str, Any]:
    impl = TOOL_IMPLS.get(name)
    if impl is None:
        return {"status": "error", "error": f"unknown tool {name}"}
    try:
        return impl(**args)
    except TypeError as exc:
        return {"status": "error", "error": str(exc)}
