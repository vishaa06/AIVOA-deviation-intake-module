"""
LangGraph pipeline for the Deviation Intake AI Assistant.

Two nodes, run in sequence (see DECISIONS.md Entry 3 for why they're split):

    raw_text --> [extract_fields] --> [recommend_impact_severity] --> END

State is a plain TypedDict passed between nodes, which LangGraph merges
after each node returns its partial update.
"""
from typing import TypedDict, Optional
from langgraph.graph import StateGraph, END

from app.ai.groq_client import call_groq_json


class DeviationState(TypedDict, total=False):
    raw_text: str
    fields: dict
    recommendation: dict


EXTRACTION_SYSTEM_PROMPT = """You are a pharmaceutical quality-systems assistant. \
You read raw deviation notes, lab results, emails, or incident text from an API \
(Active Pharmaceutical Ingredient) manufacturing plant, and extract structured \
fields for a Deviation Log form.

Return ONLY a JSON object with exactly these keys (use null for anything not \
mentioned in the text — never invent facts that are not present):

{
  "site_plant": string or null,               // e.g. "API Manufacturing Unit"
  "date_of_occurrence": string or null,        // ISO format YYYY-MM-DD if a date is mentioned (e.g. "2026-09-17"). NEVER use DD-MM-YYYY or MM-DD-YYYY here — this value is fed directly into an HTML date input which only accepts YYYY-MM-DD.
  "title": string or null,                     // a short (<12 words) title summarizing the event, e.g. "OOS result for Assay in Batch ABC-001"
  "source": string or null,                    // one of: "Manufacturing", "QC Lab", "QA Review", "Audit", "Customer Complaint", "Other" - pick closest match
  "related_product_material": string or null,
  "batch_lot_number": string or null,
  "detailed_description": string               // a clear, complete rewrite of what happened, where, when, and how it was detected, in full sentences
}
"""

SEVERITY_SYSTEM_PROMPT = """You are a senior Quality Assurance reviewer at an API \
(Active Pharmaceutical Ingredient) manufacturing site, assessing a newly logged \
deviation to give an INITIAL (non-final) impact and severity recommendation. \
A human QA reviewer will always review and can override this.

Return ONLY a JSON object with exactly these keys:

{
  "initial_impact": string,     // one of: "Product Quality", "Patient Safety", "Regulatory Compliance", "No Impact / Minor"
  "initial_severity": string,   // one of: "Critical", "Major", "Minor"
  "reason": string              // ONE or TWO short sentences explaining the recommendation, referencing specifics from the description
}

Guidance: process parameters outside approved/validated ranges are typically at \
least "Major" severity and "Product Quality" impact unless the description \
indicates it was caught before release with no product impact. Escalate to \
"Critical" / "Patient Safety" if there is any indication of release to market, \
sterility, contamination, or mix-up of product/labels.
"""


def extract_fields_node(state: DeviationState) -> DeviationState:
    raw_text = state["raw_text"]
    result = call_groq_json(EXTRACTION_SYSTEM_PROMPT, raw_text)
    return {"fields": result}


def recommend_impact_severity_node(state: DeviationState) -> DeviationState:
    description = state.get("fields", {}).get("detailed_description") or state["raw_text"]
    result = call_groq_json(SEVERITY_SYSTEM_PROMPT, description)
    return {"recommendation": result}


def build_graph():
    graph = StateGraph(DeviationState)
    graph.add_node("extract_fields", extract_fields_node)
    graph.add_node("recommend_impact_severity", recommend_impact_severity_node)
    graph.set_entry_point("extract_fields")
    graph.add_edge("extract_fields", "recommend_impact_severity")
    graph.add_edge("recommend_impact_severity", END)
    return graph.compile()


# Compiled once at import time and reused across requests (cheap, stateless graph).
deviation_graph = build_graph()


def run_extraction_pipeline(raw_text: str) -> dict:
    """Runs the full graph and returns {"fields": {...}, "recommendation": {...}}."""
    final_state = deviation_graph.invoke({"raw_text": raw_text})
    return {
        "fields": final_state.get("fields", {}),
        "recommendation": final_state.get("recommendation", {}),
    }
