from io import BytesIO
from PIL import Image
from fastapi import HTTPException
import pytest
from app.services.image_format import web_image


def test_heic_is_converted_to_jpeg():
    image = Image.new('RGB', (64, 48), 'white')
    source = BytesIO()
    image.save(source, format='HEIF')
    result = Image.open(BytesIO(web_image(source.getvalue())))
    assert result.format == 'JPEG'
    assert result.size == (64, 48)
    assert not result.getexif()


def test_rejects_invalid_image():
    with pytest.raises(HTTPException) as error:
        web_image(b'not an image')
    assert error.value.status_code == 422
