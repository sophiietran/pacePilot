// looks up a user's basic info (firstname/lastname) by internal user id

const express = require("express");
const pool = require("../db/pool");

const router = express.Router(); 

// GET userInfo/:id -> returns firstname, lastname for user
router.get("/:id", async (req, res) => {
    const { id } = req.params;

    try{

        const result = await pool.query(
            "SELECT firstname, lastname FROM users WHERE id = $1", [id]
        );

        // if query is empty
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error("Error fetching user info:", err.message);
        res.status(500).json({ error: "Failed to fetch user info" });
    
    }
});

module.exports = router;