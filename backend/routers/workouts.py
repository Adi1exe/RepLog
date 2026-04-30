# routers/workouts.py — Workout session CRUD and dashboard stats

from datetime import datetime, timedelta, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc
from sqlalchemy.orm import Session

from backend import models, schemas
from backend.core.database import get_db
from backend.core.security import get_current_user

router = APIRouter(prefix="/workouts", tags=["Workouts"])


# ── Streak calculation ─────────────────────────────────────────────────────────

def _calculate_streak(sessions: list[models.WorkoutSession]) -> int:
    """
    Streak logic:
    - Goal is 4 sessions per week (roughly every other day).
    - Streak INCREMENTS for each day that has at least one logged session.
    - Streak RESETS TO ZERO if 72 hours (3 consecutive days) pass without
      any workout entry.

    Algorithm:
      1. Collect unique workout dates (normalised to date only).
      2. Walk backwards from today; count consecutive days that are ≤72 h apart.
      3. The moment a gap > 72 h is found, stop.
    """
    if not sessions:
        return 0

    # Deduplicate: one entry per calendar date, most-recent first
    unique_dates = sorted(
        {s.date.date() for s in sessions},
        reverse=True
    )

    today      = datetime.now(timezone.utc).date()
    streak     = 0
    prev_date  = today

    for workout_date in unique_dates:
        gap_days = (prev_date - workout_date).days

        if gap_days > 3:
            # More than 72 hours have passed — streak is broken
            break

        streak   += 1
        prev_date = workout_date

    # If the most-recent session itself is >72 h ago, the streak is 0
    if unique_dates and (today - unique_dates[0]).days > 3:
        return 0

    return streak


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.post("/", response_model=schemas.WorkoutSessionOut, status_code=201)
def log_workout(
    payload:      schemas.WorkoutSessionCreate,
    db:           Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Log a new workout session with its exercises.
    Exercises are created in the same transaction (cascade insert).
    """
    session = models.WorkoutSession(
        user_id      = current_user.id,
        date         = payload.date,
        duration_min = payload.duration_min,
        body_parts   = payload.body_parts,
        notes        = payload.notes,
    )
    db.add(session)
    db.flush()   # get session.id before inserting exercises

    for ex in payload.exercises:
        exercise = models.WorkoutExercise(
            session_id = session.id,
            name       = ex.name,
            sets       = ex.sets,
            reps       = ex.reps,
            weight_kg  = ex.weight_kg,
        )
        db.add(exercise)

    db.commit()
    db.refresh(session)
    return session


@router.get("/", response_model=List[schemas.WorkoutSessionOut])
def list_workouts(
    skip:         int = 0,
    limit:        int = 20,
    db:           Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Return paginated workout sessions for the current user, newest first."""
    return (
        db.query(models.WorkoutSession)
        .filter(models.WorkoutSession.user_id == current_user.id)
        .order_by(desc(models.WorkoutSession.date))
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/dashboard", response_model=schemas.DashboardStats)
def dashboard_stats(
    db:           Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Aggregated stats for the dashboard widget:
      - current weight + BMI (from UserVitals)
      - total sessions logged
      - current streak (72-h reset rule)
      - 5 most-recent sessions for the activity feed
    """
    vitals = db.query(models.UserVitals).filter(
        models.UserVitals.user_id == current_user.id
    ).first()

    all_sessions = (
        db.query(models.WorkoutSession)
        .filter(models.WorkoutSession.user_id == current_user.id)
        .order_by(desc(models.WorkoutSession.date))
        .all()
    )

    recent_sessions = all_sessions[:5]
    streak          = _calculate_streak(all_sessions)

    return schemas.DashboardStats(
        current_weight_kg = vitals.weight_kg if vitals else None,
        bmi               = vitals.bmi       if vitals else None,
        total_sessions    = len(all_sessions),
        streak            = streak,
        recent_sessions   = recent_sessions,
        all_sessions_dates= [s.date.strftime("%Y-%m-%d") for s in all_sessions]
    )


@router.delete("/{session_id}", status_code=204)
def delete_workout(
    session_id:   int,
    db:           Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Delete a workout session (and its exercises via cascade)."""
    session = db.query(models.WorkoutSession).filter(
        models.WorkoutSession.id      == session_id,
        models.WorkoutSession.user_id == current_user.id,
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Workout not found")

    db.delete(session)
    db.commit()
