const express = require("express");
const authenticate = require("../middleware/authenticate");
const User = require("../models/User");
const { fetchWeatherByCity } = require("../services/weatherService");

const router = express.Router();

router.get("/weather", authenticate, async (req, res) => {
  try {
    const { city } = req.query;

    if (!city) {
      return res.status(400).json({ error: "City name is required" });
    }

    const weatherData = await fetchWeatherByCity(city);

    // שמירת החיפוש בהיסטוריה של המשתמש
    const user = await User.findById(req.user.userId);
    if (user) {
      const historyEntry = {
        city: weatherData.city,
        country: weatherData.country,
        temp: weatherData.temp,
        feelsLike: weatherData.feelsLike,
        humidity: weatherData.humidity,
        windSpeed: weatherData.windSpeed,
        description: weatherData.description,
        icon: weatherData.icon,
        timestamp: Date.now()
      };

      user.history.push(historyEntry);
      await user.save();
    }

    res.json(weatherData);
  } catch (error) {
    if (error.status === 404) {
      return res.status(404).json({ error: "City not found" });
    }

    console.error("❌ Weather API error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
