"""
Thin wrapper around the Groq SDK.

DECISION: isolated in its own module so the LangGraph nodes don't need to
know *how* we talk to the model provider. If we ever swap Groq for another
OpenAI-compatible provider, only this file changes.
"""
import json
from groq import Groq
from app.config import settings

_client = Groq(api_key=settings.groq_api_key) if settings.groq_api_key else None


def call_groq_json(system_prompt: str, user_prompt: str) -> dict:
    """Call Groq chat completion, forcing JSON-object output, and parse it.

    Raises RuntimeError if no API key is configured (fails loudly rather
    than silently returning fake data).
    """
    if _client is None:
        raise RuntimeError(
            "GROQ_API_KEY is not set. Add it to backend/.env (see .env.example)."
        )

    completion = _client.chat.completions.create(
        model=settings.groq_model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        response_format={"type": "json_object"},
        temperature=0.2,  # low temperature: we want consistent structured extraction, not creativity
    )
    raw = completion.choices[0].message.content
    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        raise RuntimeError(f"Groq returned non-JSON output: {raw[:300]}") from e


def call_groq_text(system_prompt: str, user_prompt: str) -> str:
    """Plain text completion, used for the free-form chat assistant."""
    if _client is None:
        raise RuntimeError(
            "GROQ_API_KEY is not set. Add it to backend/.env (see .env.example)."
        )
    completion = _client.chat.completions.create(
        model=settings.groq_model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.4,
    )
    return completion.choices[0].message.content
