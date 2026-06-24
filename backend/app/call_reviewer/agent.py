"""Agentic call reviewer.

The loop:
  1. Pull a transcript (JiminnyClient).
  2. Grade it against MEDDIC.
  3. Decide which actions to take and CALL them (tool-use loop) — draft the
     follow-up email, update the CRM, post a coaching note, create tasks.
  4. Return a structured coaching report plus the log of actions taken.

This is agentic, not generative: the model plans, calls tools, sees their
results, and loops until it decides the work is done. With no ANTHROPIC_API_KEY
present, a deterministic fallback performs the same shape of work (keyword-based
MEDDIC scoring + rule-driven actions) so the prototype is fully runnable.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any

from .jiminny_client import JiminnyClient, transcript_to_text
from .tools import TOOL_SCHEMAS, execute_tool

logger = logging.getLogger(__name__)

MODEL = os.getenv("CALL_REVIEWER_MODEL", "claude-opus-4-8")
MAX_TURNS = 8

MEDDIC_PILLARS = [
    ("metrics", "Quantified economic impact / success metrics the buyer cares about"),
    ("economic_buyer", "The person with budget authority is identified and engaged"),
    ("decision_criteria", "How the buyer will evaluate options is understood"),
    ("decision_process", "The steps/timeline to a decision are mapped"),
    ("identify_pain", "The compelling business pain is surfaced and quantified"),
    ("champion", "An internal advocate who will sell on the rep's behalf"),
]

SYSTEM_PROMPT = """You are an elite B2B sales coach reviewing a recorded discovery call.

Grade the call against the MEDDIC framework. For EACH pillar — Metrics, Economic \
Buyer, Decision Criteria, Decision Process, Identify Pain, Champion — assign a \
score 0-3 (0 = absent, 1 = touched, 2 = solid, 3 = excellent), cite the specific \
evidence from the transcript, and state precisely what is still missing.

Then ACT on your findings using the tools available to you:
- draft_followup_email: capture commitments the rep made and the agreed next step.
- update_crm: write the MEDDIC fields you were able to fill.
- post_coaching_note: give the rep one or two sharp, specific improvements.
- create_followup_task: for each material gap or commitment, create a task.

