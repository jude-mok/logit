from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.schemas.user import UserCreate, LoginResponse, LoginRequest
from app.models.user import User
from app.database import get_db
from app.services.auth import verify_password, create_access_token, create_refresh_token, hash_password
import time
import httpx
from app.schemas.user import GoogleLoginRequest


router = APIRouter(prefix= "/auth", tags=["auth"])

@router.post("/signin", response_model=LoginResponse)
async def sign_in(request: LoginRequest, db: Session = Depends(get_db)):
    db_exist = db.query(User).filter(User.user_name == request.user_name).first()
    if not db_exist:
        raise HTTPException(status_code = 404, detail = "Wrong email or password.")
    
    if not verify_password(request.password, db_exist.password_hash):
        raise HTTPException(status_code = 404, detail = "Wrong email or password.")

    return {
    "access_token": create_access_token(db_exist.id),
    "refresh_token": create_refresh_token(db_exist.id)
    }

@router.post("/sign_up", response_model=LoginResponse)
async def sign_up(request: UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user with email and password.
    Returns access and refresh tokens on successful registration.
    """
    db_exist = db.query(User).filter(User.email == request.email).first()
    if db_exist:
        raise HTTPException(status_code = 409, detail = "This email is already taken")
    
    new_user = User(
        email = request.email,
        password_hash = hash_password(request.password),
        provider = "email",
        provider_id = None,
        created_at = int(time.time()),
        user_name = request.user_name
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "access_token": create_access_token(new_user.id),
        "refresh_token": create_refresh_token(new_user.id)
    }

@router.post("/google", response_model=LoginResponse)
async def google_login(request: GoogleLoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate or register user via Google OAuth access token.
    Verifies the token with Google's userinfo endpoint.
    """
    async with httpx.AsyncClient() as client:
        res = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {request.access_token}"}
        )

    if res.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid Google access token")

    idinfo = res.json()
    google_id = idinfo["sub"]
    email = idinfo["email"]
    name = idinfo.get("name", email.split("@")[0])

    user = db.query(User).filter(
        User.provider == "google",
        User.provider_id == google_id
    ).first()

    if not user:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            raise HTTPException(status_code=409, detail="Email already registered with password")

        user = User(
            email=email,
            password_hash=None,
            provider="google",
            provider_id=google_id,
            user_name=name,
            created_at=int(time.time())
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)
    return LoginResponse(access_token=access_token, refresh_token=refresh_token)