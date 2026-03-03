from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from app.routers import photos, auth, user
from app.models import moment,user as user_models
from app.routers import photos, auth, user, quote


app = FastAPI(
    title="Ostar API",
    description="Photo diary API - one photo per day with a comment",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(photos.router)
app.include_router(auth.router)
app.include_router(user.router)
app.include_router(quote.router)

@app.get("/health")
def health_check():
    return {"status": "healthy"}
