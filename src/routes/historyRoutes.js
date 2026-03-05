const express = require("express");
const authenticate = require("../middleware/authenticate");
const User = require("../models/User");

const router = express.Router();

router.get("/history", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ history: user.history });
  } catch (error) {
    console.error("❌ History error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/history", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.history = [];
    await user.save();

    res.json({ message: "History cleared" });
  } catch (error) {
    console.error("❌ Clear history error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/history/:timestamp", authenticate, async (req, res) => {
  try {
    const timestampParam = Number.parseInt(req.params.timestamp, 10);

    if (Number.isNaN(timestampParam)) {
      return res.status(400).json({ error: "Invalid timestamp" });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const initialLength = user.history.length;
    user.history = user.history.filter(item => item.timestamp !== timestampParam);

    if (user.history.length === initialLength) {
      return res.status(404).json({ error: "History item not found" });
    }

    await user.save();

    res.json({ history: user.history });
  } catch (error) {
    console.error("❌ Remove history item error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
