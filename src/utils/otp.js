const bcrypt = require("bcrypt");

/**
 * Generate a 6-digit OTP code
 * @returns {string} 6-digit OTP code
 */
function generateOtp() {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  return code;
}

/**
 * Hash an OTP code for storage
 * @param {string} code - Plain OTP code
 * @returns {Promise<string>} Hashed OTP code
 */
async function hashOtp(code) {
  try {
    const hash = await bcrypt.hash(code, 10);
    return hash;
  } catch (error) {
    console.error("❌ Error hashing OTP:", error.message);
    throw error;
  }
}

/**
 * Verify an OTP code against its hash
 * @param {string} code - Plain OTP code
 * @param {string} hash - Hashed OTP code
 * @returns {Promise<boolean>} True if code matches hash
 */
async function verifyOtp(code, hash) {
  try {
    const isValid = await bcrypt.compare(code, hash);
    return isValid;
  } catch (error) {
    console.error("❌ Error verifying OTP:", error.message);
    throw error;
  }
}

/**
 * Check if OTP has expired
 * @param {Date} expiresAt - Expiration time
 * @returns {boolean} True if expired
 */
function isOtpExpired(expiresAt) {
  if (!expiresAt) return true;
  return new Date() > expiresAt;
}

module.exports = {
  generateOtp,
  hashOtp,
  verifyOtp,
  isOtpExpired
};
