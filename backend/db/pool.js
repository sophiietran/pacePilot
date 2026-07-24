// Centrailized PostreSQL connection pool 
// resuse this pool across app instead of creating new connections elsewhere

const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

module.exports = pool;