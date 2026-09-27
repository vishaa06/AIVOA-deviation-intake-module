from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine
from app import models  # noqa: F401 - ensures models are registered before create_all
from app.routers import deviations, ai

Base.metadata.create_all(bind=engine)

app = FastAPI(title="AIVOA Deviation Intake API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(deviations.router)
app.include_router(ai.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
