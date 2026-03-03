from pydantic import BaseModel

class QuoteResponse(BaseModel):
    id: int
    text: str
    author: str | None = None

    class Config:
        from_attributes = True