from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session
from app.schemas.user import UserResponse
from app.services.dependencies import get_current_user
from app.database import get_db
from app.models.user import User

router = APIRouter(prefix="/me", tags=["me"]) 

@router.get("/", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

#@router.patch("/update",response_model= user.UserResponse)
#async def update_me(Depends(user),)

@router.delete("/delete")
async def delete_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.delete(current_user)
    db.commit()
    return {"message": "account successfully deleted"}