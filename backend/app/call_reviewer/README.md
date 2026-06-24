# Agentic Sales Call Reviewer

Reviews recorded sales calls **agentically** — it doesn't just summarize, it
grades the call against **MEDDIC**, decides what's missing, and takes real
actions (drafts the follow-up email, updates the CRM, posts a coaching note,
creates tasks for gaps).

## Why "agentic" not "generative"

- *Generative* = one prompt → prose. No decisions, no side effects.
- *Agentic* = the model **plans, calls tools, sees results, and loops** until
  the work is done. Here it grades MEDDIC → chooses which actions warrant a
  tool call → executes them → returns a structured report + an action log.

## Architecture

```
Jiminny (REST API)                 ┌─────────────────────────────┐
  └─ JiminnyClient ──transcript──> │  agent.review_call()        │
       (mock | live)               │   1. grade MEDDIC           │
                                   │   2. tool-use loop:         │ ──> draft_followup_email
                                   │      decide + call actions  │ ──> update_crm
                                   │   3. structured report      │ ──> post_coaching_note
                                   └─────────────────────────────┘ ──> create_followup_task
```

## Run it

```bash
# Offline — deterministic MEDDIC scoring + simulated actions, no keys needed:
python -c "from app.call_reviewer import review_call; import json; print(json.dumps(review_call(), indent=2))"

# Real agentic loop (Claude tool-use):
export ANTHROPIC_API_KEY=sk-...
# Live transcripts from Jiminny:
export JIMINNY_MODE=live JIMINNY_API_KEY=... JIMINNY_BASE_URL=https://api.jiminny.com
```

## API

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/api/v1/call-reviewer/calls`  | List recent calls (mock returns the bundled sample) |
| `POST` | `/api/v1/call-reviewer/review` | Run the agentic MEDDIC review + actions. Body: `{"call_id": "..."}` (optional) |

## Wiring to production

| Piece | Mock now | Go live |
|-------|----------|---------|
| Transcript source | `sample_call.json` | `JIMINNY_MODE=live` + API key (adjust `_to_call()` to your tenant's response shape) |
| Reasoning | deterministic keyword scorer | `ANTHROPIC_API_KEY` → Claude tool-use loop |
| `draft_followup_email` | logs intent | Gmail (`mcp__Gmail__create_draft`) |
| `update_crm` | logs intent | Salesforce / HubSpot opportunity |
| `post_coaching_note` | logs intent | Slack (`mcp__Slack__slack_send_message`) |
| `create_followup_task` | logs intent | Notion (`mcp__Notion__notion-create-pages`) |

The MEDDIC framework, scoring rubric, and coaching prompts live in `agent.py`
(`SYSTEM_PROMPT`, `MEDDIC_PILLARS`) — swap in your own playbook there.
```
