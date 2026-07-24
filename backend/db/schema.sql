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