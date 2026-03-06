import uuid
from fastapi import UploadFile
from supabase import create_client

from app.config import settings

supabase = create_client(settings.supabase_url, settings.supabase_service_key)
BUCKET_NAME = "moments"

async def save_image(file: UploadFile) -> str:
    ext = file.filename.split(".")[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    
    content = await file.read()
    supabase.storage.from_(BUCKET_NAME).upload(
        path=filename,
        file=content,
        file_options={"content-type": file.content_type}
    )
    
    public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(filename)
    return public_url