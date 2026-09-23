from io import BytesIO
from PIL import Image, ImageOps, UnidentifiedImageError
from pillow_heif import register_heif_opener
from fastapi import HTTPException

register_heif_opener()


def web_image(content: bytes) -> bytes:
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Choose a photo under 10 MB")
    try:
        with Image.open(BytesIO(content)) as source:
            if source.width * source.height > 40_000_000:
                raise HTTPException(status_code=413, detail="Photo dimensions are too large")
            image = ImageOps.exif_transpose(source).convert("RGB")
            image.thumbnail((2400, 2400))
            output = BytesIO()
            image.save(output, format="JPEG", quality=90)
            return output.getvalue()
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError):
        raise HTTPException(status_code=422, detail="This photo could not be decoded")
