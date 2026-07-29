# PacePilot

## Project Overview
PacePilot is a personal resume project — a web app that connects to the
Strava API to help runners track their performance. It displays dashboards,
personal records, AI-generated weekly run summaries, and lets users set
goals (e.g. a race or duration target). It will eventually generate
AI coaching plans to help users reach those goals.

This is a learning + portfolio project. Code should stay simple and
readable over clever — this project will be explained in interviews.

## Current Status
Actively building the MVP. Right now the focus is on:
1. Strava OAuth connection flow
2. Fetching and displaying the user's activities on a dashboard

Features NOT yet built (do not implement unless explicitly asked):
- AI weekly summaries
- Goal setting
- AI coaching plan generation
- Personal records calculations

## Tech Stack
- Frontend: Next.js (App Router), TypeScript, Tailwind CSS
- Backend: Node.js + Express
- Database: PostgreSQL (pacepilot_db)
- External API: Strava API v3 (OAuth2 + REST)

## Project Structure
pacepilot/
├── backend/
│   ├── db/
│   │   ├── schema.sql       # DB table definitions
│   │   ├── pool.js          # shared pg connection pool
│   │   └── testConnection.js
│   ├── routes/
│   │   └── auth.js          # Strava OAuth routes
│   ├── index.js             # Express app entry point
│   └── .env                 # STRAVA_CLIENT_ID, DATABASE_URL, etc.
└── frontend/
    ├── app/
    │   ├── page.tsx          # landing page, "Connect with Strava" button
    │   └── dashboard/
    │       └── page.tsx      # displays user's Strava activities
    └── .env.local            # NEXT_PUBLIC_BACKEND_URL

## Database Schema (current)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  strava_athlete_id BIGINT UNIQUE NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at BIGINT NOT NULL,
  firstname TEXT,
  lastname TEXT,
  profile_picture TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

More tables (activities, goals) will be added as features are built —
don't create them preemptively.

## OAuth Flow (how it works)
1. User clicks "Connect with Strava" on frontend -> links to
   backend /auth/strava
2. Backend redirects to Strava's OAuth authorize page with client_id + scope
3. User approves on Strava's site
4. Strava redirects to backend /auth/strava/callback?code=...
5. Backend exchanges code for access_token/refresh_token via Strava's
   /oauth/token endpoint
6. Backend saves/updates the user row in Postgres (upsert on
   strava_athlete_id)
7. Backend redirects to frontend /dashboard?user_id={id}

Note: this uses a raw user_id in the URL for now — no sessions/JWT yet.
This is intentionally simple for MVP and will likely be revisited.

## Conventions
- Use async/await, not .then() chains
- Comment non-obvious logic, especially anything related to Strava's
  OAuth quirks (e.g. token expiry, scopes)
- Keep backend routes thin — logic that talks to Strava or the DB should
  be easy to read top-to-bottom
- Prefer plain fetch/axios over adding new dependencies unless necessary
- Tailwind for all frontend styling, no CSS modules

## Environment Variables

backend/.env
STRAVA_CLIENT_ID=
STRAVA_CLIENT_SECRET=
STRAVA_REDIRECT_URI=http://localhost:5001/auth/strava/callback
FRONTEND_URL=http://localhost:3000
DATABASE_URL=postgres://user:pass@localhost:5432/pacepilot_db
PORT=5001

frontend/.env.local
NEXT_PUBLIC_BACKEND_URL=http://localhost:5001

## Useful Strava API Endpoints
- GET /athlete — logged-in athlete's profile
- GET /athlete/activities — list of recent activities
- GET /activities/{id} — details of one activity
- GET /athletes/{id}/stats — athlete totals/stats

Strava access tokens expire after 6 hours — refresh_token flow will need
to be implemented eventually but is not built yet.

This project will be built in steps so I can learn as I go. 