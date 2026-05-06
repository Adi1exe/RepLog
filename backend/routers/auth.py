# routers/auth.py — User registration and login endpoints

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend import models, schemas
from backend.core.database import get_db
from backend.core.security import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


import os
import random
import httpx
import smtplib
from email.message import EmailMessage

def generate_verification_code():
    return str(random.randint(100000, 999999))

def send_verification_email(to_email: str, code: str):
    smtp_email = os.getenv("SMTP_EMAIL")
    smtp_password = os.getenv("SMTP_PASSWORD")
    
    if not smtp_email or not smtp_password:
        # Fallback to terminal print if SMTP is not configured
        print(f"\n[EMAIL MOCK] To: {to_email} | Your verification code is: {code}\n")
        return

    try:
        msg = EmailMessage()
        msg.set_content(f"Welcome to RepLog! Your verification code is: {code}\n\nThis code will help verify your account.")
        msg["Subject"] = "Your RepLog Verification Code"
        msg["From"] = f"RepLog <{smtp_email}>"
        msg["To"] = to_email

        # Using Gmail SMTP settings as default; can be parameterized if needed
        server = smtplib.SMTP_SSL("smtp.gmail.com", 465)
        server.login(smtp_email, smtp_password)
        server.send_message(msg)
        server.quit()
    except Exception as e:
        print(f"Failed to send email to {to_email}: {e}")
        # Print it as fallback so the user isn't locked out in dev mode
        print(f"\n[EMAIL MOCK FALLBACK] To: {to_email} | Your verification code is: {code}\n")

@router.post("/register", response_model=schemas.TokenResponse, status_code=201)
def register(payload: schemas.UserRegister, db: Session = Depends(get_db)):
    """
    Create a new user account.
    Returns a JWT so the user is immediately logged in after registration.
    """
    # Ensure email and username are unique
    if db.query(models.User).filter(models.User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(models.User).filter(models.User.username == payload.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")

    verification_code = generate_verification_code()
    user = models.User(
        email=payload.email,
        username=payload.username,
        hashed_password=hash_password(payload.password),
        verification_code=verification_code,
        is_email_verified=False
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Attempt to send real email
    send_verification_email(user.email, verification_code)

    token = create_access_token({"sub": str(user.id)})
    return schemas.TokenResponse(
        access_token=token,
        username=user.username,
        has_vitals=False,   # brand-new user always needs onboarding
        is_email_verified=False
    )


@router.post("/login", response_model=schemas.TokenResponse)
def login(payload: schemas.UserLogin, db: Session = Depends(get_db)):
    """
    Authenticate a user with email + password.
    Returns a JWT on success.
    """
    user = db.query(models.User).filter(models.User.email == payload.email).first()

    if not user or not user.hashed_password or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    token      = create_access_token({"sub": str(user.id)})
    has_vitals = user.vitals is not None

    return schemas.TokenResponse(
        access_token=token,
        username=user.username,
        has_vitals=has_vitals,
        is_email_verified=user.is_email_verified
    )

@router.post("/verify-email")
def verify_email(payload: schemas.VerifyEmail, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_email_verified:
        return {"message": "Email already verified"}
    if user.verification_code != payload.code:
        raise HTTPException(status_code=400, detail="Invalid verification code")
    
    user.is_email_verified = True
    user.verification_code = None
    db.commit()
    return {"message": "Email verified successfully"}

@router.post("/resend-verification")
def resend_verification(payload: schemas.ResendVerification, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_email_verified:
        return {"message": "Email already verified"}
    
    code = generate_verification_code()
    user.verification_code = code
    db.commit()
    
    send_verification_email(user.email, code)
    return {"message": "Verification code resent"}

@router.post("/oauth", response_model=schemas.TokenResponse)
async def oauth_login(payload: schemas.OAuthLogin, db: Session = Depends(get_db)):
    email = None
    username = None
    provider_id = None
    
    if payload.provider == "google":
        async with httpx.AsyncClient() as client:
            resp = await client.get("https://www.googleapis.com/oauth2/v3/userinfo", headers={"Authorization": f"Bearer {payload.token}"})
            if resp.status_code != 200:
                raise HTTPException(status_code=400, detail="Invalid Google token")
            data = resp.json()
            email = data["email"]
            provider_id = data["sub"]
            username = data.get("name", email.split('@')[0]).replace(" ", "_").lower()
                
    elif payload.provider == "github":
        github_client_id = os.getenv("GITHUB_CLIENT_ID")
        github_client_secret = os.getenv("GITHUB_CLIENT_SECRET")
        if not github_client_id or not github_client_secret:
            raise HTTPException(status_code=500, detail="GitHub credentials not configured on server")
            
        async with httpx.AsyncClient() as client:
            # 1. Exchange code for access_token
            token_resp = await client.post(
                "https://github.com/login/oauth/access_token",
                data={
                    "client_id": github_client_id,
                    "client_secret": github_client_secret,
                    "code": payload.token
                },
                headers={"Accept": "application/json"}
            )
            if token_resp.status_code != 200:
                raise HTTPException(status_code=400, detail="Failed to exchange GitHub code")
            token_data = token_resp.json()
            if "error" in token_data:
                raise HTTPException(status_code=400, detail=token_data.get("error_description", "Invalid Code"))
                
            access_token = token_data["access_token"]
            
            # 2. Fetch user profile
            resp = await client.get("https://api.github.com/user", headers={"Authorization": f"Bearer {access_token}"})
            if resp.status_code != 200:
                raise HTTPException(status_code=400, detail="Failed to fetch GitHub profile")
            data = resp.json()
            
            # 3. Fetch user emails
            email = data.get("email")
            if not email:
                eresp = await client.get("https://api.github.com/user/emails", headers={"Authorization": f"Bearer {access_token}"})
                emails = eresp.json()
                email = next((e["email"] for e in emails if e["primary"]), emails[0]["email"])
            provider_id = str(data["id"])
            username = data["login"]
    else:
        raise HTTPException(status_code=400, detail="Unsupported provider")

    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        if db.query(models.User).filter(models.User.username == username).first():
            username = f"{username}_{random.randint(1000,9999)}"
            
        user = models.User(
            email=email,
            username=username,
            provider=payload.provider,
            provider_id=provider_id,
            is_email_verified=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        if not user.provider:
            user.provider = payload.provider
            user.provider_id = provider_id
            user.is_email_verified = True
            db.commit()
            
    token = create_access_token({"sub": str(user.id)})
    has_vitals = user.vitals is not None
    
    return schemas.TokenResponse(
        access_token=token,
        username=user.username,
        has_vitals=has_vitals,
        is_email_verified=True
    )


@router.get("/me", response_model=schemas.UserOut)
def get_me(current_user: models.User = Depends(get_current_user)):
    """Get current user details."""
    return current_user


@router.put("/me", response_model=schemas.UserOut)
def update_me(
    payload: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Update current user details."""
    if payload.email and payload.email != current_user.email:
        if db.query(models.User).filter(models.User.email == payload.email).first():
            raise HTTPException(status_code=400, detail="Email already taken")
        current_user.email = payload.email

    if payload.username and payload.username != current_user.username:
        if db.query(models.User).filter(models.User.username == payload.username).first():
            raise HTTPException(status_code=400, detail="Username already taken")
        current_user.username = payload.username

    db.commit()
    db.refresh(current_user)
    return current_user
