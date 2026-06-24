"""Jiminny client — fetches call transcripts.

Two modes:
- mock (default): loads a bundled sample transcript so the agentic loop runs
  with zero external dependencies.
- live: calls the Jiminny REST API. Jiminny is NOT a wired MCP integration, so
  this talks to their HTTP API directly with an API key. Endpoints/shape vary by
  Jiminny plan — adjust `_to_call()` to match your account's response.

Switch with env:
    JIMINNY_MODE=live
    JIMINNY_API_KEY=...
    JIMINNY_BASE_URL=https://api.jiminny.com   # adjust to your tenant
"""

from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Any

import requests

logger = logging.getLogger(__name__)

_SAMPLE_PATH = Path(__file__).parent / "sample_call.json"


class JiminnyClient:
    def __init__(
        self,
        mode: str | None = None,
        api_key: str | None = None,
        base_url: str | None = None,
    ) -> None:
        self.mode = (mode or os.getenv("JIMINNY_MODE", "mock")).lower()
        self.api_key = api_key or os.getenv("JIMINNY_API_KEY")
        self.base_url = (base_url or os.getenv("JIMINNY_BASE_URL", "https://api.jiminny.com")).rstrip("/")
        if self.mode == "live" and not self.api_key:
            raise ValueError("JIMINNY_MODE=live requires JIMINNY_API_KEY")

    # ---- public API ---------------------------------------------------

    def get_call(self, call_id: str | None = None) -> dict[str, Any]:
        """Return a normalized call dict with a flat `transcript` list."""
        if self.mode == "mock":
            return self._load_sample()
        return self._fetch_live(call_id)

    def list_recent_calls(self, limit: int = 10) -> list[dict[str, Any]]:
        if self.mode == "mock":
            sample = self._load_sample()
            return [{
                "call_id": sample["call_id"],
                "title": sample["title"],
                "date": sample["date"],
                "prospect_company": sample.get("prospect_company"),
            }]
        resp = self._get("/v1/conversations", params={"limit": limit})
        return resp.get("conversations", resp.get("data", []))

    # ---- internals ----------------------------------------------------

    def _load_sample(self) -> dict[str, Any]:
        with _SAMPLE_PATH.open() as fh:
            return json.load(fh)

    def _fetch_live(self, call_id: str | None) -> dict[str, Any]:
        if not call_id:
            recent = self.list_recent_calls(limit=1)
            if not recent:
                raise RuntimeError("No Jiminny calls found")
            call_id = recent[0]["call_id"]
        raw = self._get(f"/v1/conversations/{call_id}")
        return self._to_call(raw)

    def _to_call(self, raw: dict[str, Any]) -> dict[str, Any]:
        """Map a raw Jiminny payload into our normalized shape.

        Adjust the field names below to match your tenant's API response.
        """
        segments = raw.get("transcript") or raw.get("segments") or []
        transcript = [
            {
                "speaker": seg.get("speaker_name") or seg.get("speaker", "unknown"),
                "role": "rep" if seg.get("is_rep") or seg.get("internal") else "prospect",
                "ts": seg.get("start_time") or seg.get("ts", 0),
                "text": seg.get("text", ""),
            }
            for seg in segments
        ]
        return {
            "call_id": raw.get("id") or raw.get("conversation_id"),
            "title": raw.get("title", "Untitled call"),
            "date": raw.get("started_at") or raw.get("date"),
            "duration_seconds": raw.get("duration_seconds", 0),
            "rep": raw.get("host_name") or raw.get("rep"),
            "prospect_company": raw.get("account_name") or raw.get("company"),
            "participants": raw.get("participants", []),
            "transcript": transcript,
        }

    def _get(self, path: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        url = f"{self.base_url}{path}"
        headers = {"Authorization": f"Bearer {self.api_key}", "Accept": "application/json"}
        resp = requests.get(url, headers=headers, params=params, timeout=30)
        resp.raise_for_status()
        return resp.json()


def transcript_to_text(call: dict[str, Any]) -> str:
    """Render the transcript as plain speaker-tagged text for the model."""
    lines = []
    for turn in call.get("transcript", []):
        tag = "REP" if turn.get("role") == "rep" else "PROSPECT"
        lines.append(f"[{tag}] {turn['speaker']}: {turn['text']}")
    return "\n".join(lines)
