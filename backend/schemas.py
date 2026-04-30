# schemas.py — Pydantic Request/Response Schemas
# All data entering or leaving the API is validated through these models.

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr, field_validator


# ─────────────────────────────────────────────
#  AUTH
# ─────────────────────────────────────────────

class UserRegister(BaseModel):
    email:    EmailStr
    username: str
    password: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v):
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class UserLogin(BaseModel):
    email:    EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    username:     str
    has_vitals:   bool  # tells frontend whether to show onboarding


class UserOut(BaseModel):
    id:         int
    email:      str
    username:   str
    is_active:  bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ─────────────────────────────────────────────
#  ONBOARDING / VITALS
# ─────────────────────────────────────────────

class VitalsCreate(BaseModel):
    name:       str
    age:        int
    height_cm:  float
    weight_kg:  float
    goal:       str        # sent from frontend after user selects from suggestions
    experience: str        # Beginner | Intermediate | Expert

    @field_validator("experience")
    @classmethod
    def validate_experience(cls, v):
        allowed = {"Beginner", "Intermediate", "Expert"}
        if v not in allowed:
            raise ValueError(f"experience must be one of {allowed}")
        return v


class VitalsOut(BaseModel):
    id:         int
    user_id:    int
    name:       str
    age:        int
    height_cm:  float
    weight_kg:  float
    bmi:        float
    goal:       str
    experience: str
    updated_at: datetime

    model_config = {"from_attributes": True}


class BMISuggestion(BaseModel):
    """Returned by the /onboarding/bmi-suggest endpoint."""
    bmi:               float
    category:          str        # Underweight | Normal | Overweight | Obese
    suggested_goals:   List[str]  # ordered list of goal recommendations


# ─────────────────────────────────────────────
#  WORKOUT EXERCISES
# ─────────────────────────────────────────────

class ExerciseCreate(BaseModel):
    name:      str
    sets:      int
    reps:      int
    weight_kg: Optional[float] = None   # bodyweight exercises have no weight


class ExerciseOut(ExerciseCreate):
    id:         int
    session_id: int

    model_config = {"from_attributes": True}


# ─────────────────────────────────────────────
#  WORKOUT SESSIONS
# ─────────────────────────────────────────────

class WorkoutSessionCreate(BaseModel):
    date:         datetime
    duration_min: int
    body_parts:   List[str]   # e.g. ["Chest", "Arms"]
    notes:        Optional[str] = None
    exercises:    List[ExerciseCreate]

    @field_validator("body_parts")
    @classmethod
    def validate_body_parts(cls, v):
        allowed = {"Chest", "Back", "Legs", "Arms", "Shoulders", "Core"}
        for part in v:
            if part not in allowed:
                raise ValueError(f"'{part}' is not a valid body part")
        return v


class WorkoutSessionOut(BaseModel):
    id:           int
    user_id:      int
    date:         datetime
    duration_min: int
    body_parts:   List[str]
    notes:        Optional[str]
    created_at:   datetime
    exercises:    List[ExerciseOut]

    model_config = {"from_attributes": True}


# ─────────────────────────────────────────────
#  DASHBOARD STATS
# ─────────────────────────────────────────────

class DashboardStats(BaseModel):
    """Aggregated data shown on the main dashboard."""
    current_weight_kg:   Optional[float]
    bmi:                 Optional[float]
    total_sessions:      int
    streak:              int      # current weekly streak (resets if >72 h gap)
    recent_sessions:     List[WorkoutSessionOut]
    all_sessions_dates:  List[str] = [] # "YYYY-MM-DD" for activity heatmap
