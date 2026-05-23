import hashlib
import hmac
import os
import random
import secrets
import smtplib
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage

import httpx
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Response, status
from pymongo.database import Database
from pymongo.errors import DuplicateKeyError

from backend import schemas
from backend.core.database import get_db
from backend.core.security import create_access_token, get_current_user, hash_password, verify_password


router = APIRouter(prefix="/auth", tags=["Authentication"])
VERIFICATION_CODE_TTL_MINUTES = int(os.getenv("VERIFICATION_CODE_TTL_MINUTES", "15"))
COOKIE_SECURE = os.getenv("ENVIRONMENT", "development").lower() == "production"
COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "lax")


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _public_user(user: dict) -> dict:
    return {
        "id": str(user["_id"]),
        "email": user["email"],
        "username": user["username"],
        "is_active": user.get("is_active", True),
        "is_email_verified": user.get("is_email_verified", False),
        "created_at": user.get("created_at", _now()),
    }


def _has_vitals(db: Database, user_id: str) -> bool:
    return db.user_vitals.find_one({"user_id": user_id}, {"_id": 1}) is not None


def _set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60")) * 60,
        path="/",
    )


def _token_response(db: Database, user: dict, response: Response) -> schemas.TokenResponse:
    token = create_access_token({"sub": str(user["_id"])})
    _set_auth_cookie(response, token)
    return schemas.TokenResponse(
        access_token=token,
        username=user["username"],
        has_vitals=_has_vitals(db, str(user["_id"])),
        is_email_verified=user.get("is_email_verified", False),
    )

def generate_verification_code() -> str:
    return "".join(secrets.choice("0123456789") for _ in range(6))


def _hash_code(code: str) -> str:
    secret = os.getenv("VERIFICATION_CODE_SECRET", os.getenv("SECRET_KEY", "dev-only-change-me"))
    return hmac.new(secret.encode(), code.encode(), hashlib.sha256).hexdigest()


def _set_verification_code(db: Database, user_id: ObjectId, code: str) -> None:
    db.users.update_one(
        {"_id": user_id},
        {
            "$set": {
                "verification_code_hash": _hash_code(code),
                "verification_code_expires_at": _now() + timedelta(minutes=VERIFICATION_CODE_TTL_MINUTES),
            }
        },
    )


def send_verification_email(to_email: str, code: str):
    smtp_email = os.getenv("SMTP_EMAIL")
    smtp_password = os.getenv("SMTP_PASSWORD")

    if not smtp_email or not smtp_password:
        print(f"\n[EMAIL MOCK] To: {to_email} | Your verification code is: {code}\n")
        return

    try:
        msg = EmailMessage()
        msg.set_content(
            f"Welcome to RepLog. Your verification code is: {code}\n\n"
            f"This code expires in {VERIFICATION_CODE_TTL_MINUTES} minutes."
        )
        msg["Subject"] = "Your RepLog Verification Code"
        msg["From"] = f"RepLog <{smtp_email}>"
        msg["To"] = to_email

        with smtplib.SMTP_SSL(os.getenv("SMTP_HOST", "smtp.gmail.com"), int(os.getenv("SMTP_PORT", "465"))) as server:
            server.login(smtp_email, smtp_password)
            server.send_message(msg)
    except Exception as exc:
        print(f"Failed to send email to {to_email}: {exc}")
        print(f"\n[EMAIL MOCK FALLBACK] To: {to_email} | Your verification code is: {code}\n")


@router.post("/register", response_model=schemas.TokenResponse, status_code=201)
def register(payload: schemas.UserRegister, response: Response, db: Database = Depends(get_db)):
    code = generate_verification_code()
    user = {
        "email": payload.email.lower(),
        "username": payload.username,
        "hashed_password": hash_password(payload.password),
        "is_active": True,
        "created_at": _now(),
        "provider": None,
        "provider_id": None,
        "is_email_verified": False,
        "verification_code_hash": _hash_code(code),
        "verification_code_expires_at": _now() + timedelta(minutes=VERIFICATION_CODE_TTL_MINUTES),
    }

    try:
        result = db.users.insert_one(user)
    except DuplicateKeyError:
        if db.users.find_one({"email": payload.email.lower()}):
            raise HTTPException(status_code=400, detail="Email already registered")
        raise HTTPException(status_code=400, detail="Username already taken")

    user["_id"] = result.inserted_id
    send_verification_email(user["email"], code)
    return _token_response(db, user, response)


@router.post("/login", response_model=schemas.TokenResponse)
def login(payload: schemas.UserLogin, response: Response, db: Database = Depends(get_db)):
    user = db.users.find_one({"email": payload.email.lower()})
    if not user or not user.get("hashed_password") or not verify_password(payload.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is disabled")

    return _token_response(db, user, response)


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"message": "Logged out"}


@router.post("/verify-email")
def verify_email(payload: schemas.VerifyEmail, db: Database = Depends(get_db)):
    user = db.users.find_one({"email": payload.email.lower()})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.get("is_email_verified"):
        return {"message": "Email already verified"}

    expires_at = user.get("verification_code_expires_at")
    if not expires_at or expires_at.replace(tzinfo=timezone.utc) < _now():
        raise HTTPException(status_code=400, detail="Verification code expired")
    if user.get("verification_code_hash") != _hash_code(payload.code):
        raise HTTPException(status_code=400, detail="Invalid verification code")

    db.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {"is_email_verified": True},
            "$unset": {"verification_code_hash": "", "verification_code_expires_at": ""},
        },
    )
    return {"message": "Email verified successfully"}


