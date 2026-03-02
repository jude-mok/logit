from passlib.context import CryptContext
from jose import jwt
from app.config import settings
from datetime import datetime,timedelta,UTC

secret_key = settings.secret_key
algorithm = "HS256"

pwd_context = CryptContext(schemes=["bycrypt"])

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(user_id: int) -> str:
    expire = datetime.now(UTC) + timedelta(days=7)
    return jwt.encode({"sub": str(user_id), "exp": expire}, secret_key, algorithm=algorithm)

def create_refresh_token(user_id: int) -> str:
    expire = datetime.now(UTC) + timedelta(days=30)
    return jwt.encode({"sub": str(user_id), "exp": expire, "type": "refresh"}, secret_key, algorithm=algorithm)