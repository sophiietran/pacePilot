const express = require("express");
const pool = require("../db/pool");

const router = express.Router();

router.get("/:id", async (req, res) => {

    const { id } = req.params;
    const { month } = req.query; // YYYY-MM
    const [ year, mon ] = month.split("-").map(Number); // mon = Jan, 8 = Aug

    const monthStart = `${month}-01`; // "2026-08-01" 
    const nextMonthStart = new Date(year, mon, 1) // JS Date months are 0-indexed
    .toISOString()
    .slice(0, 10);

    try{
        // gets every week an activity was made at least once in the given month and converts to date string
        const result = await pool.query(
          `SELECT DISTINCT start_date_local::date AS day
            FROM activities
            WHERE user_id=$1
                AND start_date_local >= $2::date
                AND start_date_local < $3::date`, [id, monthStart, nextMonthStart],
        );
        const activeDates = result.rows.map((row) => row.day.toISOString().slice(0, 10));

        // gets list of active weeks - limited to two year of activities
        const activeWeeks = await pool.query(
          `SELECT DISTINCT date_trunc('week', start_date_local)::date AS week
            FROM activities
            WHERE user_id=$1
                AND start_date_local >= (NOW() - interval '2 year')::date 
                ORDER BY week DESC
            `, [id],
        );

        // convert to set to check if it contains a date
        const streakWeeks = new Set(activeWeeks.rows.map((row) => row.week.toISOString().slice(0, 10)));

        // get this week's monday
        function getMonday(date){
            const d = new Date(date);
            const diffToMonday = (d.getDay() + 6) % 7;
            d.setDate(d.getDate() - diffToMonday);

            return d;
        }

        // the walk back loop - starts at this week's monday
        let cursor = getMonday(new Date());

        // the week in progress shouldn't break the streak if no runs yet
        if(!streakWeeks.has(cursor.toISOString().slice(0, 10))){
            cursor.setDate(cursor.getDate() - 7);
        }

        // checks if the past week is in the set of weeks that has an activity down
        let count = 0;
        while (streakWeeks.has(cursor.toISOString().slice(0, 10))){
            count++; // if it does, increase the count and check previous week
            cursor.setDate(cursor.getDate() - 7);
        }


          res.json({ activeDates, count });

    }catch (err) {
            console.error("Error fetching streak info:", err.message);
            res.status(500).json({ error: "Failed to fetch streak info" });

    }

})

module.exports = router;