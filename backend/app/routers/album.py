from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.models.user import User
from app.models.moment import Moment
from app.schemas.moment import MomentResponse
from app.database import get_db
from app.services.dependencies import get_current_user
from datetime import datetime
import calendar

router = APIRouter(prefix="/album", tags=["albums"])

@router.get("/")
async def get_albums(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    moments =  db.query(Moment.created_at, Moment.image_path).filter(Moment.user_id == current_user.id).all()
    albums = {}
    
    for moment in moments:
        dt = datetime.fromtimestamp(moment.created_at)
        key = f"{dt.year}-{dt.month:02d}"
            
        if key not in albums:
            albums[key] = {
                "year": dt.year,
                "month": dt.month,
                "cover_image": moment.image_path,
                "count": 0
            }
        albums[key]["count"] += 1
        
    return sorted(albums.values(), key=lambda x: (x["year"], x["month"]), reverse=True)

@router.get("/calendar/{year}/{month}")
async def get_calendar(year: int, month: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    last_day = calendar.monthrange(year, month)[1]
    start = int(datetime(year, month, 1).timestamp())
    end = int(datetime(year, month, last_day, 23, 59, 59).timestamp())

    moments = db.query(Moment.id, Moment.created_at).filter(
        Moment.user_id == current_user.id,
        Moment.created_at >= start,
        Moment.created_at <= end
    ).all()
    
    return [
        {"date": datetime.fromtimestamp(m.created_at).strftime("%Y-%m-%d"), "moment_id": m.id, "created_at": m.created_at}
        for m in moments
    ]

@router.get("/{year}/{month}", response_model=List[MomentResponse])
async def get_album_moments(year: int, month: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    last_day = calendar.monthrange(year, month)[1]
    start = int(datetime(year, month, 1).timestamp())
    end = int(datetime(year, month, last_day, 23, 59, 59).timestamp())

    return db.query(Moment).filter(
        Moment.user_id == current_user.id,
        Moment.created_at >= start,
        Moment.created_at <= end
    ).order_by(Moment.created_at.desc()).all()