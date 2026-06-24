"""Tests for the agentic call reviewer (offline / deterministic path)."""

from app.call_reviewer import review_call
from app.call_reviewer.jiminny_client import JiminnyClient, transcript_to_text
from app.call_reviewer.tools import execute_tool


def test_mock_client_loads_sample():
    call = JiminnyClient(mode="mock").get_call()
    assert call["prospect_company"] == "Northwind Analytics"
    assert len(call["transcript"]) > 5
    assert "[REP]" in transcript_to_text(call)


def test_review_scores_all_meddic_pillars():
    report = review_call()
    assert set(report["scores"]) == {
        "metrics", "economic_buyer", "decision_criteria",
        "decision_process", "identify_pain", "champion",
    }
    assert 0 <= report["overall"] <= 100


def test_review_surfaces_decision_criteria_gap_and_acts():
    report = review_call()
    # The sample call never establishes forward decision criteria — it should be the gap.
    assert report["scores"]["decision_criteria"]["score"] < 2
    tools_called = {a["tool"] for a in report["actions_taken"]}
    assert "draft_followup_email" in tools_called
    assert "create_followup_task" in tools_called  # a task is created for the gap


def test_execute_tool_handles_unknown():
    assert execute_tool("nope", {})["status"] == "error"
