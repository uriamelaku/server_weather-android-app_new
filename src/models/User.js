const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: false },
  passwordHash: { type: String, required: true },
  emailOtpHash: { type: String, required: false },
  emailOtpExpiresAt: { type: Date, required: false },
  emailOtpAttempts: { type: Number, default: 0 },
  history: {
    type: [
      {
        city: { type: String, required: true },
        country: { type: String, required: true },
        temp: { type: Number, required: true },
        feelsLike: { type: Number, required: true },
        humidity: { type: Number, required: true },
        windSpeed: { type: Number, required: true },
        description: { type: String, required: true },
        icon: { type: String, required: true },
        timestamp: { type: Number, required: true },
        searchedAt: { type: Date, default: Date.now }
      }
    ],
    default: []
  },
  favorites: {
    type: [
      {
        city: { type: String, required: true },
        country: { type: String, required: true },
        addedAt: { type: Date, default: Date.now }
      }
    ],
    default: []
  }
});

module.exports = mongoose.model("User", userSchema);
