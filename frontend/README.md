# RepLog Frontend

Vite + React frontend for the RepLog workout tracker.

## Scripts

```bash
npm install
npm run dev
npm run build
npm run preview
```

The development server runs at `http://localhost:5173`.

The backend is a FastAPI API backed by MongoDB. During development, Vite proxies API calls for `/auth`, `/onboarding`, and `/workouts` to `http://localhost:8000`.
