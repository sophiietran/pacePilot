require("dotenv").config();

const express = require("express");
const cors = require("cors");
const authRouter = require("./routes/auth");
const dataRouter = require("./routes/data")
const mileageHistoryRouter = require("./routes/mileageHistory");

const app = express();

app.use(cors());
app.use(express.json());

// All auth-related routes (Strava OAuth) live under /auth
app.use("/auth", authRouter);

// User info
app.use("/data", dataRouter);

// mileageHistory
app.use("/mileageHistory", mileageHistoryRouter);


const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`PacePilot backend running on http://localhost:${PORT}`);
});
