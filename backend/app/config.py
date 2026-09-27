"""
Central config, loaded from environment variables (.env).
Keeping this in one place means every module (db, ai, routers) reads
settings the same way instead of scattering os.getenv() calls everywhere.
"""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    groq_api_key: str = ""
    groq_model: str = "openai/gpt-oss-120b"
    database_url: str = "sqlite:///./deviation.db"
    frontend_origins: str = "http://localhost:5173,http://localhost:3000"

    class Config:
        env_file = ".env"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.frontend_origins.split(",") if o.strip()]


settings = Settings()
