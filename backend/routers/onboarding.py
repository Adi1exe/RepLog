"""Vitals submission and BMI-based goal suggestion."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Body
from pymongo.database import Database

from backend import schemas
from backend.core.database import get_db
from backend.core.security import get_current_user


router = APIRouter(prefix="/onboarding", tags=["Onboarding"])


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _calculate_bmi(weight_kg: float, height_cm: float) -> float:
    height_m = height_cm / 100
    return round(weight_kg / (height_m ** 2), 1)


def _bmi_category(bmi: float) -> str:
    if bmi < 18.5:
        return "Underweight"
    if bmi < 25.0:
        return "Normal"
    if bmi < 30.0:
        return "Overweight"
    return "Obese"


def _suggest_goals(bmi: float) -> list[str]:
    suggestions = {
        "Underweight": ["Muscle Gain", "Maintenance", "Strength"],
        "Normal": ["Maintenance", "Muscle Gain", "Fat Loss", "Strength"],
        "Overweight": ["Fat Loss", "Maintenance", "Muscle Gain"],
        "Obese": ["Fat Loss", "Maintenance"],
    }
    return suggestions[_bmi_category(bmi)]


def _serialize_vitals(vitals: dict) -> dict:
    return {
        "id": str(vitals["_id"]),
        "user_id": vitals["user_id"],
        "name": vitals["name"],
        "age": vitals["age"],
        "height_cm": vitals["height_cm"],
        "weight_kg": vitals["weight_kg"],
        "bmi": vitals["bmi"],
        "goal": vitals["goal"],
        "experience": vitals["experience"],
        "updated_at": vitals["updated_at"],
    }


@router.post("/bmi-suggest", response_model=schemas.BMISuggestion)
def bmi_suggest(
    weight_kg: float = Body(...),
    height_cm: float = Body(...),
    current_user: dict = Depends(get_current_user),
):
    bmi = _calculate_bmi(weight_kg, height_cm)
    return schemas.BMISuggestion(
        bmi=bmi,
        category=_bmi_category(bmi),
        suggested_goals=_suggest_goals(bmi),
    )


@router.post("/vitals", response_model=schemas.VitalsOut, status_code=201)
def submit_vitals(
    payload: schemas.VitalsCreate,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    bmi = _calculate_bmi(payload.weight_kg, payload.height_cm)
    user_id = str(current_user["_id"])
    data = {
        "user_id": user_id,
        "name": payload.name,
        "age": payload.age,
        "height_cm": payload.height_cm,
        "weight_kg": payload.weight_kg,
        "bmi": bmi,
        "goal": payload.goal,
        "experience": payload.experience,
        "updated_at": _now(),
    }

    db.user_vitals.update_one(
        {"user_id": user_id},
        {"$set": data, "$setOnInsert": {"created_at": _now()}},
        upsert=True,
    )
    vitals = db.user_vitals.find_one({"user_id": user_id})
    return _serialize_vitals(vitals)


@router.get("/vitals", response_model=schemas.VitalsOut)
def get_vitals(
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    vitals = db.user_vitals.find_one({"user_id": str(current_user["_id"])})
    if not vitals:
        raise HTTPException(status_code=404, detail="Vitals not found - complete onboarding first")
    return _serialize_vitals(vitals)
