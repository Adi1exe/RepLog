# RepLog - Workout Tracker

A full-stack workout tracking application built with FastAPI, MongoDB, and Vite/React.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Vite + React 18, Tailwind CSS, Axios, React Router |
| Backend | Python 3.11+, FastAPI, PyMongo, Pydantic |
| Database | MongoDB |
| Auth | JWT, bcrypt password hashing, email verification, Google/GitHub OAuth |

## Project Structure

```text
backend/
  core/
    database.py      # MongoDB client, dependency, and production indexes
    security.py      # JWT, password hashing, current-user dependency
  routers/
    auth.py          # Register, login, verification, OAuth, profile
    onboarding.py    # Vitals, BMI suggestions
    workouts.py      # Workout CRUD, dashboard, persisted progress/streaks
  schemas.py
  main.py
  requirements.txt

frontend/
  src/
    api/
    components/
    context/
    pages/
  package.json
```

## Quick Start

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

The API runs at `http://localhost:8000`.
Interactive docs are available at `http://localhost:8000/docs`.

MongoDB must be running and reachable through `MONGO_URI`. For local development, the default is `mongodb://localhost:27017` with database `replog`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The app runs at `http://localhost:5173`.

## Environment Variables

| Variable | Default | Description |
| --- | --- | --- |
| `ENVIRONMENT` | `development` | Set to `production` to enforce production safety checks |
| `SECRET_KEY` | dev fallback only | JWT signing secret; required in production and must be 32+ chars |
| `MONGO_URI` | `mongodb://localhost:27017` | MongoDB connection string |
| `MONGO_DATABASE` | `replog` | MongoDB database name |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated allowed frontend origins |
| `JWT_ISSUER` | `replog-api` | JWT issuer claim |
| `JWT_AUDIENCE` | `replog-web` | JWT audience claim |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` | Access token lifetime |
| `COOKIE_SAMESITE` | `lax` | Auth cookie SameSite policy |
| `SMTP_EMAIL` | unset | Enables real verification emails |
| `SMTP_PASSWORD` | unset | SMTP password/app password |
| `SMTP_HOST` | `smtp.gmail.com` | SMTP host |
| `SMTP_PORT` | `465` | SMTP SSL port |
| `VERIFICATION_CODE_SECRET` | `SECRET_KEY` | HMAC secret for stored verification-code hashes |
| `VERIFICATION_CODE_TTL_MINUTES` | `15` | Verification code expiration |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | unset | GitHub OAuth credentials |

Production example:

```bash
set ENVIRONMENT=production
set SECRET_KEY=your-super-secret-random-string-at-least-32-chars
set MONGO_URI=mongodb+srv://user:password@cluster.example/replog
set CORS_ORIGINS=https://your-frontend.example
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

## API Summary

### Auth

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/auth/register` | Create account and send verification code |
| `POST` | `/auth/login` | Login with email/password |
| `POST` | `/auth/verify-email` | Verify email with a code |
| `POST` | `/auth/resend-verification` | Send a fresh verification code |
| `POST` | `/auth/oauth` | Google/GitHub OAuth login |
| `POST` | `/auth/logout` | Clear the HTTP-only auth cookie |
| `GET` | `/auth/me` | Current user profile |
| `PUT` | `/auth/me` | Update username/email |

### Onboarding

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/onboarding/bmi-suggest` | Calculate BMI and suggested goals |
| `POST` | `/onboarding/vitals` | Upsert vitals/profile |
| `GET` | `/onboarding/vitals` | Fetch current vitals |

### Workouts

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/workouts/` | Log a workout session |
| `GET` | `/workouts/` | List workout history |
| `GET` | `/workouts/dashboard` | Dashboard stats, progress, streak, recent sessions |
| `DELETE` | `/workouts/{id}` | Delete a workout session |

## Production Notes

- Runtime persistence is MongoDB-backed; SQLite is no longer used by the backend.
- `user_progress` stores derived progress and streak state. It is rebuilt after workout changes and when the dashboard is requested.
- MongoDB indexes are created at startup for unique users, one vitals record per user, and workout history sorting.
- Verification codes are stored as HMAC hashes and expire by default after 15 minutes.
- Production startup fails if `SECRET_KEY` is missing or too short.
- Browser sessions use an HTTP-only `access_token` cookie. Bearer tokens are still accepted for API clients.
