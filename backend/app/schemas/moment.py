from pydantic import BaseModel
from typing import Optional


class EditRequest(BaseModel):
    new_comment : str
    
class MomentResponse(BaseModel):
    id: int
    image_path: str
    comment: Optional[str] = None
    is_starred: bool
    created_at: int

    class Config:
        from_attributes = True