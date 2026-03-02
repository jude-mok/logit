from sqlalchemy import Column, Integer, String, Boolean, BigInteger
from app.database import Base

class Users(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String, nullable=False)
    password_hash = Column(String, nullable=True)
    provider = Column(String, default="email")
    provider_id = Column(String, nullable=True)
    created_at = Column(BigInteger, default=lambda: int(__import__('time').time()))