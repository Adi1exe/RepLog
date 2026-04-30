# RepLog — Workout Tracker

A full-stack workout tracking application built with **FastAPI** + **Vite/React**.

---

## Tech Stack

| Layer      | Technology                                      |
|------------|-------------------------------------------------|
| Frontend   | Vite + React 18, Tailwind CSS, Axios, React Router |
| Backend    | Python 3.11+, FastAPI, SQLAlchemy, Pydantic     |
| Database   | SQLite (dev) → PostgreSQL-ready                 |
| Auth       | JWT (python-jose) + bcrypt password hashing     |

---

## Project Structure

```
workout-tracker/
├── backend/
│   ├── core/
│   │   ├── database.py       # SQLAlchemy engine + session factory
│   │   └── security.py       # JWT helpers, password hashing, auth dependency
│   ├── routers/
│   │   ├── auth.py           # POST /auth/register, /auth/login
│   │   ├── onboarding.py     # POST /onboarding/vitals, /onboarding/bmi-suggest
│   │   └── workouts.py       # CRUD /workouts/, GET /workouts/dashboard
│   ├── models.py             # SQLAlchemy ORM: User, UserVitals, WorkoutSession, WorkoutExercise
│   ├── schemas.py            # Pydantic request/response schemas
│   ├── main.py               # FastAPI app entry point, CORS, router registration
│   └── requirements.txt
│
└── frontend/
    ├── public/
    ├── src/
    │   ├── api/
    │   │   ├── client.js     # Axios instance with JWT interceptor
    │   │   ├── auth.js       # register / login calls
    │   │   └── workouts.js   # vitals, workout CRUD, dashboard
    │   ├── components/
    │   │   ├── StatCard.jsx       # Reusable metric widget
    │   │   ├── StreakWidget.jsx    # SVG ring streak counter
    │   │   ├── RecentSessions.jsx # Activity feed with delete
    │   │   └── WorkoutModal.jsx   # Dynamic workout entry form
    │   ├── context/
    │   │   └── AuthContext.jsx    # Global auth state + localStorage sync
    │   ├── pages/
    │   │   ├── AuthPage.jsx       # Login + Register
    │   │   ├── Onboarding.jsx     # 3-step vitals + goal + experience flow
    │   │   └── Dashboard.jsx      # Main stats + streak + feed + FAB
    │   ├── App.jsx                # Route definitions + guards
    │   ├── main.jsx               # React entry point
    │   └── index.css              # Tailwind directives + component layer
    ├── index.html
    ├── tailwind.config.js         # #0a0a0a base + accent palette
    ├── vite.config.js             # Dev proxy to FastAPI
    └── package.json
```

---

## Quick Start

### 1 — Backend

```bash
cd workout-tracker/backend

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the development server (auto-reloads on save)
uvicorn backend.main:app --reload
```

The API will be live at **http://localhost:8000**  
Interactive docs: **http://localhost:8000/docs**

> **Note:** The SQLite database file (`workout_tracker.db`) is created automatically
> in the `backend/` directory on first run. No setup required.

---

### 2 — Frontend

```bash
cd workout-tracker/frontend

# Install node dependencies
npm install

# Start the Vite dev server
npm run dev
```

The app will be live at **http://localhost:5173**

Vite proxies all `/auth`, `/onboarding`, and `/workouts` requests to the FastAPI
backend automatically — no manual CORS configuration needed during development.

---

## Environment Variables

For production deployments, set these environment variables on your server:

| Variable     | Default (dev)                      | Description                         |
|--------------|------------------------------------|-------------------------------------|
| `SECRET_KEY` | `change-me-in-production-please`   | JWT signing secret — **change this!** |

```bash
# Example (Linux/macOS)
export SECRET_KEY="your-super-secret-random-string-here"
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

---

## Migrating to PostgreSQL

1. Install the async driver:
   ```bash
   pip install psycopg2-binary
   ```

2. Update `DATABASE_URL` in `backend/core/database.py`:
   ```python
   SQLALCHEMY_DATABASE_URL = "postgresql://user:password@localhost/replog"
   ```

3. Remove the `connect_args` kwarg (SQLite-only):
   ```python
   engine = create_engine(SQLALCHEMY_DATABASE_URL)
   ```

4. Install and configure [Alembic](https://alembic.sqlalchemy.org/) for proper
   schema migrations in production.

---

## API Reference

### Auth
| Method | Endpoint          | Body                              | Returns          |
|--------|-------------------|-----------------------------------|------------------|
| POST   | `/auth/register`  | `{email, username, password}`     | `TokenResponse`  |
| POST   | `/auth/login`     | `{email, password}`               | `TokenResponse`  |

### Onboarding
| Method | Endpoint                      | Auth | Description                      |
|--------|-------------------------------|------|----------------------------------|
| POST   | `/onboarding/bmi-suggest`     | ✓    | Returns BMI + suggested goals    |
| POST   | `/onboarding/vitals`          | ✓    | Save/update user vitals          |
| GET    | `/onboarding/vitals`          | ✓    | Fetch current user's vitals      |

### Workouts
| Method | Endpoint               | Auth | Description                          |
|--------|------------------------|------|--------------------------------------|
| POST   | `/workouts/`           | ✓    | Log a new workout session            |
| GET    | `/workouts/`           | ✓    | List sessions (paginated)            |
| GET    | `/workouts/dashboard`  | ✓    | Stats + streak + recent sessions     |
| DELETE | `/workouts/{id}`       | ✓    | Delete a session                     |

---

## Key Design Decisions

### Streak Logic
The streak counter in `routers/workouts.py → _calculate_streak()` works as follows:
- Sessions are deduplicated to one entry per **calendar date**
- Walking backwards from today, the streak increments for each date with a session
- If a **gap > 72 hours (3 days)** is found between any two consecutive workout dates, the walk stops and the streak resets
- If the most-recent session itself is older than 72 h, the streak is immediately `0`

### BMI Goal Suggestions
`routers/onboarding.py → _suggest_goals()` maps BMI category to an ordered list of
goals. The first item is the primary recommendation shown highlighted in the UI:

| BMI Category  | Suggested Goals (ordered)                       |
|---------------|-------------------------------------------------|
| Underweight   | Muscle Gain → Maintenance → Strength            |
| Normal        | Maintenance → Muscle Gain → Fat Loss → Strength |
| Overweight    | Fat Loss → Maintenance → Muscle Gain            |
| Obese         | Fat Loss → Maintenance                          |

### JWT Strategy
- Tokens are signed with HS256 and expire after **7 days**
- The Axios interceptor in `api/client.js` attaches the token to every request
- A `401` response from any endpoint triggers an automatic logout + redirect to `/login`

### Relational Data
`WorkoutSession` → `WorkoutExercise` is a true one-to-many with `cascade="all, delete-orphan"`,
so deleting a session also removes all its exercises in a single DB call.
