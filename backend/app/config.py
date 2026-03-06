from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")
    database_url: str
    secret_key: str
    google_client_id: str
    supabase_url: str
    supabase_service_key: str


settings = Settings()
