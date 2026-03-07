from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.schemas.user import UserResponse, UserUpdate
from app.services.dependencies import get_current_user
from app.database import get_db
from app.models.user import User
from app.services.auth import hash_password, verify_password
from datetime import datetime, timedelta
from app.models.moment import Moment

router = APIRouter(prefix="/me", tags=["me"]) 

@router.get("/", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.patch("/update",response_model= UserResponse)
async def update_me(request : UserUpdate, current_user : User = Depends(get_current_user), db: Session = Depends(get_db)):
    if request.user_name:
        exist = db.query(User).filter(User.user_name == request.user_name).first()
        if exist and exist.id != current_user.id:
            raise HTTPException(status_code = 409, detail = "user name is already exists")
        current_user.user_name = request.user_name
    if request.new_password:
        if not current_user.password_hash:
            raise HTTPException(status_code=400, detail="Cannot set password for OAuth accounts")
        if not request.current_password:
            raise HTTPException(status_code=400, detail="Current password is required")
        if not verify_password(request.current_password, current_user.password_hash):
            raise HTTPException(status_code=401, detail="Wrong current password")
        current_user.password_hash = hash_password(request.new_password)
    db.commit()
    db.refresh(current_user)
    return current_user

@router.delete("/delete")
async def delete_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.delete(current_user)
    db.commit()
    return {"message": "account successfully deleted"}

@router.get("/tree")
async def get_tree_status(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    moments = db.query(Moment).filter(
        Moment.user_id == current_user.id,
        Moment.is_backdated == False
    ).order_by(Moment.created_at.desc()).all()

    count = len(moments)

    if count < 10:
        return {"stage": 1, "count": count}
    elif count < 20:
        return {"stage": 2, "count": count}
    elif count < 30:
        return {"stage": 3, "count": count}
    elif count < 40:
        return {"stage": 4, "count": count}
    elif count < 50:
        return {"stage": 5, "count": count}

    last_moment = moments[0].created_at
    days_since = (datetime.now() - datetime.fromtimestamp(last_moment)).days

    if days_since < 7:
        return {"stage": 6, "count": count}
    
    recent_dates = set()
    for m in moments[:3]:
        dt = datetime.fromtimestamp(m.created_at).date()
        recent_dates.add(dt)

    today = datetime.now().date()
    consecutive = all(
        (today - timedelta(days=i)) in recent_dates
        for i in range(3)
    )

    if consecutive:
        return {"stage": 6, "count": count}
    return {"stage": "dead", "count": count}