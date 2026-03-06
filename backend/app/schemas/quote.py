from pydantic import BaseModel,ConfigDict

class QuoteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    text: str
    author: str | None = None
