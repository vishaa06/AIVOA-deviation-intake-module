from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator


# ---------- AI extraction ----------

class ExtractTextRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Pasted deviation notes / email / lab result text")


class ExtractedFields(BaseModel):
    """What the AI pulls out of raw text. All optional because source text
    may not mention every field — the user fills gaps manually afterward."""
    site_plant: Optional[str] = None
    date_of_occurrence: Optional[str] = None  # kept as string (dd-mm-yyyy) from LLM, parsed later
    title: Optional[str] = None
    source: Optional[str] = None
    related_product_material: Optional[str] = None
    batch_lot_number: Optional[str] = None
    detailed_description: Optional[str] = None


class ImpactSeverityRecommendation(BaseModel):
    initial_impact: Optional[str] = None
    initial_severity: Optional[str] = None
    reason: Optional[str] = None


class ExtractionResponse(BaseModel):
    fields: ExtractedFields
    recommendation: ImpactSeverityRecommendation


# ---------- AI chat (ask assistant a question) ----------

class ChatRequest(BaseModel):
    message: str
    # optional current form context so the assistant can answer questions like
    # "why did you pick Major severity?" grounded in what's on screen
    context: Optional[dict] = None


class FieldUpdate(BaseModel):
    field: str
    value: str


class ChatResponse(BaseModel):
    reply: str
    updates: Optional[dict] = None  # field -> new value, only present when the user asked for an edit
    field_update: Optional[FieldUpdate] = None


# ---------- Deviation CRUD ----------

class DeviationCreate(BaseModel):
    site_plant: str
    date_of_occurrence: Optional[date] = None
    title: str
    source: Optional[str] = None
    related_product_material: Optional[str] = None
    batch_lot_number: Optional[str] = None
    detailed_description: str
    initial_impact: Optional[str] = None
    initial_severity: Optional[str] = None
    ai_reason: Optional[str] = None
    status: str = "Draft"

    @field_validator("date_of_occurrence", mode="before")
    @classmethod
    def empty_string_to_none(cls, v):
        # BUG FIX: the frontend's <input type="date"> sends "" (not null) when
        # a date hasn't been set, e.g. the AI didn't extract one. Pydantic's
        # `date` type rejects "" outright with a 422 ("input is too short").
        # Treating an empty/blank string as "no date" here matches what the
        # frontend actually means by it.
        if v == "" or v is None:
            return None
        return v


class DeviationOut(DeviationCreate):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
