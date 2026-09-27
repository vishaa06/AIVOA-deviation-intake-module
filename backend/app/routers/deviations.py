from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/api/deviations", tags=["deviations"])


@router.post("", response_model=schemas.DeviationOut)
def create_deviation(payload: schemas.DeviationCreate, db: Session = Depends(get_db)):
    deviation = models.Deviation(**payload.model_dump())
    db.add(deviation)
    db.commit()
    db.refresh(deviation)
    return deviation


@router.get("", response_model=List[schemas.DeviationOut])
def list_deviations(db: Session = Depends(get_db)):
    return db.query(models.Deviation).order_by(models.Deviation.created_at.desc()).all()


@router.get("/{deviation_id}", response_model=schemas.DeviationOut)
def get_deviation(deviation_id: str, db: Session = Depends(get_db)):
    deviation = db.query(models.Deviation).filter(models.Deviation.id == deviation_id).first()
    if not deviation:
        raise HTTPException(status_code=404, detail="Deviation not found")
    return deviation
