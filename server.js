require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const authRoutes = require("./src/routes/authRoutes");
const weatherRoutes = require("./src/routes/weatherRoutes");
const historyRoutes = require("./src/routes/historyRoutes");
const favoritesRoutes = require("./src/routes/favoritesRoutes");
const healthRoutes = require("./src/routes/healthRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[REQ] ${req.method} ${req.path}`);
  next();
});

if (!process.env.MONGO_URI) {
  console.error("MONGO_URI is missing in environment variables");
  process.exit(1);
}

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB error:", err));

app.get("/ping", (req, res) => {
  res.status(200).json({ status: "ok", message: "pong" });
});

app.use(authRoutes);
app.use("/api", weatherRoutes);
app.use("/api", historyRoutes);
app.use("/api", favoritesRoutes);
app.use(healthRoutes);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
