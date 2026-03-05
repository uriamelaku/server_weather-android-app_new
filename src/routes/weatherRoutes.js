const express = require("express");
const authenticate = require("../middleware/authenticate");
const User = require("../models/User");
const { fetchWeatherByCity, fetchWeatherByCoordinates } = require("../services/weatherService");

const router = express.Router();

router.get("/weather", authenticate, async (req, res) => {
  try {
    const { city, lat, lon } = req.query;

    // בדיקה: או עיר או קואורדינטות (אבל לא שניהם ולא אף אחד)
    if (!city && (!lat || !lon)) {
      return res.status(400).json({ 
        error: "Either 'city' or both 'lat' and 'lon' are required" 
      });
    }

    if (city && (lat || lon)) {
      return res.status(400).json({ 
        error: "Provide either 'city' or 'lat'+'lon', not both" 
      });
    }

    let weatherData;

    // קריאה לפי קואורדינטות
    if (lat && lon) {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lon);

      if (isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).json({ error: "Invalid coordinates format" });
      }

      if (latitude < -90 || latitude > 90) {
        return res.status(400).json({ error: "Latitude must be between -90 and 90" });
      }

      if (longitude < -180 || longitude > 180) {
        return res.status(400).json({ error: "Longitude must be between -180 and 180" });
      }

      weatherData = await fetchWeatherByCoordinates(latitude, longitude);
    } 
    // קריאה לפי עיר
    else {
      weatherData = await fetchWeatherByCity(city);
    }

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
      return res.status(404).json({ error: error.message || "Location not found" });
    }

    console.error("❌ Weather API error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
