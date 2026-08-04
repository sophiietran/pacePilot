CREATE TABLE IF NOT EXISTS users (
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

CREATE TABLE IF NOT EXISTS activities(
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  strava_activity_id BIGINT UNIQUE NOT NULL,
  start_date_local TIMESTAMP NOT NULL,
  distance NUMERIC NOT NULL -- in meters
)