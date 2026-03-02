const express = require("express");
const authenticate = require("../middleware/authenticate");
const User = require("../models/User");
const { fetchWeatherByCity } = require("../services/weatherService");

const router = express.Router();

router.get("/favorites", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ favorites: user.favorites });
  } catch (error) {
    console.error("❌ Favorites error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/favorites", authenticate, async (req, res) => {
  try {
    const { city, country } = req.body;

    if (!city || typeof city !== "string" || !city.trim()) {
      return res.status(400).json({ error: "City name is required" });
    }

    if (!country || typeof country !== "string" || !country.trim()) {
      return res.status(400).json({ error: "Country is required" });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // בדיקה אם העיר כבר קיימת במועדפים
    const exists = user.favorites.some(
      fav => fav.city.toLowerCase() === city.toLowerCase()
    );

    if (exists) {
      return res.status(409).json({ error: "City already in favorites" });
    }

    user.favorites.push({ city, country });
    await user.save();

    res.status(201).json({ message: "Added to favorites", favorites: user.favorites });
  } catch (error) {
    console.error("❌ Add favorite error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/favorites/:city", authenticate, async (req, res) => {
  try {
    const cityParam = req.params.city;

    if (!cityParam) {
      return res.status(400).json({ error: "City name is required" });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.favorites = user.favorites.filter(
      fav => fav.city.toLowerCase() !== cityParam.toLowerCase()
    );
    await user.save();

    res.json({ message: "Removed from favorites", favorites: user.favorites });
  } catch (error) {
    console.error("❌ Remove favorite error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
