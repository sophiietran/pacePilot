# Goal Setting + AI Coaching Plan

## Context

PacePilot currently tracks activities, streaks, personal bests, and AI-generated weekly summaries, but has no way for a user to set a target (e.g. a race) or get a structured plan toward it. This is the next roadmap item.

The workflow is two explicit steps, not one:
1. **Set a goal** — event distance, target date, target finish time. This immediately shows a summary card (event, race date, weeks remaining) with no AI call yet.
2. **Generate a coaching plan** — a separate user action, where the user also picks how many runs per week they want. This triggers one AI call that produces the full week-by-week plan up front (not week-by-week over time).

Each plan week has a total mileage target plus a structured list of runs to hit that count (e.g. "1 speed run at goal pace, 1 long run of 8mi, 2 recovery runs of 30min") — reflecting the user's chosen runs-per-week. Since there's no background job infra in this app, "is the user behind" is computed at request time by comparing the most recently completed week's actual mileage and actual run count (from `activities`) against that week's target — either a mileage shortfall or a missed run counts as behind. When behind, the user can regenerate the remaining (not-yet-started) weeks of the plan against their real current fitness.

Scope is deliberately narrow per the user: only the "train for an event" goal type (no "build fitness"/"stay active" yet), one active goal at a time.

## Schema

Add to `backend/db/schema.sql`, after `weekly_summaries`:

```sql
CREATE TABLE IF NOT EXISTS goals (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  event_distance TEXT NOT NULL,          -- '5k' | '10k' | 'half' | 'full' | 'custom'
  custom_distance_miles NUMERIC,         -- only set when event_distance = 'custom'
  event_date DATE NOT NULL,
  target_time_seconds INTEGER NOT NULL,  -- goal finish time, in seconds
  runs_per_week INTEGER,                 -- set when the plan is generated; null until then
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'completed' | 'abandoned'
  created_at TIMESTAMP DEFAULT NOW()
);

-- only one active goal per user at a time
CREATE UNIQUE INDEX IF NOT EXISTS one_active_goal_per_user
  ON goals(user_id) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS plan_weeks (
  id SERIAL PRIMARY KEY,
  goal_id INTEGER REFERENCES goals(id) NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  planned_distance_miles NUMERIC NOT NULL,
  workout_items JSONB NOT NULL,        -- array of { type, description, distanceMiles?, durationMinutes? }, length = runs_per_week
  is_regenerated BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(goal_id, week_start)
);
```

Notes:
- Two tables, not a JSON blob for the whole plan — actual-vs-planned comparison needs to query individual weeks by date range against `activities`, same shape as `weekly_summaries` already does. `workout_items` itself is JSONB because it's a small, display-only structured list (run type + description, e.g. `{type: "speed", description: "4x800m @ 7:30/mi"}`) that's never queried by its contents — only its `length` (compared against `runs_per_week` for the missed-run check) and rendered as-is on the frontend.
- No `actual_distance_miles`/`actual_run_count` columns — actuals are always computed live from `activities` at request time (no second source of truth to keep in sync).
- No per-week status column — past/current/future is derived from today vs `week_start`/`week_end` in the route.
- `runs_per_week` lives on `goals` (not `plan_weeks`) since it's a single choice made once at plan-generation time and reused on every regenerate — not a per-week value.

## Backend

New files, mounted the same way as existing routes (`app.use("/goals", require("./routes/goals"))` in `backend/index.js`):

