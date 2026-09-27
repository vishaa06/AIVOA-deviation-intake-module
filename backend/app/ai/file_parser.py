"""
Converts an uploaded file (pdf/docx/txt) into plain text, which is then fed
into the SAME LangGraph pipeline used for pasted text (see DECISIONS.md
Entry 7 — one shared extraction path regardless of input method).
"""
import io
from pypdf import PdfReader
from docx import Document


def extract_text_from_upload(filename: str, content: bytes) -> str:
    lower = filename.lower()

    if lower.endswith(".pdf"):
        reader = PdfReader(io.BytesIO(content))
        return "\n".join(page.extract_text() or "" for page in reader.pages)

    if lower.endswith(".docx"):
        doc = Document(io.BytesIO(content))
        return "\n".join(p.text for p in doc.paragraphs)

    if lower.endswith(".txt"):
        return content.decode("utf-8", errors="ignore")

    raise ValueError(
        f"Unsupported file type for '{filename}'. Supported: PDF, DOCX, TXT."
    )
