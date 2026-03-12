const nodemailer = require("nodemailer");
const https = require("https");

const smtpUser = process.env.BREVO_SMTP_USER || "apikey";
const smtpPass = process.env.BREVO_SMTP_PASS || process.env.BREVO_API_KEY;
const usingExplicitSmtpCreds = Boolean(process.env.BREVO_SMTP_USER && process.env.BREVO_SMTP_PASS);

if (!smtpPass) {
  console.warn("[EMAIL] Missing SMTP password. Set BREVO_SMTP_PASS or BREVO_API_KEY in .env");
}

if (!usingExplicitSmtpCreds) {
  console.warn(
    "[EMAIL] Using fallback SMTP credentials. Prefer BREVO_SMTP_USER + BREVO_SMTP_PASS from Brevo SMTP relay settings."
  );
}

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  auth: {
    user: smtpUser,
    pass: smtpPass
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
  tls: {
    minVersion: "TLSv1.2"
  }
});

let transporterVerified = false;
let cachedFromEmail = null;

function isSmtpNetworkError(error) {
  const networkCodes = [
    "ETIMEDOUT",
    "ESOCKET",
    "ECONNECTION",
    "ECONNREFUSED",
    "EHOSTUNREACH",
    "ENETUNREACH"
  ];
  return Boolean(error && (networkCodes.includes(error.code) || error.responseCode === 421));
}

function brevoApiRequest(path, method, data) {
  return new Promise((resolve, reject) => {
    if (!process.env.BREVO_API_KEY) {
      return reject(new Error("BREVO_API_KEY is missing"));
    }

    const payload = data ? JSON.stringify(data) : null;
    const req = https.request(
      {
        hostname: "api.brevo.com",
        path,
        method,
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json",
          ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {})
        }
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          const ok = res.statusCode >= 200 && res.statusCode < 300;
          if (!ok) {
            return reject(
              new Error(`Brevo API request failed: HTTP ${res.statusCode}${body ? ` - ${body}` : ""}`)
            );
          }

          if (!body) {
            return resolve({});
          }

          try {
            resolve(JSON.parse(body));
          } catch (err) {
            reject(new Error("Failed to parse Brevo API response"));
          }
        });
      }
    );

    req.setTimeout(10000, () => {
      req.destroy(new Error("Brevo API request timeout"));
    });

    req.on("error", (err) => reject(err));
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

function fetchVerifiedBrevoSenders() {
  return brevoApiRequest("/v3/senders", "GET")
    .then((parsed) => {
      const senders = Array.isArray(parsed.senders) ? parsed.senders : [];
      return senders
        .filter((s) => s && s.active && s.email)
        .map((s) => String(s.email).trim().toLowerCase());
    })
    .catch((err) => {
      if (!process.env.BREVO_API_KEY) {
        return [];
      }
      throw err;
    });
}

function buildOtpHtml(code) {
  return `
        <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
          <h2>Login Verification Code</h2>
          <p>Your one-time password is:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0; color: #2c3e50;">
            ${code}
          </div>
          <p style="color: #7f8c8d; font-size: 14px;">
            This code expires in ${process.env.OTP_EXPIRES_MINUTES || 5} minutes.
          </p>
          <p style="color: #e74c3c;">
            Do not share this code with anyone.
          </p>
        </div>
      `;
}

async function sendViaBrevoApi(email, code, fromEmail) {
  const payload = {
    sender: { email: fromEmail },
    to: [{ email }],
    subject: "Your Login Code",
    htmlContent: buildOtpHtml(code)
  };

  const result = await brevoApiRequest("/v3/smtp/email", "POST", payload);
  return { success: true, messageId: result.messageId || result.message || null };
}

async function resolveFromEmail() {
  if (cachedFromEmail) {
    return cachedFromEmail;
  }

  const configuredFrom = String(process.env.EMAIL_FROM || "noreply@weather-app.com")
    .trim()
    .toLowerCase();

  const verifiedSenders = await fetchVerifiedBrevoSenders();
  if (!verifiedSenders.length) {
    cachedFromEmail = configuredFrom;
    return cachedFromEmail;
  }

  if (verifiedSenders.includes(configuredFrom)) {
    cachedFromEmail = configuredFrom;
    return cachedFromEmail;
  }

  // Fallback to first verified sender so OTP can be delivered.
  cachedFromEmail = verifiedSenders[0];
  console.warn(
    `[EMAIL] EMAIL_FROM=${configuredFrom} is not verified in Brevo. Falling back to verified sender ${cachedFromEmail}.`
  );
  return cachedFromEmail;
}

async function verifyTransporterOnce() {
  if (transporterVerified) {
    return;
  }

  await transporter.verify();
  transporterVerified = true;
}

/**
 * Send OTP code via email
 * @param {string} email - Recipient email address
 * @param {string} code - OTP code (6 digits)
 * @returns {Promise}
 */
async function sendOtpEmail(email, code) {
  try {
    const fromEmail = await resolveFromEmail();
    console.log("[EMAIL] Preparing OTP email");
    console.log("[EMAIL] from:", fromEmail);
    console.log("[EMAIL] to:", email);
    console.log("[EMAIL] Note: EMAIL_FROM must be a verified sender/domain in Brevo SMTP settings.");

    const mailOptions = {
      from: fromEmail,
      to: email,
      subject: "Your Login Code",
      html: buildOtpHtml(code)
    };

    try {
      await verifyTransporterOnce();
      const result = await transporter.sendMail(mailOptions);
      console.log("✅ OTP email sent successfully via SMTP:", result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (smtpError) {
      if (isSmtpNetworkError(smtpError) && process.env.BREVO_API_KEY) {
        console.warn(
          `[EMAIL] SMTP unavailable (${smtpError.code || smtpError.message}). Falling back to Brevo HTTP API.`
        );
        const apiResult = await sendViaBrevoApi(email, code, fromEmail);
        console.log("✅ OTP email sent successfully via Brevo API:", apiResult.messageId || "OK");
        return apiResult;
      }
      throw smtpError;
    }
  } catch (error) {
    if (error && (error.responseCode === 535 || error.code === "EAUTH")) {
      console.error(
        "❌ SMTP auth failed (535). BREVO_API_KEY may still be valid for API, but SMTP requires relay credentials. Set BREVO_SMTP_USER and BREVO_SMTP_PASS from Brevo SMTP relay settings."
      );
    }
    if (error && (error.responseCode === 550 || error.responseCode === 553)) {
      console.error("❌ Sender rejected by SMTP. Verify EMAIL_FROM as a sender/domain in Brevo.");
    }
    console.error("❌ Error sending OTP email:", error.message);
    throw error;
  }
}

module.exports = {
  sendOtpEmail
};
