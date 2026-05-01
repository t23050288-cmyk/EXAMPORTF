from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
import os

class Settings(BaseSettings):
    # Supabase
    supabase_url: str = ""
    supabase_service_key: str = ""
    
    # Admin
    admin_secret: str = "admin@examguard2024"

    # AI
    inception_api_key: str = ""
    ai_model: str = "google/gemma-2-2b-it"
    ai_base_url: str = "https://integrate.api.nvidia.com/v1"

    # CORS
    allowed_origins: str = "http://localhost:3000,http://localhost:5173,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:5173,https://examportf.vercel.app,https://examportf-git-main-t23050288-cmyks-projects.vercel.app"

    @property
    def allowed_origins_list(self) -> list[str]:
        raw_list = [o.strip() for o in self.allowed_origins.split(",")]
        cleaned = []
        for origin in raw_list:
            cleaned.append(origin)
            if origin.endswith("/"): cleaned.append(origin[:-1])
            else: cleaned.append(origin + "/")
        return list(set(cleaned))

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

@lru_cache()
def get_settings() -> Settings:
    return Settings()
