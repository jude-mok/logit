from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional

class UserCreate(BaseModel):
    email: EmailStr
    provider: str = "email"
    password: Optional[str] = Field(None, min_length=8)
    user_name: str = Field(min_length=2, max_length=30)

class UserUpdate(BaseModel):
    user_name : Optional[str] = None
    current_password : Optional[str] = None
    new_password : Optional[str] = None

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
    user_name : str
    password : str

class GoogleLoginRequest(BaseModel):
    access_token: str