from sqlalchemy import Column, Integer, String
from app.database import Base

class Quote(Base):
    __tablename__ = "quotes"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    text = Column(String, nullable=False)
    author = Column(String, nullable=True)