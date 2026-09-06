// gets data for this week and last week with getWeeklyStats() and buildSummaryPrompt()

const express = require("express");
const pool = require("../db/pool");

const router = express.Router();

const Anthropic = require("@anthropic-ai/sdk");
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const getWeeklyStats = require("./utils/getWeeklyStats")
const { SYSTEM_PROMPT, buildMsgForSummary, buildRestWeekMessage } = require( "./utils/buildSummaryPrompt")

// returns { weekStart, weekEnd } as Date objects for Monday-Sunday of a given week
// weeksAgo: 0 = this week, 1 = last week
function getWeekBoundaries(weeksAgo = 0){
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday
  const diffToMonday = (dayOfWeek + 6) % 7;

  const monday = new Date(today);
  monday.setDate(today.getDate() - diffToMonday - weeksAgo * 7);
  monday.setHours(0, 0, 0, 0); // start of Monday

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999); // end of Sunday

  return { weekStart: monday, weekEnd: sunday}
}

// checks if AI summary exists in the database for this week
router.get("/:id", async (req, res) => {
    const { id } = req.params;
    
    try{
      const { weekStart } = getWeekBoundaries();

      const result = await pool.query(
        `SELECT summary_text
        FROM weekly_summaries
        WHERE user_id = $1
        AND week_start = $2`,
        [id, weekStart]
      );
  
      if (result.rows.length === 0)
        return res.json({summary: null});
      
      return res.json({ summary: result.rows[0].summary_text });
    }
    catch (err) {
      console.error("Error fetching summary_text from DB:", err.message);
      res.status(500).json({ error: "Failed to fetch weekly summary from DB" });
    }
})

router.post("/:id/generate", async (req, res) =>{
  const { id } = req.params;

  try {
    const thisWeekDates = getWeekBoundaries(0);
    const lastWeekDates = getWeekBoundaries(1);

    const thisWeekStats = await getWeeklyStats(
      id,
      thisWeekDates.weekStart,
      thisWeekDates.weekEnd,
    );
    const lastWeekStats = await getWeeklyStats(
      id,
      lastWeekDates.weekStart,
      lastWeekDates.weekEnd,
    );

    const aiMsg = thisWeekStats === null
      ? buildRestWeekMessage(lastWeekStats)
      : buildMsgForSummary(thisWeekStats, lastWeekStats);

    // claude call
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 300,
      system:
        SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: aiMsg,
        },
      ],
    })

    const aiResponse = response.content[0].text

    // upsert into weekly_summaries DB
    await pool.query(
      `INSERT INTO weekly_summaries (user_id, week_start, week_end, summary_text)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id, week_start) DO UPDATE
        SET summary_text = EXCLUDED.summary_text,
            week_end = EXCLUDED.week_end`,
      [id, thisWeekDates.weekStart, thisWeekDates.weekEnd, aiResponse],
    );

    return res.json({summary: aiResponse})
    
  } catch (err) {
    console.error("Error generating weekly summary:", err.message);
    res.status(500).json({ error: "Failed to generate weekly summary" });
  }
});

module.exports = router;