from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy.sql.expression import func
from typing import List, Optional
from app.database import get_db
from app.models.quote import Quote
from app.schemas.quote import QuoteResponse

router = APIRouter(prefix="/quotes", tags=["quotes"])

@router.get("/random", response_model=Optional[QuoteResponse])
def get_random_quote(db: Session = Depends(get_db)):
    return db.query(Quote).order_by(func.random()).first()

@router.get("/batch", response_model=List[QuoteResponse])
def get_random_quotes(count: int = 10, db: Session = Depends(get_db)):
    count = min(count, 100)
    return db.query(Quote).order_by(func.random()).limit(count).all()