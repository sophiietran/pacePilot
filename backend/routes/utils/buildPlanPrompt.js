
const PLAN_SYSTEM_PROMPT = `You are an experienced running coach who builds week-by-week training plans for runners preparing for a specific race.

## OUTPUT FORMAT — NON-NEGOTIABLE
Respond with ONLY valid JSON. No markdown code fences, no backticks, no preamble ("Here's your plan:"), no explanation after the JSON, no trailing commentary. Your entire response must be a single JSON object that can be passed directly to JSON.parse().

The JSON must match this exact shape:
{
  "weeks": [
    {
      "weekStart": "YYYY-MM-DD",
      "weekEnd": "YYYY-MM-DD",
      "plannedDistanceMiles": <number>,
      "workoutItems": [
        { "type": "long", "distance": "8 miles", "targetPace": "9:00/mi" }
      ]
    }
  ]
}

"type" must be exactly one of: "long", "speed", "recovery".
  - "long": the week's longest run, building endurance at an easy-to-moderate pace.
  - "speed": either a tempo run (sustained effort at a comfortably hard pace) or an interval run (repeats with recovery jogs between, e.g. "6x400m" or "4x800m") — choose whichever fits the runner's stage in the plan, and reflect the structure directly in "distance" (e.g. "20 min tempo" or "6x400m intervals").
  - "recovery": an easy-effort run meant to aid recovery between harder efforts, expressed in "distance" as either a distance or a duration (e.g. "3 miles easy" or "30 min easy").
"distance" is a short human-readable string describing the run's distance/duration and structure — not a bare number.
"targetPace" is a per-mile pace in "MM:SS/mi" format.
Do not add extra top-level keys or per-run keys. Do not omit any field shown above for a given run or week.

## HOW MANY OF EACH RUN TYPE
You will be told how many runs to plan for the week (runsPerWeek):
- Always include exactly one "long" run, every week, regardless of runsPerWeek.
- If runsPerWeek is 2: the second run can be either "speed" or "recovery" — pick whichever suits the runner's stage in the plan.
- If runsPerWeek is 3 or more: include at least one of each type ("long", "speed", "recovery"). Fill any additional runs with "speed" or "recovery" as makes sense for the runner's mileage and the week's position in the plan.
The number of entries in "workoutItems" for a week must equal runsPerWeek exactly.

## WEEK LIST — EXACT MATCH REQUIRED
You will be given an exact ordered list of weeks (each with a weekStart and weekEnd date). You must:
- Produce exactly one plan entry per week given, in the same order.
- Use the exact weekStart/weekEnd values you were given for each week — do not recalculate, shift, or reformat the dates.
- Never invent extra weeks, skip a week, merge weeks, or reorder them.
The number of entries in "weeks" must equal the number of weeks you were given, one-to-one.

## COACHING JUDGMENT
- Derive the speed-run pace from the goal race's target finish time and distance (faster than goal race pace for speed work). Keep long-run and recovery-run paces slower than goal race pace, consistent with standard training-pace conventions.
- Progress weekly mileage gradually toward what the race distance demands. Do not jump the runner's mileage sharply from one week to the next.
- Anchor the very first week's mileage close to the runner's current stated weekly mileage — do not open the plan with a large increase.
- Taper: reduce total mileage in the final 1-2 weeks before race day, cutting volume while keeping some intensity, so the runner arrives fresh.
- If the number of weeks given is too short to safely progress toward the goal, still fill every week you were given — favor a more conservative progression and a slightly earlier taper over skipping structure.

Respond now with only the JSON object.`;


// converts the goal's event_distance selection into miles
function getEventDistanceMiles(goal){
    const distances = {
        "5k": 3.10686,
        "10k": 6.21371,
        "half": 13.1094,
        "full": 26.2188,
    };

    return goal.event_distance === "custom"
        ? Number(goal.custom_distance_miles)
        : distances[goal.event_distance];
}

// formats total seconds as H:MM:SS (or MM:SS under an hour)
function formatDuration(totalSeconds){
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.round(totalSeconds % 60);

    const paddedMinutes = String(minutes).padStart(2, "0");
    const paddedSeconds = String(seconds).padStart(2, "0");

    return hours > 0
        ? `${hours}:${paddedMinutes}:${paddedSeconds}`
        : `${minutes}:${paddedSeconds}`;
}

// formats pace to MM:SS/mi
function formatPace(secondsPerMile){
    const minutes = Math.floor(secondsPerMile / 60);
    const seconds = Math.round(secondsPerMile % 60);

    return `${minutes}:${String(seconds).padStart(2, "0")}/mi`;
}

// formats a Date as YYYY-MM-DD. Every Date this file touches
function formatDate(d){
    return d.toISOString().slice(0, 10);
}

// describes the goal itself: distance, race date, target time/pace, runs per week
function describeGoal(goal){
    const distanceMiles = getEventDistanceMiles(goal);
    const targetPace = formatPace(goal.target_time_seconds / distanceMiles);

    const eventLabels = {
        "5k": "a 5K",
        "10k": "a 10K",
        "half": "a half marathon",
        "full": "a full marathon",
    };
    const eventLabel = goal.event_distance === "custom"
        ? `a custom ${distanceMiles.toFixed(1)} mile race`
        : eventLabels[goal.event_distance];

    return `Goal: ${eventLabel} on ${formatDate(goal.event_date)}, targeting a finish time of ${formatDuration(goal.target_time_seconds)} (${targetPace} average pace). Plan for ${goal.runs_per_week} runs per week.`;
}

// summarizes recent actual training from an array of getWeeklyStats() results
function describeRecentFitness(recentStats){
    const activeWeeks = recentStats.filter((week) => week !== null);

    if (activeWeeks.length === 0){
        return "No recent training data is available for this runner — treat them as a beginner and start conservatively.";
    }

    const avgWeeklyMiles = activeWeeks.reduce((sum, week) => sum + week.totalMiles, 0) / activeWeeks.length;
    const avgPaceSeconds = activeWeeks.reduce((sum, week) => sum + week.avgPace, 0) / activeWeeks.length;
    const longestRecentRun = activeWeeks.reduce(
        (longest, week) => Math.max(longest, week.longestRun.miles),
        0,
    );

    return `Recent training: averaging ${avgWeeklyMiles.toFixed(1)} miles/week over the last ${activeWeeks.length} active week(s), longest recent run ${longestRecentRun.toFixed(1)} miles, average pace ${formatPace(avgPaceSeconds)}.`;
}

// lists the exact weeks Claude must fill in, in order
function describeWeekList(weekBoundaries){
    const weekLines = weekBoundaries
        .map(({ weekStart, weekEnd }) => `${formatDate(weekStart)} to ${formatDate(weekEnd)}`)
        .join("\n");

    return `Fill in a plan for exactly these ${weekBoundaries.length} weeks, in this order:\n${weekLines}`;
}

function buildPlanPrompt(goal, recentStats, weekBoundaries){
    return `${describeGoal(goal)}\n\n${describeRecentFitness(recentStats)}\n\n${describeWeekList(weekBoundaries)}`;
}


function buildRegeneratePrompt(goal, recentStats, remainingWeekBoundaries){
    const context = "The runner has fallen behind their original training plan. Replan only the remaining weeks below to be realistic given where they actually are right now, while still working toward the same goal.";

    return `${context}\n\n${describeGoal(goal)}\n\n${describeRecentFitness(recentStats)}\n\n${describeWeekList(remainingWeekBoundaries)}`;
}
module.exports = { PLAN_SYSTEM_PROMPT, buildPlanPrompt, buildRegeneratePrompt};
