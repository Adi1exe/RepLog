# routers/onboarding.py — Vitals submission and BMI-based goal suggestion

from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session

from backend import models, schemas
from backend.core.database import get_db
from backend.core.security import get_current_user

router = APIRouter(prefix="/onboarding", tags=["Onboarding"])


# ── BMI helpers ────────────────────────────────────────────────────────────────

def _calculate_bmi(weight_kg: float, height_cm: float) -> float:
    """BMI = weight(kg) / height(m)²"""
    height_m = height_cm / 100
    return round(weight_kg / (height_m ** 2), 1)


def _bmi_category(bmi: float) -> str:
    if bmi < 18.5:
        return "Underweight"
    elif bmi < 25.0:
        return "Normal"
    elif bmi < 30.0:
        return "Overweight"
    else:
        return "Obese"


def _suggest_goals(bmi: float) -> list[str]:
    """
    Returns an ordered list of realistic goals based on BMI category.
    The first item is the primary recommendation.
    """
    category = _bmi_category(bmi)
    suggestions = {
        "Underweight": ["Muscle Gain", "Maintenance", "Strength"],
        "Normal":      ["Maintenance", "Muscle Gain", "Fat Loss", "Strength"],
        "Overweight":  ["Fat Loss", "Maintenance", "Muscle Gain"],
        "Obese":       ["Fat Loss", "Maintenance"],
    }
    return suggestions[category]


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.post("/bmi-suggest", response_model=schemas.BMISuggestion)
def bmi_suggest(
    weight_kg: float = Body(...),
    height_cm: float = Body(...),
    current_user: models.User = Depends(get_current_user),
):
    """
    Step 1 of onboarding: compute BMI from height + weight and return
    goal suggestions. The frontend uses this to render goal checkboxes.
    """
    bmi      = _calculate_bmi(weight_kg, height_cm)
    category = _bmi_category(bmi)
    goals    = _suggest_goals(bmi)

    return schemas.BMISuggestion(bmi=bmi, category=category, suggested_goals=goals)


@router.post("/vitals", response_model=schemas.VitalsOut, status_code=201)
def submit_vitals(
    payload:      schemas.VitalsCreate,
    db:           Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Step 2 of onboarding: persist the user's vitals.
    BMI is recalculated server-side regardless of what the client sends.
    If vitals already exist, they are updated (upsert behaviour).
    """
    bmi = _calculate_bmi(payload.weight_kg, payload.height_cm)

    existing = db.query(models.UserVitals).filter(
        models.UserVitals.user_id == current_user.id
    ).first()

    if existing:
        # Update existing record
        existing.name       = payload.name
        existing.age        = payload.age
        existing.height_cm  = payload.height_cm
        existing.weight_kg  = payload.weight_kg
        existing.bmi        = bmi
        existing.goal       = payload.goal
        existing.experience = payload.experience
        db.commit()
        db.refresh(existing)
        return existing
    else:
        vitals = models.UserVitals(
            user_id    = current_user.id,
            name       = payload.name,
            age        = payload.age,
            height_cm  = payload.height_cm,
            weight_kg  = payload.weight_kg,
            bmi        = bmi,
            goal       = payload.goal,
            experience = payload.experience,
        )
        db.add(vitals)
        db.commit()
        db.refresh(vitals)
        return vitals


@router.get("/vitals", response_model=schemas.VitalsOut)
def get_vitals(
    db:           Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Fetch the current user's stored vitals."""
    vitals = db.query(models.UserVitals).filter(
        models.UserVitals.user_id == current_user.id
    ).first()

    if not vitals:
        raise HTTPException(status_code=404, detail="Vitals not found — complete onboarding first")
    return vitals
