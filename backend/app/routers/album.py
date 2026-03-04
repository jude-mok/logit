from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.models.user import User
from app.models.moment import Moment
from app.schemas.moment import MomentResponse
from app.database import get_db
from app.services.dependencies import get_current_user
from datetime import datetime

router = APIRouter(prefix="/album", tags=["albums"])

@router.get("/")
async def get_albums(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    moments =  db.query(Moment).filter(Moment.user_id == current_user.id).all()
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
    moments = db.query(Moment).filter(Moment.user_id == current_user.id).all()
    
    result = []
    for moment in moments:
        dt = datetime.fromtimestamp(moment.created_at)
        if dt.year == year and dt.month == month:
            result.append({
                "date": dt.strftime("%Y-%m-%d"),
                "moment_id": moment.id
            })
    
    return result

@router.get("/{year}/{month}", response_model=List[MomentResponse])
async def get_album_moments(year: int, month: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    moments = db.query(Moment).filter(Moment.user_id == current_user.id).all()
    result = [
        m for m in moments
        if datetime.fromtimestamp(m.created_at).year == year
        and datetime.fromtimestamp(m.created_at).month == month
    ]
    return sorted(result, key=lambda m: m.created_at, reverse=True)