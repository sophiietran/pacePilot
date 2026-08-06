// returns mileage grouped by day/week for a given range

const express = require("express");
const pool = require("../db/pool");

const router = express.Router();

// GET /milelageHistory/:id?range=7d|1m|3m|6m|1y|YTD
router.get("/:id", async (req, res) => {
    const { id } = req.params;
    const { range } = req.query;

    // range -> {interval to look back, granularity to group by}
    const intervals = {
        "7d": { interval: "7 days", trunc: "day"},
        "1m": { interval: "1 month", trunc: "day"},
        "3m":{ interval: "3 months", trunc: "week"},
        "6m": { interval: "6 months", trunc: "week"},
        "ytd": { interval: null, trunc: "month"}, // null = since Jan 1 of this year
    };

    const config = intervals[range] || intervals["1m"]

    try{
        const whereClause = config.interval ?
        "AND start_date_local >= NOW() - $2::interval" :
        "AND start_date_local >= date_trunc('year', NOW())";
        
        const params = config.interval ? [id, config.interval]: [id];

        const result = await pool.query(
            `SELECT
                date_trunc('${config.trunc}', start_date_local)::date AS period,
                SUM(distance) AS distance
            FROM activities
            WHERE user_id = $1
            ${whereClause}
            GROUP BY period
            ORDER BY period ASC`,
            params,
        );

        res.json(result.rows);
    } catch(err){
        console.error("Error fetching mileage history:", err.message);
        res.status(500).json({ error: "Failed to fetch mileage history" });
    }
});

module.exports = router;