const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { sendOtpEmail } = require("../services/emailService");
const { generateOtp, hashOtp, verifyOtp, isOtpExpired } = require("../utils/otp");

const router = express.Router();

/**
 * Create JWT token
 */
function createToken(user) {
  return jwt.sign(
    { userId: user._id.toString(), username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

/**
 * Create OTP token (short-lived, used only for OTP verification process)
 */
function createOtpToken(user) {
  return jwt.sign(
    { userId: user._id.toString(), username: user.username, type: "otp" },
    process.env.JWT_OTP_SECRET,
    { expiresIn: "10m" }
  );
}

/**
 * Verify OTP token
 */
function verifyOtpToken(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_OTP_SECRET);
    if (decoded.type !== "otp") {
      return null;
    }
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Extract OTP token from either Authorization header or request body.
 * Supports: Authorization: Bearer <otpToken> and/or body.otpToken
 */
function extractOtpToken(req) {
  const authHeader = req.headers.authorization || "";
  const bearerToken = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : null;

  return bearerToken || req.body.otpToken || null;
}

/**
 * POST /api/auth/register
 * Register new user
 */
router.post("/api/auth/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Missing username or password" });
    }

    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(409).json({ error: "User already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await User.create({ username, email: email || null, passwordHash });

    res.json({ message: "User registered successfully" });
  } catch (error) {
    console.error("❌ Register error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/auth/login
 * Step 1: Verify credentials and return OTP token
 * Note: App sends only username and password (NO email field)
 */
router.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Missing username or password" });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Reset OTP attempts on successful login
    user.emailOtpAttempts = 0;
    await user.save();

    // Create short-lived OTP token
    const otpToken = createOtpToken(user);

    // Return OTP token with user's email from database
    res.json({
      loginOk: true,
      username: user.username,
      email: user.email,
      otpToken: otpToken
    });
  } catch (error) {
    console.error("❌ Login error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/auth/send-otp
 * Step 3: Send OTP code to user's email
 */
router.post("/api/auth/send-otp", async (req, res) => {
  try {
    const otpToken = extractOtpToken(req);
    const requestedEmail = (req.body.email || "").trim().toLowerCase();

    if (!otpToken) {
      return res.status(400).json({ error: "Missing otpToken (body or Authorization Bearer token)" });
    }

    // Verify OTP token
    const decoded = verifyOtpToken(otpToken);
    if (!decoded) {
      return res.status(401).json({ error: "Invalid or expired otpToken" });
    }

    // Find user
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!user.email) {
      return res.status(400).json({ error: "User email not registered" });
    }

    // If app sends email explicitly, enforce it matches the authenticated user's email.
    const normalizedUserEmail = String(user.email).trim().toLowerCase();
    if (requestedEmail && requestedEmail !== normalizedUserEmail) {
      return res.status(400).json({ error: "Email does not match authenticated user" });
    }

    const recipientEmail = requestedEmail || user.email;

    // Generate OTP code
    const otpCode = generateOtp();
    const otpHash = await hashOtp(otpCode);
    const expiresAt = new Date(Date.now() + parseInt(process.env.OTP_EXPIRES_MINUTES || 5) * 60 * 1000);

    // Save OTP hash to user
    user.emailOtpHash = otpHash;
    user.emailOtpExpiresAt = expiresAt;
    user.emailOtpAttempts = 0;
    await user.save();

    // Send email first, then return success only if delivery request succeeded.
    await sendOtpEmail(recipientEmail, otpCode);

    res.json({
      otpSent: true,
      email: recipientEmail
    });
  } catch (error) {
    if (error && (error.responseCode === 535 || error.code === "EAUTH")) {
      console.error("❌ Send OTP error: SMTP authentication failed");
      return res.status(502).json({ error: "Email service authentication failed" });
    }

    if (error && error.message && error.message.includes("Failed to fetch Brevo senders")) {
      return res.status(502).json({ error: "Unable to validate sender configuration" });
    }

    console.error("❌ Send OTP error:", error.message);
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

/**
 * POST /api/auth/verify-otp
 * Step 4: Verify OTP code and return JWT token
 */
router.post("/api/auth/verify-otp", async (req, res) => {
  try {
    const otpToken = extractOtpToken(req);
    const { code } = req.body;

    if (!otpToken || !code) {
      return res.status(400).json({ error: "Missing otpToken (body or Authorization Bearer token) or code" });
    }

    // Verify OTP token
    const decoded = verifyOtpToken(otpToken);
    if (!decoded) {
      return res.status(401).json({ error: "Invalid or expired otpToken" });
    }

    // Find user
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if OTP hash exists
    if (!user.emailOtpHash) {
      return res.status(400).json({ error: "No OTP requested" });
    }

    // Check if OTP expired
    if (isOtpExpired(user.emailOtpExpiresAt)) {
      user.emailOtpHash = null;
      user.emailOtpExpiresAt = null;
      user.emailOtpAttempts = 0;
      await user.save();
      return res.status(401).json({ error: "OTP expired" });
    }

    // Check attempts
    const maxAttempts = parseInt(process.env.OTP_MAX_ATTEMPTS || 3);
    if (user.emailOtpAttempts >= maxAttempts) {
      user.emailOtpHash = null;
      user.emailOtpExpiresAt = null;
      user.emailOtpAttempts = 0;
      await user.save();
      return res.status(429).json({ error: "Too many attempts. OTP reset." });
    }

    // Verify OTP code
    const isValid = await verifyOtp(code, user.emailOtpHash);
    
    if (!isValid) {
      user.emailOtpAttempts += 1;
      await user.save();
      return res.status(401).json({ 
        error: "Invalid OTP",
        attemptsLeft: maxAttempts - user.emailOtpAttempts
      });
    }

    // OTP verified successfully
    user.emailOtpHash = null;
    user.emailOtpExpiresAt = null;
    user.emailOtpAttempts = 0;
    await user.save();

    // Create and return JWT token
    const token = createToken(user);
    res.json({
      token: token,
      username: user.username
    });
  } catch (error) {
    console.error("❌ Verify OTP error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/auth/dev-login
 * Step 5: Dev mode bypass (if ALLOW_DEV_LOGIN=true)
 */
router.post("/api/auth/dev-login", async (req, res) => {
  try {
    // Check if dev mode is allowed
    if (process.env.ALLOW_DEV_LOGIN !== "true") {
      return res.status(403).json({ error: "Dev login is disabled" });
    }

    const otpToken = extractOtpToken(req);

    if (!otpToken) {
      return res.status(400).json({ error: "Missing otpToken (body or Authorization Bearer token)" });
    }

    // Verify OTP token
    const decoded = verifyOtpToken(otpToken);
    if (!decoded) {
      return res.status(401).json({ error: "Invalid or expired otpToken" });
    }

    // Find user
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Create and return JWT token
    const token = createToken(user);
    res.json({
      token: token,
      username: user.username,
      devMode: true
    });
  } catch (error) {
    console.error("❌ Dev login error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
