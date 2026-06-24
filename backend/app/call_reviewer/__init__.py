"""Agentic sales call reviewer — grades calls against MEDDIC and acts on gaps."""

from .agent import review_call
from .jiminny_client import JiminnyClient

__all__ = ["review_call", "JiminnyClient"]
