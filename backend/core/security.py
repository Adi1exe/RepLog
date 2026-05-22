"""Password hashing, JWT handling, and current-user dependency."""

import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import Cookie, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pymongo.database import Database

from .database import get_db


SECRET_KEY = os.getenv("SECRET_KEY")
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()

if not SECRET_KEY:
    if ENVIRONMENT == "production":
        raise RuntimeError("SECRET_KEY must be set in production")
    SECRET_KEY = "dev-only-change-me"

if ENVIRONMENT == "production" and len(SECRET_KEY) < 32:
    raise RuntimeError("SECRET_KEY must be at least 32 characters in production")

ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_ISSUER = os.getenv("JWT_ISSUER", "replog-api")
JWT_AUDIENCE = os.getenv("JWT_AUDIENCE", "replog-web")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode = {
        **data,
        "exp": expire,
        "iat": now,
        "iss": JWT_ISSUER,
        "aud": JWT_AUDIENCE,
        "jti": secrets.token_urlsafe(16),
    }
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
            issuer=JWT_ISSUER,
            audience=JWT_AUDIENCE,
        )
    except JWTError:
        return None


def get_current_user(
    bearer_token: str | None = Depends(oauth2_scheme),
    access_token: str | None = Cookie(default=None),
    db: Database = Depends(get_db),
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token = bearer_token or access_token
    if not token:
        raise credentials_exception

    payload = decode_token(token)
    if payload is None:
        raise credentials_exception

    user_id = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    try:
        object_id = ObjectId(user_id)
    except (InvalidId, TypeError):
        raise credentials_exception

    user = db.users.find_one({"_id": object_id, "is_active": True})
    if user is None:
        raise credentials_exception

    user["id"] = str(user["_id"])
    return user
