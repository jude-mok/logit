from pydantic import BaseModel
from typing import Optional

class MonentComment(BaseModel):
    comment : Optional[BaseModel] = None

class MomentResponse(BaseModel):
    id: int
    image_path: str
    comment: Optional[str] = None
    is_starred: bool
    created_at: int

    class Config:
        from_attributes = True