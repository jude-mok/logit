from sqlalchemy import Column, Integer, String, Boolean, BigInteger, ForeignKey
from app.database import Base

class Moment(Base):
    __tablename__ = "moments"
    id = Column(Integer, primary_key=True, index=True)
    image_path = Column(String, nullable=False)
    comment = Column(String, nullable=True)
    is_starred = Column(Boolean, default=False)
    created_at = Column(BigInteger, default=lambda: int(__import__('time').time()))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)