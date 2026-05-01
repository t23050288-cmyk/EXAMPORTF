from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

class Settings(BaseSettings):
    supabase_url: str = ""
    supabase_service_key: str = ""
    admin_secret: str = "admin@examguard2024"
    inception_api_key: str = ""
    ai_model: str = "google/gemma-2-2b-it"
    ai_base_url: str = "https://integrate.api.nvidia.com/v1"
    allowed_origins: str = "*"

    @property
    def allowed_origins_list(self) -> list[str]:
        if self.allowed_origins == "*": return ["*"]
        return [o.strip() for o in self.allowed_origins.split(",")]

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

@lru_cache()
def get_settings() -> Settings:
    return Settings()
