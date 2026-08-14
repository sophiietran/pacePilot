// personal best categories built by toleraance of single run rather than segments

const express = require("express");
const pool = require("../db/pool");

const router = express.Router();

// meters
const CATEGORIES = {
    mile: { min: 1550, max: 1650},
    fiveK: { min: 4900, max: 5100},
    tenK: { min: 9800, max: 10200},
    half: { min: 20900, max: 21300},
    full: { min: 41900, max: 42500},
}

// checking if rows is null per category
function formatBest(rows){

    if (rows.length === 0)
        return null;

    // parameter rows gives you moving time and distance
    const { moving_time, distance } = rows[0];

    const totalSeconds = Number(moving_time);
    const hours = Math.floor(totalSeconds / (3600));
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    // format moving_time to mm:ss or h:mm:ss
    const time =
      hours > 0
        ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
        : `${minutes}:${String(seconds).padStart(2, "0")}`;

    // format pace to moving_time / (distance/ 1609.35 miles) -> min:sec/mi
    const miles = Number(distance) / 1609.34;
    const paceSecondsPerMile = totalSeconds / miles;
    const paceMinutes = Math.floor(paceSecondsPerMile / 60);
    const paceSeconds = Math.round(paceSecondsPerMile % 60);

    const pace = `${paceMinutes}:${String(paceSeconds).padStart(2, "0")}/mi`;


    return {time, pace};
}

// mile
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  
  try {
    
    const mileResult = await pool.query(
      `SELECT moving_time, distance
          FROM activities
          WHERE user_id=$1
              AND distance between $2 AND $3
          ORDER BY moving_time ASC LIMIT 1`,
      [id, CATEGORIES.mile.min, CATEGORIES.mile.max],
    );
    const mile = formatBest(mileResult.rows)

    

    const fiveKResult = await pool.query(
      `SELECT moving_time, distance
            FROM activities
            WHERE user_id=$1
                AND distance between $2 AND $3
            ORDER BY moving_time ASC LIMIT 1`,
      [id, CATEGORIES.fiveK.min, CATEGORIES.fiveK.max],
    );
    const fiveK = formatBest(fiveKResult.rows)



    const tenKResult = await pool.query(
      `SELECT moving_time, distance
            FROM activities
            WHERE user_id=$1
                AND distance between $2 AND $3
            ORDER BY moving_time ASC LIMIT 1`,
      [id, CATEGORIES.tenK.min, CATEGORIES.tenK.max],
    );
    const tenK = formatBest(tenKResult.rows);

    const halfResult = await pool.query(
      `SELECT moving_time, distance
            FROM activities
            WHERE user_id=$1
                AND distance between $2 AND $3
            ORDER BY moving_time ASC LIMIT 1`,
      [id, CATEGORIES.half.min, CATEGORIES.half.max],
    );
    const half = formatBest(halfResult.rows);

    const fullResult = await pool.query(
      `SELECT moving_time, distance
            FROM activities
            WHERE user_id=$1
                AND distance between $2 AND $3
            ORDER BY moving_time ASC LIMIT 1`,
      [id, CATEGORIES.full.min, CATEGORIES.full.max],
    );
    const full = formatBest(fullResult.rows);
     

    res.json({mile, fiveK, tenK, half, full});

  } catch (err) {
    console.error("Error fetching personal bests info:", err.message);
    res.status(500).json({ error: "Failed to fetch personal bests info" });
  }
});

module.exports = router;
