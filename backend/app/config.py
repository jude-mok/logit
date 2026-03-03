from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    secret_key: str
    google_client_id: str
    #aws_access_key_id: str
    #aws_secret_access_key: str
    #aws_bucket_name: str
    #aws_region: str = "ap-northeast-2"

    # JWT settings
    #algorithm: str = "HS256"
    #access_token_expire_minutes: int = 60 * 24 * 7  # 7 days

    class Config:
        env_file = ".env"


settings = Settings()