- **`backend/routes/utils/buildPlanPrompt.js`** — exports `PLAN_SYSTEM_PROMPT`, `buildPlanPrompt(goal, recentStats, weekBoundaries)`, `buildRegeneratePrompt(goal, recentStats, remainingWeekBoundaries)`. Mirrors the shape of `backend/routes/utils/buildSummaryPrompt.js`.
- **`backend/routes/utils/getWeekBoundaries.js`** — `getWeekBoundaries(weekOffset)` (0 = this week, negative = past, positive = future) and `getWeekBoundariesUntil(targetDate, startOffset)`, which builds the **list** of Monday-aligned `{weekStart, weekEnd}` pairs from `startOffset` weeks out through the week containing `targetDate` (needed to hand Claude an exact list of weeks to fill in, so it never has to do its own date arithmetic). Deliberately built with UTC arithmetic rather than porting `weeklySummaryAI.js`'s local-time version, so these Dates line up directly with `goal.event_date` (a Postgres `DATE` column) and can share one formatter (`formatDate()` in `buildPlanPrompt.js`) instead of needing separate local/UTC formatting helpers.
- **`backend/routes/goals.js`** — the route file:
  - `POST /goals/:userId` — creates the goal only, **no AI call**. Body `{ eventDistance, customDistanceMiles?, eventDate, targetTimeSeconds }`. Rejects with 409 if an active goal already exists (backstopped by the partial unique index). Returns the created goal row so the frontend can immediately show the summary card (event, race date, weeks remaining — weeks-remaining is just computed client-side from `eventDate`).
  - `GET /goals/:userId` — loads the active goal and its `plan_weeks` (empty array if the plan hasn't been generated yet). Returns `{ goal: null }` if no active goal (mirrors `weeklySummaryAI.js:47-48`). If `plan_weeks` exist, for each week with `week_end < today` computes actual miles via `getWeeklyStats(userId, week_start, week_end)` (reused as-is from `backend/routes/utils/getWeeklyStats.js`) and actual run count (`stats.rows.length`, exposed from the same query — `getWeeklyStats` already fetches per-activity rows before aggregating, so returning `runCount` is already there at `getWeeklyStats.js:18`). Computes `isBehindPace` from the most recently completed week: `actualMiles < plannedDistanceMiles * 0.7 || actualRunCount < runsPerWeek`. Returns `{ goal, weeks, isBehindPace, behindWeek }`.
  - `POST /goals/:userId/generatePlan` — the AI call, as its own step. Body `{ runsPerWeek }`. Loads the active goal (404 if none, 409 if `plan_weeks` already exist — this is a first-time-only generation; use regenerate to redo it). Persists `runsPerWeek` onto the `goals` row. Pulls recent training history (last ~8 weeks via `getWeeklyStats` in a loop) to ground the plan. Builds the week-boundary list from now to `eventDate`, calls `buildPlanPrompt(goal, recentStats, weekBoundaries, runsPerWeek)`, sends to `anthropic.messages.create` (same client/model as `weeklySummaryAI.js` — `claude-haiku-4-5`, but `max_tokens` raised to ~3000+ to fit a multi-week JSON payload with per-run breakdowns), parses/validates the JSON response (see below), then inserts all `plan_weeks` rows inside a `pool.connect()` transaction (`BEGIN`/`COMMIT`/`ROLLBACK`) so a bad plan never gets half-persisted.
  - `POST /goals/:userId/regenerate` — loads the active goal (uses its stored `runs_per_week`, no new input needed), splits weeks at **next Monday** (current week, once started, is left alone; only weeks starting next Monday or later are replaced). Computes recent actual fitness (last 2-4 weeks), calls `buildRegeneratePrompt`, validates, then in a transaction deletes `plan_weeks WHERE goal_id=$1 AND week_start >= $2` (next Monday) and inserts the new rows with `is_regenerated = true`.
  - Same conventions throughout as `personalBests.js`/`mileageHistory.js`: no auth middleware, `req.params.userId` trusted directly, try/catch → `console.error` → `res.status(500).json({error})`.

**JSON output contract for the AI call** — request:
```json
{
  "weeks": [
    {
      "weekStart": "2026-09-08",
      "weekEnd": "2026-09-14",
      "plannedDistanceMiles": 18,
      "workoutItems": [
        { "type": "long", "distance": "8 miles", "targetPace": "9:00/mi" },
        { "type": "speed", "distance": "6x400m intervals", "targetPace": "7:15/mi" },
        { "type": "recovery", "distance": "3 miles easy", "targetPace": "9:45/mi" },
        { "type": "recovery", "distance": "30 min easy", "targetPace": "9:45/mi" }
      ]
    }
  ]
}
```
Week boundaries are computed server-side and given to Claude as the exact list to fill in (never trust the model with date math), along with `runsPerWeek` so the length of `workoutItems` is fixed per week. Run `type` is exactly one of `long`/`speed`/`recovery` — `speed` covers both tempo and interval workouts, with the specific structure (e.g. "6x400m" vs "20 min tempo") captured in the `distance` string rather than as a separate field. Every week always includes exactly one `long` run; if `runsPerWeek` is 2, the second run is either `speed` or `recovery` (coach's judgment); if `runsPerWeek` is 3+, at least one of each type is required. System prompt tells Claude to respond with JSON only (no markdown fences), derive speed-run pacing from the goal's target time/distance, progress mileage sensibly toward the goal, taper the final 1-2 weeks, and stay grounded in the runner's current weekly mileage. Validation before insert: `JSON.parse` in a try/catch (500 on failure), confirm `weeks.length` matches the expected boundary count, confirm each `weekStart`/`weekEnd` matches the expected list in order, confirm `plannedDistanceMiles` is a positive number, confirm `workoutItems.length === runsPerWeek`, confirm each item's `type` is one of `long`/`speed`/`recovery` with a non-empty `distance` and `targetPace` string, and confirm exactly one `long` per week — reject the whole batch (500) on any mismatch rather than partially inserting.

## Frontend

- **`frontend/app/dashboard/GoalTracker.tsx`** (new, `"use client"`) — same fetch/state conventions as `WeeklySummary.tsx`: fetch `GET /goals/${userId}` on mount, and again on `syncSignal` change (via `useSyncContext()`, matching `WeeklySummary.tsx:18-23`) so completed-week actuals reflect newly synced runs. Three render states depending on what's loaded:
  1. **No goal** (`goal === null`): goal-creation form using the existing card shell (`border text-white border-white/20 p-6 rounded-2xl bg-white/10 backdrop-blur-md shadow-lg`) — `<select>` for event distance (5k/10k/half/full/custom, revealing a miles input when custom is picked), `<input type="date">` for target date, a single text input for target time (e.g. `"1:45:00"`, parsed client-side into `target_time_seconds`). Submit calls `POST /goals/${userId}`; on success sets `goal` state directly from the response.
  2. **Goal set, no plan yet** (`goal` exists, `weeks.length === 0`): a summary card — event/distance, race date, "N weeks until race day" (computed client-side from `eventDate`) — plus a small "runs per week" number input and a "Generate Coaching Plan" button that calls `POST /goals/${userId}/generatePlan` with `{ runsPerWeek }`; on success sets `weeks` state from the response.
  3. **Plan generated** (`weeks.length > 0`): goal summary header, an `isBehindPace` banner (amber border/bg within the existing dark palette) — copy covers both trigger cases, e.g. "You're behind pace — X of Y planned miles and only Z of N runs logged last week" — with a "Regenerate Plan" button wired to `POST /goals/${userId}/regenerate`. Below that, a plain `.map()` list of weeks (no pagination — plans are at most ~20 weeks), each showing the mileage target, the `workoutItems` list (type + description), and — for completed weeks — actual miles/run count alongside the targets. Current week is visually highlighted.
- **`frontend/app/dashboard/page.tsx`** — add `<GoalTracker userId={user_id} />` to the left column (alongside `WeeklySummary`, `MileageHistoryChart`), passing `userId` the same way those components already receive it.

## Files to create/modify, in order

1. `backend/db/schema.sql` — add `goals` + `plan_weeks` tables.
2. `backend/routes/utils/getWeekBoundaries.js` — new shared week-boundary helper (generalized from `weeklySummaryAI.js`'s inline version).
3. `backend/routes/utils/buildPlanPrompt.js` — new prompt builder.
4. `backend/routes/goals.js` — new route file (create goal / get / generatePlan / regenerate).
5. `backend/index.js` — mount `/goals`.
6. `frontend/app/dashboard/GoalTracker.tsx` — new component.
7. `frontend/app/dashboard/page.tsx` — render it.

## Verification

1. Apply schema changes locally; confirm `goals`/`plan_weeks` exist via `\dt` / `\d`.
2. `curl -X POST localhost:5001/goals/1 -d '{"eventDistance":"half","eventDate":"2026-11-15","targetTimeSeconds":6300}'` — confirm a goal row is created and returned, with **no** `plan_weeks` rows yet.
3. Repeat the same POST — confirm 409 (one-active-goal rule enforced).
4. `curl -X POST localhost:5001/goals/1/generatePlan -d '{"runsPerWeek":4}'` — confirm a sensible increasing-then-tapering weekly plan is returned and persisted (`SELECT * FROM plan_weeks ORDER BY week_start`), each row's `workout_items` has exactly 4 entries with plausible speed/long/recovery types, and `goals.runs_per_week` is now `4`.
5. Repeat the same `generatePlan` call — confirm 409 (plan already exists; must use regenerate instead).
6. `curl localhost:5001/goals/1` — confirm `{goal, weeks, isBehindPace: false, behindWeek: null}` shape (no completed weeks yet).
7. Manually backdate one `plan_weeks` row and insert activities for that week: (a) case with low total mileage but full run count, (b) case with full mileage but a missing run — re-`GET` after each and confirm `isBehindPace: true` in both cases, proving the check catches either failure mode independently.
8. `curl -X POST localhost:5001/goals/1/regenerate` — confirm the backdated (past) week is untouched, and weeks from next Monday onward are replaced with `is_regenerated=true` rows, still using `runs_per_week=4` from the goal, spanning correctly to `event_date`.
9. In the frontend (`npm run dev`, `/dashboard?user_id=1`): confirm the creation form renders with no goal; submitting flips to the "goal set, no plan" summary card; entering runs-per-week and generating flips to the full plan view; the behind-pace banner + regenerate button appear/work with the seeded data from step 7; current/past/future weeks are visually distinct and each week's `workoutItems` render as a readable list.
