const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("Connection failed:", err);
  } else {
    console.log("Connected! Server time:", res.rows[0]);
  }
  pool.end();
});
