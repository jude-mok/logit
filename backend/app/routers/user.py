from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session
from schemas import user
from app.services.dependencies import get_current_user
router = APIRouter(prefix="me",tags=["me"])

@router.get("/me",response_model = user.UserResponse)
async def get_me():
    return get_current_user

#@router.patch("/update",response_model= user.UserResponse)
#async def update_me(Depends(user),)