// looks up a user's info and activities
const express = require("express");
const pool = require("../db/pool");
const getWeeklyMiles = require("./utils/weeklyStats");

const router = express.Router(); 

// GET userInfo/:id -> returns firstname, lastname for user
router.get("/:id", async (req, res) => {
    const { id } = req.params;

    try{

        // result.rows[0] = first name, last name
        const result = await pool.query(
            "SELECT firstname, lastname FROM users WHERE id = $1", [id]
        );

        // if query is empty
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        // get the user's past activities
        const activitiesResult = await pool.query(
          "SELECT start_date_local, distance FROM activities WHERE user_id = $1",
          [id],
        );

        // get weekly mileage
        const activities = activitiesResult.rows;
        const weeklyMiles = getWeeklyMiles(activities);

        // sends response back to frontend
        res.json({
            firstname: result.rows[0].firstname,
            lastname: result.rows[0].lastname,
            weeklyMiles: weeklyMiles
        });
    } catch (err) {
        console.error("Error fetching user info:", err.message);
        res.status(500).json({ error: "Failed to fetch user info" });
    
    }
});

module.exports = router;