@router.post("/resend-verification")
def resend_verification(payload: schemas.ResendVerification, db: Database = Depends(get_db)):
    user = db.users.find_one({"email": payload.email.lower()})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.get("is_email_verified"):
        return {"message": "Email already verified"}

    code = generate_verification_code()
    _set_verification_code(db, user["_id"], code)
    send_verification_email(user["email"], code)
    return {"message": "Verification code resent"}


@router.post("/oauth", response_model=schemas.TokenResponse)
async def oauth_login(payload: schemas.OAuthLogin, response: Response, db: Database = Depends(get_db)):
    email = None
    username = None
    provider_id = None

    if payload.provider == "google":
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {payload.token}"},
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=400, detail="Invalid Google token")
            data = resp.json()
            email = data["email"].lower()
            provider_id = data["sub"]
            username = data.get("name", email.split("@")[0]).replace(" ", "_").lower()

    elif payload.provider == "github":
        github_client_id = os.getenv("GITHUB_CLIENT_ID")
        github_client_secret = os.getenv("GITHUB_CLIENT_SECRET")
        if not github_client_id or not github_client_secret:
            raise HTTPException(status_code=500, detail="GitHub credentials not configured on server")

        async with httpx.AsyncClient(timeout=10) as client:
            token_resp = await client.post(
                "https://github.com/login/oauth/access_token",
                data={
                    "client_id": github_client_id,
                    "client_secret": github_client_secret,
                    "code": payload.token,
                },
                headers={"Accept": "application/json"},
            )
            if token_resp.status_code != 200:
                raise HTTPException(status_code=400, detail="Failed to exchange GitHub code")
            token_data = token_resp.json()
            if "error" in token_data:
                raise HTTPException(status_code=400, detail=token_data.get("error_description", "Invalid code"))

            access_token = token_data["access_token"]
            headers = {
                "Authorization": f"Bearer {access_token}",
                "User-Agent": "RepLog-App",
                "Accept": "application/vnd.github.v3+json",
            }
            resp = await client.get("https://api.github.com/user", headers=headers)
            if resp.status_code != 200:
                raise HTTPException(status_code=400, detail="Failed to fetch GitHub profile")
            data = resp.json()

            email = data.get("email")
            if not email:
                eresp = await client.get(
                    "https://api.github.com/user/emails",
                    headers=headers,
                )
                if eresp.status_code == 200:
                    emails = eresp.json()
                    if isinstance(emails, list) and len(emails) > 0:
                        email = next(
                            (e["email"] for e in emails if isinstance(e, dict) and e.get("primary")),
                            emails[0].get("email") if isinstance(emails[0], dict) else None
                        )
                if not email:
                    raise HTTPException(
                        status_code=400,
                        detail="Could not retrieve primary email from GitHub profile"
                    )
            email = email.lower()
            provider_id = str(data["id"])
            username = data["login"]
    else:
        raise HTTPException(status_code=400, detail="Unsupported provider")

    user = db.users.find_one({"email": email})
    if not user:
        candidate_username = username
        inserted = False
        for attempt in range(5):
            try:
                result = db.users.insert_one(
                    {
                        "email": email,
                        "username": candidate_username,
                        "hashed_password": None,
                        "is_active": True,
                        "created_at": _now(),
                        "provider": payload.provider,
                        "provider_id": provider_id,
                        "is_email_verified": True,
                    }
                )
                user = db.users.find_one({"_id": result.inserted_id})
                inserted = True
                break
            except DuplicateKeyError:
                if db.users.find_one({"email": email}):
                    user = db.users.find_one({"email": email})
                    inserted = True
                    break
                candidate_username = f"{username}_{random.randint(1000, 9999)}"
        
        if not inserted:
            raise HTTPException(
                status_code=500,
                detail="Could not register user due to persistent username collision. Please try again."
            )
    elif not user.get("provider"):
        db.users.update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "provider": payload.provider,
                    "provider_id": provider_id,
                    "is_email_verified": True,
                }
            },
        )
        user = db.users.find_one({"_id": user["_id"]})

    return _token_response(db, user, response)


@router.get("/me", response_model=schemas.UserOut)
def get_me(current_user: dict = Depends(get_current_user)):
    return _public_user(current_user)


@router.put("/me", response_model=schemas.UserOut)
def update_me(
    payload: schemas.UserUpdate,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    updates = {}
    verification_code = None
    if payload.email and payload.email.lower() != current_user["email"]:
        if db.users.find_one({"email": payload.email.lower(), "_id": {"$ne": current_user["_id"]}}):
            raise HTTPException(status_code=400, detail="Email already taken")
        updates["email"] = payload.email.lower()
        updates["is_email_verified"] = False
        verification_code = generate_verification_code()
        updates["verification_code_hash"] = _hash_code(verification_code)
        updates["verification_code_expires_at"] = _now() + timedelta(minutes=VERIFICATION_CODE_TTL_MINUTES)

    if payload.username and payload.username != current_user["username"]:
        if db.users.find_one({"username": payload.username, "_id": {"$ne": current_user["_id"]}}):
            raise HTTPException(status_code=400, detail="Username already taken")
        updates["username"] = payload.username

    if updates:
        db.users.update_one({"_id": current_user["_id"]}, {"$set": updates})
        current_user = db.users.find_one({"_id": current_user["_id"]})
        if verification_code:
            send_verification_email(current_user["email"], verification_code)

    return _public_user(current_user)
