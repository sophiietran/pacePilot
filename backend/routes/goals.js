const express = require("express");
const pool = require("../db/pool");

const router = express.Router();

const Anthropic = require("@anthropic-ai/sdk");
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const {
  PLAN_SYSTEM_PROMPT,
  buildPlanPrompt,
  buildRegeneratePrompt,
} = require("./utils/buildPlanPrompt");
const getWeeklyStats = require("./utils/getWeeklyStats");

// post the goal from the frontend into the DB
router.post("/:id", async (req, res) => {
    const { id } = req.params;

    try{

        const { eventDistance, customDistanceMiles, eventDate, targetTimeSeconds} = req.body

        // check if user already has goal
        const existing = await pool.query(
          `SELECT id FROM goals WHERE user_id = $1 AND status = 'active'`,
          [id],
        );

        if (existing.rows.length > 0) {
          return res
            .status(409)
            .json({ error: "An active goal already exists" });
        }
    
        const result = await pool.query(
          `INSERT INTO goals (user_id, event_distance, custom_distance_miles, event_date, target_time_seconds) 
            VALUES ($1, $2, $3, $4, $5)
            RETURNING * `,
          [
            id,
            eventDistance,
            customDistanceMiles,
            eventDate,
            targetTimeSeconds,
          ],
        );

        return res.json(result.rows[0])

    }
    catch(err){
        console.error("Error adding goal", err.message);
        res.status(500).json({ error: "Failed to add goal" });
    }

});

// see if goal exists, get goal data
router.get("/:id", async (req, res) => {
    const { id } = req.params;

    try {
        // look up active goal
        const activeGoal = await pool.query(
        `   SELECT *
            FROM goals
            WHERE user_id = $1 AND status = 'active'
            `, [id]
        )

        if (activeGoal.rows.length === 0)
            return res.json({ goal: null })

        const goal = activeGoal.rows[0];

        // goal is present but no plan has been made
        const plan = await pool.query(
        `   SELECT *, week_end < CURRENT_DATE AS is_completed
            FROM plan_weeks
            WHERE goal_id = $1
            ORDER BY week_start`,
            [goal.id]
        )

        if (plan.rows.length === 0)
            return res.json({ goal, weeks: [] });

        const weeks = plan.rows;

        // find the most recently completed week (weeks are ordered oldest to
        // newest, so the last one with is_completed is the most recent one)
        const mostRecentCompletedWeek = weeks.filter((week) => week.is_completed).at(-1);

        let isBehindPace = false;
        let behindWeek = null;

        if (mostRecentCompletedWeek) {
            const actualStats = await getWeeklyStats(
                id,
                mostRecentCompletedWeek.week_start,
                mostRecentCompletedWeek.week_end,
            );

            // getWeeklyStats returns null when no runs were logged that week
            const actualMiles = actualStats ? actualStats.totalMiles : 0;
            const actualRunCount = actualStats ? actualStats.runCount : 0;

            isBehindPace =
                actualMiles < mostRecentCompletedWeek.planned_distance_miles * 0.7 ||
                actualRunCount < goal.runs_per_week;

            behindWeek = { ...mostRecentCompletedWeek, actualMiles, actualRunCount };
        }

        return res.json({ goal, weeks, isBehindPace, behindWeek })
    }
    catch (err) {
        console.error("Error fetching goal:", err.message);
        res.status(500).json({ error: "Failed to fetch goal" });
    }
})

router.post("/:id/generate", async (req, res) =>{

})
