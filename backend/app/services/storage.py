import uuid
from fastapi import UploadFile
from supabase import create_client

from app.config import settings
from app.services.image_format import web_image

supabase = create_client(settings.supabase_url, settings.supabase_service_key)
BUCKET_NAME = "moments"

async def save_image(file: UploadFile) -> str:
    ext = "jpg"
    filename = f"{uuid.uuid4()}.{ext}"
    
    content = web_image(await file.read(10 * 1024 * 1024 + 1))
    supabase.storage.from_(BUCKET_NAME).upload(
        path=filename,
        file=content,
        file_options={"content-type": "image/jpeg"}
    )
    
    public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(filename)
    return public_url