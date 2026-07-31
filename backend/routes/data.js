// looks up a user's basic info (firstname/lastname) by internal user id

const express = require("express");
const pool = require("../db/pool");
const axios = require("axios");
const getWeeklyMiles = require("./utils/weeklyStats");

const router = express.Router(); 

// GET userInfo/:id -> returns firstname, lastname for user
router.get("/:id", async (req, res) => {
    const { id } = req.params;

    try{

        // result.rows[0] = first name, last name, access token
        const result = await pool.query(
            "SELECT firstname, lastname, access_token FROM users WHERE id = $1", [id]
        );

        // if query is empty
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        const accessToken = result.rows[0].access_token;

        const activitiesRes = await axios.get(
          "https://www.strava.com/api/v3/athlete/activities",
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );

        // get weekly mileage
        const activities = activitiesRes.data
        const weeklyMiles = getWeeklyMiles(activities);

        res.json({
            firstname: result.rows[0].firstname,
            lastname: result.rows[0].lastname,
            activities: activities,
            weeklyMiles: weeklyMiles
        });
    } catch (err) {
        console.error("Error fetching user info:", err.message);
        res.status(500).json({ error: "Failed to fetch user info" });
    
    }
});

module.exports = router;