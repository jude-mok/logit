from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import time

from app.database import get_db
from app.models.moment import Moment
from app.schemas.moment import MomentResponse
from app.services.storage import save_image

router = APIRouter(prefix="/moments", tags=["moments"])

@router.post("/", response_model=MomentResponse)
async def create_moment(
    file: UploadFile = File(...),
    comment: str = None,
    db: Session = Depends(get_db)
):
    image_path = await save_image(file)
    moment = Moment(
        image_path=image_path,
        comment=comment,
        created_at=int(time.time())
    )
    db.add(moment)
    db.commit()
    db.refresh(moment)
    return moment

@router.get("/", response_model=List[MomentResponse])
def get_moments(db: Session = Depends(get_db)):
    return db.query(Moment).order_by(Moment.created_at.desc()).all()

@router.get("/random", response_model=MomentResponse)
def get_random_moment(db: Session = Depends(get_db)):
    from sqlalchemy.sql.expression import func
    return db.query(Moment).order_by(func.random()).all()

@router.patch("/{moment_id}/star", response_model=MomentResponse)
def toggle_star(moment_id: int, db: Session = Depends(get_db)):
    moment = db.query(Moment).filter(Moment.id == moment_id).first()
    moment.is_starred = not moment.is_starred
    db.commit()
    db.refresh(moment)
    return moment

@router.delete("/{moment_id}")
def delete_moment(moment_id: int, db: Session = Depends(get_db)):
    moment = db.query(Moment).filter(Moment.id == moment_id).first()
    db.delete(moment)
    db.commit()
    return {"message": "deleted"}