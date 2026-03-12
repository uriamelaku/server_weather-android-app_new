# Weather Check Backend

Node.js + Express backend for the Weather Check mobile app.

It provides:
- Two-step authentication (password login + OTP email verification)
- Dev-mode login bypass (configurable)
- Weather lookup
- Search history management
- Favorites management

---

## Features

- JWT authentication for protected APIs
- OTP flow using Brevo SMTP
- MongoDB persistence with Mongoose
- Authenticated weather, history, and favorites endpoints
- Health and ping endpoints for uptime checks

---

## Tech Stack

- Node.js
- Express
- MongoDB + Mongoose
- JWT
- bcrypt
- Nodemailer (Brevo SMTP)

---

## Quick Start

```bash
npm install
npm start
```

Server runs on:
- `http://localhost:3000`

---

## Required Environment Variables

Create `.env` in project root:

```env
PORT=3000
MONGO_URI=your_mongodb_connection_string

JWT_SECRET=your_jwt_secret
JWT_OTP_SECRET=your_short_lived_otp_secret

OPENWEATHER_API_KEY=your_openweather_key

BREVO_API_KEY=your_brevo_api_key
BREVO_SMTP_USER=your_brevo_smtp_user
BREVO_SMTP_PASS=your_brevo_smtp_pass
EMAIL_FROM=your_verified_sender@example.com

OTP_EXPIRES_MINUTES=5
OTP_MAX_ATTEMPTS=3
OTP_RESEND_COOLDOWN_SECONDS=45

ALLOW_DEV_LOGIN=true
```

Important:
- `EMAIL_FROM` must be a verified sender/domain in Brevo.
- OTP emails are sent to the authenticated user's email (`to`), not to `EMAIL_FROM`.

---

## Authentication Flow

1. `POST /api/auth/login`
	 - Request: `username`, `password`
	 - Response: `loginOk`, `username`, `email`, `otpToken`
2. Then choose one path:
	 - OTP path:
		 - `POST /api/auth/send-otp`
		 - `POST /api/auth/verify-otp`
	 - Dev path (if enabled):
		 - `POST /api/auth/dev-login`
3. Final response returns JWT token for protected routes.

Token behavior:
- `otpToken`: short-lived (~10 min), used only in OTP flow.
- `token` (JWT): long-lived (~7 days), used for protected routes.

---

## API Endpoints

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/send-otp`
- `POST /api/auth/verify-otp`
- `POST /api/auth/dev-login`

### Weather (JWT required)

- `GET /api/weather?city=London`
- `GET /api/weather?lat=32.0853&lon=34.7818`

### History (JWT required)

- `GET /api/history`
- `DELETE /api/history`
- `DELETE /api/history/:timestamp`

### Favorites (JWT required)

- `GET /api/favorites`
- `POST /api/favorites`
- `DELETE /api/favorites`
- `DELETE /api/favorites/:city`

### Health

- `GET /health`
- `GET /ping`

---

## Authorization Header

For protected endpoints:

```http
Authorization: Bearer <JWT_TOKEN>
```

For OTP endpoints, server supports otp token in either:
- Body: `otpToken`
- Header: `Authorization: Bearer <otpToken>`

---

## Common Problems

### OTP not received

If server logs show send success but mailbox gets nothing:
- Check Brevo Transactional Logs
- Verify `EMAIL_FROM` sender/domain in Brevo
- Check Spam/Promotions folder

### SMTP auth error (535)

- Validate `BREVO_SMTP_USER` and `BREVO_SMTP_PASS`
- Ensure credentials are from Brevo SMTP relay settings

---

## Production URL

`https://server-weather-android-app-new.onrender.com`

---

## Mobile Integration (Quick)

Use this section as the single source for app integration.

### Login request

`POST /api/auth/login`

```json
{
	"username": "user123",
	"password": "password123"
}
```

```json
{
	"loginOk": true,
	"username": "user123",
	"email": "user@example.com",
	"otpToken": "..."
}
```

### Send OTP request

`POST /api/auth/send-otp`

```json
{
	"otpToken": "..."
}
```

Success:

```json
{
	"otpSent": true,
	"email": "user@example.com"
}
```

### Verify OTP request

`POST /api/auth/verify-otp`

```json
{
	"otpToken": "...",
	"code": "123456"
}
```

Success:

```json
{
	"token": "JWT_TOKEN",
	"username": "user123"
}
```

### Dev login request

`POST /api/auth/dev-login`

```json
{
	"otpToken": "..."
}
```

Success:

```json
{
	"token": "JWT_TOKEN",
	"username": "user123",
	"devMode": true
}
```

### Mobile checklist

- Login sends only `username` + `password`
- Store `otpToken` after login
- Send OTP with body token and/or `Authorization: Bearer <otpToken>`
- Verify OTP and store final JWT
- Use JWT for all protected endpoints
- On `401`, clear token and return user to login