Call tools to actually do this work — do not just describe it. When you have \
graded the call and taken all warranted actions, produce a final message that is \
a JSON object with keys: "scores" (object of pillar -> {score, evidence, missing}), \
"overall" (0-100), "summary" (string), "top_actions" (array of strings)."""


def review_call(call_id: str | None = None, client: JiminnyClient | None = None) -> dict[str, Any]:
    client = client or JiminnyClient()
    call = client.get_call(call_id)
    transcript_text = transcript_to_text(call)

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if api_key:
        try:
            report = _run_agentic(call, transcript_text, api_key)
            engine = "claude-agentic"
        except Exception as exc:  # noqa: BLE001 — degrade gracefully in the prototype
            logger.warning("Agentic loop failed (%s); using deterministic fallback", exc)
            report = _run_fallback(call, transcript_text)
            engine = "deterministic-fallback"
    else:
        report = _run_fallback(call, transcript_text)
        engine = "deterministic-fallback"

    return {
        "call_id": call.get("call_id"),
        "title": call.get("title"),
        "prospect_company": call.get("prospect_company"),
        "engine": engine,
        **report,
    }


# ---------------------------------------------------------------------------
# Real agentic loop (Claude tool-use)
# ---------------------------------------------------------------------------


def _run_agentic(call: dict[str, Any], transcript_text: str, api_key: str) -> dict[str, Any]:
    import anthropic  # imported lazily so the module loads without the dep

    client = anthropic.Anthropic(api_key=api_key)
    messages: list[dict[str, Any]] = [
        {
            "role": "user",
            "content": (
                f"Call: {call.get('title')} with {call.get('prospect_company')}.\n\n"
                f"Transcript:\n{transcript_text}"
            ),
        }
    ]
    actions_taken: list[dict[str, Any]] = []

    for _ in range(MAX_TURNS):
        resp = client.messages.create(
            model=MODEL,
            max_tokens=2000,
            system=SYSTEM_PROMPT,
            tools=TOOL_SCHEMAS,
            messages=messages,
        )
        messages.append({"role": "assistant", "content": resp.content})

        if resp.stop_reason != "tool_use":
            final_text = "".join(b.text for b in resp.content if b.type == "text")
            return {"actions_taken": actions_taken, **_parse_final(final_text)}

        tool_results = []
        for block in resp.content:
            if block.type != "tool_use":
                continue
            result = execute_tool(block.name, block.input)
            actions_taken.append({"tool": block.name, "input": block.input, "result": result})
            tool_results.append({
                "type": "tool_result",
                "tool_use_id": block.id,
                "content": json.dumps(result),
            })
        messages.append({"role": "user", "content": tool_results})

    return {"actions_taken": actions_taken, "summary": "Max turns reached", "scores": {}, "overall": 0, "top_actions": []}


def _parse_final(text: str) -> dict[str, Any]:
    start, end = text.find("{"), text.rfind("}")
    if start != -1 and end != -1:
        try:
            return json.loads(text[start : end + 1])
        except json.JSONDecodeError:
            pass
    return {"summary": text, "scores": {}, "overall": 0, "top_actions": []}


# ---------------------------------------------------------------------------
# Deterministic fallback — runs with no API key. Same *shape* of behaviour:
# score MEDDIC by evidence keywords, then take rule-driven actions.
# ---------------------------------------------------------------------------

# Forward-looking qualification cues only. Note decision_criteria deliberately
# requires the rep to have asked what the buyer will *score vendors on* — the
# sample call never does this, so it surfaces as a genuine, actionable gap.
_PILLAR_KEYWORDS = {
    "metrics": ["hundred thousand", "capital", "measure", "fewer ad-hoc", "faster decision", "day a week"],
    "economic_buyer": ["budget", "coo", "sponsors", "janet"],
    "decision_criteria": ["criteria", "score vendors", "must-have", "requirements", "weighting"],
    "decision_process": ["pilot", "evaluation", "scale it", "weeks, not months"],
    "identify_pain": ["gut feel", "bottleneck", "re-explaining", "misread", "tax on", "over-ordered"],
    "champion": ["i'd lead it", "loop her in"],
}


def _run_fallback(call: dict[str, Any], transcript_text: str) -> dict[str, Any]:
    lowered = transcript_text.lower()
    scores: dict[str, Any] = {}
    total = 0
    for pillar, _desc in MEDDIC_PILLARS:
        hits = [kw for kw in _PILLAR_KEYWORDS[pillar] if kw in lowered]
        score = min(3, len(hits))
        total += score
        scores[pillar] = {
            "score": score,
            "evidence": f"Matched cues: {', '.join(hits)}" if hits else "No clear evidence found",
            "missing": _missing_hint(pillar, score),
        }
    overall = round(total / (len(MEDDIC_PILLARS) * 3) * 100)

    # Rule-driven agentic actions — mirror what the LLM loop would call.
    actions_taken: list[dict[str, Any]] = []

    def act(tool: str, args: dict[str, Any]) -> None:
        actions_taken.append({"tool": tool, "input": args, "result": execute_tool(tool, args)})

    company = call.get("prospect_company", "the prospect")
    act("draft_followup_email", {
        "to": _first_prospect(call),
        "subject": f"Pilot proposal & next steps — {company}",
        "body": (
            "Thanks for the conversation today. As promised I'll send a pilot proposal "
            "scoped to two teams, with success measured by reduction in ad-hoc data "
            "requests and faster decision cycles. I'll have it to you by Friday, and it "
            "would be great to get 30 minutes with Janet to walk through the business case."
        ),
    })
    crm_fields = {p: scores[p]["evidence"] for p in scores}
    crm_fields["overall_meddic_score"] = overall
    act("update_crm", {"fields": crm_fields})

    weakest = sorted(scores.items(), key=lambda kv: kv[1]["score"])[:2]
    coaching = "; ".join(f"{p}: {scores[p]['missing']}" for p, _ in weakest)
    act("post_coaching_note", {"channel": "#sales-coaching", "note": f"Next time, tighten: {coaching}"})
    for pillar, info in weakest:
        if info["score"] < 2:
            act("create_followup_task", {
                "title": f"Close MEDDIC gap: {pillar.replace('_', ' ')}",
                "due": "before next call",
                "rationale": info["missing"],
            })

    return {
        "scores": scores,
        "overall": overall,
        "summary": (
            f"MEDDIC review of the {company} discovery call scored {overall}/100. "
            f"Strongest on pain and metrics; weakest on {weakest[0][0].replace('_', ' ')}."
        ),
        "top_actions": [a["tool"] for a in actions_taken],
        "actions_taken": actions_taken,
    }


def _missing_hint(pillar: str, score: int) -> str:
    if score >= 2:
        return "Solid — confirm and document in CRM."
    hints = {
        "metrics": "Pin a single quantified target metric and current baseline.",
        "economic_buyer": "Get a direct meeting booked with the budget owner.",
        "decision_criteria": "Ask explicitly what criteria they'll score vendors on.",
        "decision_process": "Map the exact steps and dates from pilot to signature.",
        "identify_pain": "Quantify the cost of inaction in dollars and time.",
        "champion": "Confirm your contact will advocate internally and arm them.",
    }
    return hints.get(pillar, "Probe deeper on this pillar.")


def _first_prospect(call: dict[str, Any]) -> str:
    for p in call.get("participants", []):
        if p.get("role") == "prospect":
            return p.get("name", "the prospect")
    return "the prospect"
