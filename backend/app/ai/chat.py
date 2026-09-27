"""
Powers the 'Ask me anything about deviations' chat box.

DECISION: this is a separate JSON-mode call (not the extraction/severity
graph) because it needs the CURRENT form state as input, and its job is
conversational — answer OR edit, not always both. Returning strict JSON
with an `updates` dict is what lets the frontend apply an edit like
"change the batch number to ADC-1101" without the user touching the form,
while a plain question ("why did you pick Major?") comes back with an
empty `updates` object and just a text reply.
"""
from app.ai.groq_client import call_groq_json

EDITABLE_FIELDS = [
    "site_plant",
    "date_of_occurrence",
    "title",
    "source",
    "related_product_material",
    "batch_lot_number",
    "detailed_description",
    "initial_impact",
    "initial_severity",
]

CHAT_SYSTEM_PROMPT = f"""You are the AI Deviation Assistant embedded in a pharmaceutical \
Deviation Log form. You can see the CURRENT form values (given as JSON context) and the \
user's message. You have two jobs:

1. If the user is asking a QUESTION (e.g. "why did you pick Major severity?", "what does \
OOS mean?"), just answer helpfully in `reply` and return an empty `updates` object.

2. If the user is asking you to CHANGE something on the form (e.g. "change the batch number \
to ADC-1101", "actually the site is Plant 2", "make the description mention it was caught by QC"), \
figure out which field(s) they mean and what the new value should be, confirm it briefly in \
`reply`, and put ONLY the changed field(s) in `updates`.

Valid field names for `updates` (use these exact keys, only include ones that changed):
{EDITABLE_FIELDS}

CRITICAL: `updates` must contain ONLY the field(s) the user explicitly asked to change —
never echo back, restate, or "helpfully" include fields that are already correct, even if
you can see their current value in the context. Including an unrelated field in `updates`
will OVERWRITE that field's real data, even if you set it to the same value, an empty
string, or null. If you are not 100% sure a field should change, leave it out of `updates`
entirely.

Example — user says "change the batch number to ADC-1101" and current form has
site_plant="Plant 2", batch_lot_number="AZR-6120":
CORRECT:   {{"reply": "Updated the batch number to ADC-1101.", "updates": {{"batch_lot_number": "ADC-1101"}}}}
WRONG:     {{"reply": "...", "updates": {{"site_plant": "Plant 2", "batch_lot_number": "ADC-1101", "title": null}}}}

Return ONLY a JSON object of the form:
{{
  "reply": "short natural-language response confirming what you did or answering the question",
  "updates": {{}}   // e.g. {{"batch_lot_number": "ADC-1101"}}, or {{}} if nothing should change
}}

Never invent a change the user did not ask for. If the request is ambiguous about which field \
to change, ask for clarification in `reply` and return empty `updates`.
"""


def run_chat(message: str, form_context: dict | None) -> dict:
    user_prompt = f"User message: {message}\n\nCurrent form values: {form_context or {}}"
    result = call_groq_json(CHAT_SYSTEM_PROMPT, user_prompt)
    raw_updates = result.get("updates") or {}
    # Belt-and-suspenders: only keep known fields with a real, non-empty value.
    # (The frontend also filters this way — see deviationSlice.applyChatUpdates —
    # but filtering here too means a non-browser client gets the same protection.)
    safe_updates = {
        k: v for k, v in raw_updates.items()
        if k in EDITABLE_FIELDS and v not in (None, "")
    }
    return {
        "reply": result.get("reply", ""),
        "updates": safe_updates,
    }
