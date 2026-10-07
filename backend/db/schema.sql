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
  distance NUMERIC NOT NULL, -- in meters
  moving_time INTEGER NOT NULL -- in seconds
);

CREATE TABLE IF NOT EXISTS weekly_summaries (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  week_start DATE NOT NULL,  -- only care about the day
  week_end DATE NOT NULL,
  summary_text TEXT NOT NULL, -- summary that AI generates, variable length
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, week_start) -- avoids creating duplicate rows
);

CREATE TABLE IF NOT EXISTS goals(
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  event_distance TEXT NOT NULL, -- 5k | 10k | half | full | custom
  custom_distance_miles NUMERIC, -- when event distance = custom, set mileage value
  event_date DATE NOT NULL,
  target_time_seconds INTEGER NOT NULL, -- goal finish time, in seconds
  runs_per_week INTEGER, 
  status TEXT NOT NULL DEFAULT 'active', -- active, completed or abandoned
  created_at TIMESTAMP DEFAULT NOW()
);

-- only allow one active goal per user at a time
CREATE UNIQUE INDEX IF NOT EXISTS one_active_goal_per_user
  ON goals(user_id) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS plan_weeks(
  id SERIAL PRIMARY KEY,
  goal_id INTEGER REFERENCES goals(id) NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  planned_distance_miles NUMERIC NOT NULL,
  workout_items JSONB NOT NULL, -- array of { type: long|speed|recovery, distance, targetPace }, length = runs per week
  is_regenerated BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(goal_id, week_start)
);