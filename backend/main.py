# main.py — FastAPI application entry point
# Run with: uvicorn backend.main:app --reload

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.core.database import engine, Base
from backend.routers import auth, onboarding, workouts

# ── Create all tables on startup ───────────────────────────────────────────────
# In production, replace this with Alembic migrations.
Base.metadata.create_all(bind=engine)

# ── App instance ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="Workout Tracker API",
    version="1.0.0",
    description="Backend for the sleek workout tracking application",
)

# ── CORS — allow the Vite dev server ──────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],   # Vite default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register routers ───────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(onboarding.router)
app.include_router(workouts.router)


@app.get("/health")
def health_check():
    return {"status": "ok"}
