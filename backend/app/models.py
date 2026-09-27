"""
ORM model for a Deviation record.

Field names intentionally mirror the reference UI 1:1 (Site/Plant,
Date of Occurrence, Title/Short Description, Source, Related Product/
Material, Batch/Lot Number, Detailed Description, Initial Impact,
Initial Severity) so there is no confusing name-mapping between the
form the user sees and what gets persisted.
"""
import uuid
from datetime import datetime, date

from sqlalchemy import Column, String, Text, Date, DateTime
from app.database import Base


def gen_id() -> str:
    return str(uuid.uuid4())


class Deviation(Base):
    __tablename__ = "deviations"

    id = Column(String, primary_key=True, default=gen_id)

    # Section 1: Deviation Information
    site_plant = Column(String, nullable=False)
    date_of_occurrence = Column(Date, nullable=True)
    title = Column(String, nullable=False)
    source = Column(String, nullable=True)
    related_product_material = Column(String, nullable=True)
    batch_lot_number = Column(String, nullable=True)

    # Section 2: Deviation Details
    detailed_description = Column(Text, nullable=False)
    initial_impact = Column(String, nullable=True)
    initial_severity = Column(String, nullable=True)
    ai_reason = Column(Text, nullable=True)  # AI's short justification, kept for audit trail

    status = Column(String, default="Draft")  # Draft | Saved
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
