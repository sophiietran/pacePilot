// helper to gather all the stats for AI - returns combined stats for date range
const pool = require("../../db/pool");

async function getWeeklyStats(userId, weekStart, weekEnd){

    // get distance, moving time, start date local
    const stats = await pool.query(
        `SELECT distance, moving_time, start_date_local
        FROM activities
        WHERE user_id = $1 
        AND start_date_local BETWEEN $2 AND $3` ,
        [userId, weekStart, weekEnd]
    )

    if (stats.rows.length == 0)
        return null

    const runCount = stats.rows.length
    // goes through each row, and adds row distance to running sum
    const totalMeters = stats.rows.reduce((sum, row) => sum + Number(row.distance), 0);
    const totalMiles = totalMeters / 1609.34

    // stored as seconds
    const totalMovingTime = stats.rows.reduce((sum, row) => sum + Number(row.moving_time), 0); 
    const avgPace = totalMovingTime / totalMiles; // average seconds per mile

    // et longest run and then return everything as one object
    let longestRunRow = null

    for (let i = 0; i < runCount; i++){
        const row = stats.rows[i]

        if (longestRunRow === null || Number(row.distance) > Number(longestRunRow.distance)){
            longestRunRow = row;
        }
    }

    // convert to miles
    const longestRun = {
        miles: Number(longestRunRow.distance) / 1609.34,
        day: new Date(longestRunRow.start_date_local).toLocaleDateString("en-US", { weekday: "long" }),
    };

    return { runCount, totalMiles, avgPace, longestRun }
}

module.exports = getWeeklyStats;