// redirects users to Strava, handles callback (exchanging code for tokens), saving/updating user

// set up express router with dependencies
const express = require("express");
const axios = require("axios");
const pool = require("../db/pool");
const syncActivities = require("./utils/syncActivities");

const router = express.Router(); // router to define routes in this file

// REDIRECT USER TO STRAVA -> what the connect button links to
router.get("/strava", (req, res) => {
    
    // builds IRL to send to strava's oAuth
    const params = new URLSearchParams({
      client_id: process.env.STRAVA_CLIENT_ID, //identifies app to Strava
      redirect_uri: process.env.STRAVA_REDIRECT_URI,//where Strava send user after they approve/deny
      response_type: "code", // tells Strava we want auth code
      approval_prompt: "force", //don't force consent screen if user approved before
      scope: "read,activity:read_all",
    });

    const stravaAuthURL = `https://www.strava.com/oauth/authorize?${params.toString()}`;

    // goes to strava servers for authentication
    res.redirect(stravaAuthURL);
});

// STRAVA REDIRECTS BACK here with a code -> exchange code for access/refresh tokens
router.get("/strava/callback", async (req, res) => { // async since await HTTP/database calls inside
    const { code, error } = req.query; // gets query params from callback URL, Strava appends either ?code=success or error
    
    // if user denies permission for Strava to send data to app
    if (error) {
        return res.redirect(`${process.env.FRONTEND_URL}/?error=access_denied`);
    }

    try {
        // Exchange temp code for tokens
        const tokenResponse = await axios.post( //makes a POST request to Strava's token endpoint
            "https://www.strava.com/oauth/token",
            {
                client_id: process.env.STRAVA_CLIENT_ID,
                client_secret:process.env.STRAVA_CLIENT_SECRET,
                code, // trades temp code for real access/refresh tokens
                grant_type: "authorization_code"
            }
        );

        const{
            access_token,
            refresh_token,
            expires_at, // unix timestamp (seconds) when access_token expires
            athlete, // Strava sends back basic athlete info here too
        } = tokenResponse.data;

        // SAVE/UPDATE USER INTO DATABASE -> each athlete gets a row, reconnecting just updates the same row's tokens
        const result = await pool.query(
            `INSERT INTO users (
                strava_athlete_id, access_token, refresh_token, token_expires_at, firstname, lastname, profile_picture
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (strava_athlete_id)
            DO UPDATE SET
                access_token = EXCLUDED.access_token,
                refresh_token = EXCLUDED.refresh_token,
                token_expires_at = EXCLUDED.token_expires_at
            RETURNING id`,
            [
                athlete.id,
                access_token,
                refresh_token,
                expires_at,
                athlete.firstname,
                athlete.lastname,
                athlete.profile,
            ]
        );
        
        const userId = result.rows[0].id;
        await syncActivities(userId, access_token); // gets full history into activities table
        

        // REDIRECT BACK TO FRONTEND DASHBOARD, passing our internal userId
        // TODO: assing user_id as a raw query param is insecure —
        // anyone can change the URL (e.g. ?user_id=2) and view another user's
        // dashboard/data. Replace this with a proper session (e.g. express-session
        // + cookie) or a signed JWT before this app handles real user data.

        res.redirect(`${process.env.FRONTEND_URL}/dashboard?user_id=${userId}`);
    } catch(err){
        console.error("Strava OAuth error:", err.response?.data || err.message);
        res.redirect(`${process.env.FRONTEND_URL}/?error=auth_failed`);
    }
});

module.exports = router;