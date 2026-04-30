# models.py — SQLAlchemy ORM Models
# Defines all database tables and their relationships.

from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean,
    DateTime, ForeignKey, Text, JSON
)
from sqlalchemy.orm import relationship
from .core.database import Base


class User(Base):
    """Stores authentication credentials for each user."""
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True, index=True)
    email         = Column(String, unique=True, index=True, nullable=False)
    username      = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active     = Column(Boolean, default=True)
    created_at    = Column(DateTime, default=datetime.utcnow)

    # Relationships
    vitals   = relationship("UserVitals", back_populates="user", uselist=False)
    sessions = relationship("WorkoutSession", back_populates="user")


class UserVitals(Base):
    """
    Stores onboarding data for a user.
    BMI is auto-calculated on submission; goal is derived from BMI.
    """
    __tablename__ = "user_vitals"

    id             = Column(Integer, primary_key=True, index=True)
    user_id        = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    name           = Column(String, nullable=False)
    age            = Column(Integer, nullable=False)
    height_cm      = Column(Float, nullable=False)   # height in centimetres
    weight_kg      = Column(Float, nullable=False)   # weight in kilograms
    bmi            = Column(Float, nullable=False)   # auto-calculated
    goal           = Column(String, nullable=False)  # e.g. "Fat Loss", "Muscle Gain"
    experience     = Column(String, nullable=False)  # Beginner | Intermediate | Expert
    updated_at     = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="vitals")


class WorkoutSession(Base):
    """
    A single workout session logged by the user.
    Stores date, duration, targeted body parts, and optional notes.
    """
    __tablename__ = "workout_sessions"

    id           = Column(Integer, primary_key=True, index=True)
    user_id      = Column(Integer, ForeignKey("users.id"), nullable=False)
    date         = Column(DateTime, nullable=False, default=datetime.utcnow)
    duration_min = Column(Integer, nullable=False)   # workout duration in minutes
    body_parts   = Column(JSON, nullable=False)      # list of targeted body parts
    notes        = Column(Text, nullable=True)
    created_at   = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user      = relationship("User", back_populates="sessions")
    exercises = relationship(
        "WorkoutExercise",
        back_populates="session",
        cascade="all, delete-orphan"   # deleting a session also deletes its exercises
    )


class WorkoutExercise(Base):
    """
    An individual exercise within a WorkoutSession.
    Each session can have multiple exercises (one-to-many).
    """
    __tablename__ = "workout_exercises"

    id         = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("workout_sessions.id"), nullable=False)
    name       = Column(String, nullable=False)   # e.g. "Bench Press"
    sets       = Column(Integer, nullable=False)
    reps       = Column(Integer, nullable=False)
    weight_kg  = Column(Float, nullable=True)     # weight lifted in kg; nullable for bodyweight

    # Relationships
    session = relationship("WorkoutSession", back_populates="exercises")
