from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.models import moment, user as user_models
from app.routers import photos, auth, user, quote, album


app = FastAPI(
    title="Logit API",
    description="Photo diary API - one photo per day with a comment",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://logit-production.up.railway.app"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)


app.include_router(photos.router)
app.include_router(auth.router)
app.include_router(user.router)
app.include_router(quote.router)
app.include_router(album.router)

@app.get("/health")
def health_check():
    return {"status": "healthy"}
