from pydantic import BaseModel
from typing import Optional

class UserCreate(BaseModel):
    email : str
    provider : str = "email"
    password : Optional[str] = None
    user_name : str

class UserUpdate(BaseModel):
    user_name : str
    new_passowrd : Optional[str] = None

class UserResponse(BaseModel):
    id: int
    user_name : str
    email : str
    provider: str
    created_at : int
class LoginResponse(BaseModel):
    access_token : str
    refresh_token : str
    token_type : str = "bearer"

class LoginRequest(BaseModel):
    email : str
    password : str

class DeleteRequest(BaseModel):
    email : str

class GoogleLoginRequest(BaseModel):
    id_token: str
    
    class Config:
        from_attributes = True