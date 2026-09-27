from fastapi import APIRouter, UploadFile, File, HTTPException

from app.schemas import (
    ExtractTextRequest,
    ExtractionResponse,
    ExtractedFields,
    ImpactSeverityRecommendation,
    ChatRequest,
    ChatResponse,
)
from app.ai.graph import run_extraction_pipeline
from app.ai.file_parser import extract_text_from_upload
from app.ai.chat import run_chat

router = APIRouter(prefix="/api/ai", tags=["ai"])


def _pipeline_result_to_response(result: dict) -> ExtractionResponse:
    return ExtractionResponse(
        fields=ExtractedFields(**result.get("fields", {})),
        recommendation=ImpactSeverityRecommendation(**result.get("recommendation", {})),
    )


@router.post("/extract", response_model=ExtractionResponse)
def extract_from_text(payload: ExtractTextRequest):
    """Pasted text / email -> AI extraction -> form fields + impact/severity recommendation."""
    try:
        result = run_extraction_pipeline(payload.text)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    return _pipeline_result_to_response(result)


@router.post("/extract-file", response_model=ExtractionResponse)
async def extract_from_file(file: UploadFile = File(...)):
    """Uploaded document (pdf/docx/txt) -> parsed text -> same extraction pipeline."""
    content = await file.read()
    try:
        text = extract_text_from_upload(file.filename, content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not text.strip():
        raise HTTPException(status_code=400, detail="Could not extract any text from the uploaded file.")

    try:
        result = run_extraction_pipeline(text)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    return _pipeline_result_to_response(result)


@router.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest):
    """Free-form 'ask me anything about deviations' box in the AI panel.
    Can also apply edits the user asks for in plain English (see ai/chat.py)."""
    try:
        result = run_chat(payload.message, payload.context)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    return ChatResponse(reply=result["reply"], updates=result["updates"] or None)
