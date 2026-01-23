from pydantic_settings import BaseSettings
from pydantic import Field, AliasChoices
from pathlib import Path
from dotenv import load_dotenv

# Get the backend directory (parent of app/)
BACKEND_DIR = Path(__file__).parent.parent.parent.resolve()
ENV_FILE = BACKEND_DIR / ".env"

# Explicitly load .env file before Settings initialization
load_dotenv(ENV_FILE)

class Settings(BaseSettings):
    supabase_url: str = Field(..., alias="SUPABASE_URL")
    supabase_service_role_key: str = Field(
        ...,
        validation_alias=AliasChoices(
            "SUPABASE_SERVICE_ROLE_KEY",
            "SUPABASE_SERVICE_KEY",
            "SUPABASE_KEY",
        ),
    )
    cors_origins: str = Field("http://localhost:3000", alias="CORS_ORIGINS")

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    class Config:
        env_file = str(ENV_FILE)
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()
