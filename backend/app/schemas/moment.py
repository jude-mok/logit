from pydantic import BaseModel, ConfigDict
from typing import Optional


class EditRequest(BaseModel):
    new_comment : str
    
class MomentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    image_path: str
    comment: Optional[str] = None
    is_starred: bool
    created_at: int