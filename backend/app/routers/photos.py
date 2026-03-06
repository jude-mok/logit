from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.sql.expression import func
from typing import List, Optional
from app.services.dependencies import get_current_user
from app.models.user import User
import time
from datetime import datetime, timezone

from app.database import get_db
from app.models.moment import Moment
from app.schemas.moment import MomentResponse, EditRequest
from app.services.storage import save_image

router = APIRouter(prefix="/moments", tags=["moments"])

@router.get("/can-upload")
def can_upload_today(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Check if user can upload a moment today (one per day limit)"""
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_timestamp = int(today.timestamp())

    existing_today = db.query(Moment).filter(
        Moment.user_id == current_user.id,
        Moment.created_at >= today_timestamp
    ).first()

    return {"can_upload": existing_today is None}

@router.post("/", response_model=MomentResponse)
async def create_moment(
    file: UploadFile = File(...),
    comment: str = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_timestamp = int(today.timestamp())

    existing_today = db.query(Moment).filter(
        Moment.user_id == current_user.id,
        Moment.created_at >= today_timestamp
    ).first()

    if existing_today:
        raise HTTPException(status_code=429, detail="You can only post one moment per day")

    image_path = await save_image(file)
    moment = Moment(
        image_path=image_path,
        comment=comment,
        created_at=int(time.time()),
        user_id=current_user.id
    )
    db.add(moment)
    db.commit()
    db.refresh(moment)
    return moment

@router.get("/", response_model=List[MomentResponse])
def get_moments(
    order: str = "random",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Moment).filter(Moment.user_id == current_user.id)

    if order == "starred":
        query = query.filter(Moment.is_starred == True).order_by(Moment.created_at.desc())
    elif order == "chronological":
        query = query.order_by(Moment.created_at.desc())
    else:
        query = query.order_by(func.random()).limit(10)

    return query.all()

@router.get("/random", response_model=Optional[MomentResponse])
def get_random_moment(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Moment).filter(Moment.user_id == current_user.id).order_by(func.random()).first()

@router.patch("/{moment_id}/star", response_model=MomentResponse)
def toggle_star(
    moment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    moment = db.query(Moment).filter(Moment.id == moment_id, Moment.user_id == current_user.id).first()
    if not moment:
        raise HTTPException(status_code=404, detail="Moment not found")
    moment.is_starred = not moment.is_starred
    db.commit()
    db.refresh(moment)
    return moment

@router.delete("/{moment_id}")
def delete_moment(
    moment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    moment = db.query(Moment).filter(Moment.id == moment_id, Moment.user_id == current_user.id).first()
    if not moment:
        raise HTTPException(status_code=404, detail="Moment not found")
    db.delete(moment)
    db.commit()
    return {"message": "deleted"}


@router.patch("/{moment_id}/edit", response_model=MomentResponse)
def edit_moment(
    moment_id: int,
    request: EditRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    moment = db.query(Moment).filter(Moment.id == moment_id, Moment.user_id == current_user.id).first()
    if not moment:
        raise HTTPException(status_code=404, detail="Moment not found")
    moment.comment = request.new_comment
    db.commit()
    db.refresh(moment)
    return moment