require("dotenv").config();

const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const dataRoutes = require("./routes/data")

const app = express();

app.use(cors());
app.use(express.json());

// All auth-related routes (Strava OAuth) live under /auth
app.use("/auth", authRoutes);

// User info
app.use("/data", dataRoutes);



const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`PacePilot backend running on http://localhost:${PORT}`);
});
