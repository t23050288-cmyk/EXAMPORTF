import os
from supabase import create_client, Client
from python_backend.core.config import get_settings

settings = get_settings()

def get_supabase() -> Client:
    url = settings.supabase_url or os.getenv("SUPABASE_URL")
    key = settings.supabase_service_key or os.getenv("SUPABASE_SERVICE_KEY")
    if not url or not key:
        raise ValueError("Supabase URL and Service Key must be configured")
    return create_client(url, key)
