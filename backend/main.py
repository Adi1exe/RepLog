"""FastAPI application entry point."""

import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Load environment variables from .env file
load_dotenv()
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from backend.core.database import configure_indexes
from backend.routers import auth, onboarding, workouts


app = FastAPI(
    title="Workout Tracker API",
    version="1.0.0",
    description="Backend for RepLog workout tracking",
)


@app.on_event("startup")
def startup():
    configure_indexes()


allowed_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(onboarding.router)
app.include_router(workouts.router)


@app.get("/health")
def health_check():
    return {"status": "ok"}
