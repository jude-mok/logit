from pydantic import BaseModel
from typing import Optional

class UserCreate(BaseModel):
    email : str
    provider: str = "email"
    password: Optional[str] = None

class LoginResponse(BaseModel):
    access_token : str
    refresh_token : str
    token_type : str = "bearer"

class UserResponse(BaseModel):
    id: int
    email : str
    provider: str
    created_at : int

    class Config:
        from_attributes = True