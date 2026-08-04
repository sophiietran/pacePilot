const axios = require("axios");
const pool = require("../../db/pool");
// given a user's DB id and their Strava access token, fetch all their runs from Strava and save them into your activities table. - doing this separately reduces limit usage

async function syncActivities(userId, accessToken){

 let page = 1;
 let allRuns = [];

 while (true) {
    // get user's activities
   const res = await axios.get(
     "https://www.strava.com/api/v3/athlete/activities",
     { headers: { Authorization: `Bearer ${accessToken}` }, params: { per_page: 200, page } }
   );
   if (res.data.length === 0) break;          // no more pages, stop

   // get only running activities
   allRuns.push(...res.data.filter(a => a.type === "Run"));
   page++;
 }

 // save to database
 for (const run of allRuns) {
   await pool.query(
     `INSERT INTO activities (user_id, strava_activity_id, start_date_local, distance)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (strava_activity_id) DO NOTHING`,
     [userId, run.id, run.start_date_local, run.distance],
   );
 }
  
}

module.exports = syncActivities;