"""Workout session CRUD, dashboard stats, and persisted progress."""

from datetime import datetime, timezone
from typing import List

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException
from pymongo import DESCENDING
from pymongo.database import Database

from backend import schemas
from backend.core.database import get_db
from backend.core.security import get_current_user


router = APIRouter(prefix="/workouts", tags=["Workouts"])


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _as_aware_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _serialize_session(session: dict) -> dict:
    session_id = str(session["_id"])
    exercises = []
    for exercise in session.get("exercises", []):
        exercises.append(
            {
                "id": str(exercise.get("_id")),
                "session_id": session_id,
                "name": exercise["name"],
                "sets": exercise["sets"],
                "reps": exercise["reps"],
                "weight_kg": exercise.get("weight_kg"),
            }
        )

    return {
        "id": session_id,
        "user_id": session["user_id"],
        "date": session["date"],
        "duration_min": session["duration_min"],
        "body_parts": session["body_parts"],
        "notes": session.get("notes"),
        "created_at": session["created_at"],
        "exercises": exercises,
    }


def _calculate_streak(sessions: list[dict]) -> int:
    if not sessions:
        return 0

    unique_dates = sorted(
        {_as_aware_utc(session["date"]).date() for session in sessions},
        reverse=True,
    )
    today = _now().date()
    streak = 0
    prev_date = today

    for workout_date in unique_dates:
        gap_days = (prev_date - workout_date).days
        if gap_days > 3:
            break
        streak += 1
        prev_date = workout_date

    if unique_dates and (today - unique_dates[0]).days > 3:
        return 0
    return streak


def _rebuild_progress(db: Database, user_id: str) -> dict:
    sessions = list(
        db.workout_sessions.find({"user_id": user_id}).sort("date", DESCENDING)
    )
    streak = _calculate_streak(sessions)
    all_dates = [_as_aware_utc(session["date"]).strftime("%Y-%m-%d") for session in sessions]
    progress = {
        "user_id": user_id,
        "total_sessions": len(sessions),
        "streak": streak,
        "all_sessions_dates": all_dates,
        "last_session_at": sessions[0]["date"] if sessions else None,
        "updated_at": _now(),
    }
    db.user_progress.update_one(
        {"user_id": user_id},
        {"$set": progress, "$setOnInsert": {"created_at": _now()}},
        upsert=True,
    )
    return progress


@router.post("/", response_model=schemas.WorkoutSessionOut, status_code=201)
def log_workout(
    payload: schemas.WorkoutSessionCreate,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = str(current_user["_id"])
    session = {
        "user_id": user_id,
        "date": _as_aware_utc(payload.date),
        "duration_min": payload.duration_min,
        "body_parts": payload.body_parts,
        "notes": payload.notes,
        "created_at": _now(),
        "exercises": [
            {
                "_id": ObjectId(),
                "name": exercise.name,
                "sets": exercise.sets,
                "reps": exercise.reps,
                "weight_kg": exercise.weight_kg,
            }
            for exercise in payload.exercises
        ],
    }
    result = db.workout_sessions.insert_one(session)
    session["_id"] = result.inserted_id
    _rebuild_progress(db, user_id)
    return _serialize_session(session)


@router.get("/", response_model=List[schemas.WorkoutSessionOut])
def list_workouts(
    skip: int = 0,
    limit: int = 20,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = str(current_user["_id"])
    sessions = (
        db.workout_sessions.find({"user_id": user_id})
        .sort("date", DESCENDING)
        .skip(skip)
        .limit(limit)
    )
    return [_serialize_session(session) for session in sessions]


@router.get("/dashboard", response_model=schemas.DashboardStats)
def dashboard_stats(
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = str(current_user["_id"])
    vitals = db.user_vitals.find_one({"user_id": user_id})
    recent_sessions = list(
        db.workout_sessions.find({"user_id": user_id})
        .sort("date", DESCENDING)
        .limit(5)
    )
    progress = _rebuild_progress(db, user_id)

    return schemas.DashboardStats(
        current_weight_kg=vitals.get("weight_kg") if vitals else None,
        bmi=vitals.get("bmi") if vitals else None,
        total_sessions=progress["total_sessions"],
        streak=progress["streak"],
        recent_sessions=[_serialize_session(session) for session in recent_sessions],
        all_sessions_dates=progress["all_sessions_dates"],
    )


@router.delete("/{session_id}", status_code=204)
def delete_workout(
    session_id: str,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    try:
        object_id = ObjectId(session_id)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=404, detail="Workout not found")

    user_id = str(current_user["_id"])
    result = db.workout_sessions.delete_one({"_id": object_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Workout not found")

    _rebuild_progress(db, user_id)
