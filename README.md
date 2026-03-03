# 🌤️ Weather Android App - Backend Server

Backend server for weather application with user authentication, favorites, and search history.

## 🚀 Quick Start

```bash
npm install
npm start
```

## 🔒 Environment Variables

Create `.env` file:

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
PORT=3000
```

## 📡 API Endpoints

**Authentication**
- `POST /signup` - Register
- `POST /login` - Login

**Weather**
- `GET /api/weather` - Get weather data

**Favorites**
- `GET /api/favorites` - List favorites
- `POST /api/favorites` - Add favorite
- `DELETE /api/favorites/:id` - Remove favorite

**History**
- `GET /api/history` - List history
- `POST /api/history` - Add to history
- `DELETE /api/history/:id` - Remove from history

**Health**
- `GET /health` - Health check
- `GET /ping` - Ping check

## 🌐 Production URL

```
https://server-weather-android-app-new.onrender.com
```

## 🛠️ Tech Stack & Architecture

**Backend Framework**
- **Node.js** - Asynchronous, event-driven runtime for scalable server applications
- **Express.js** - Minimalist web framework for RESTful API design

**Database**
- **MongoDB** - NoSQL document database for flexible data modeling
- **Mongoose** - ODM (Object Data Modeling) library for MongoDB, providing schema validation and business logic

**Authentication & Security**
- **JWT (JSON Web Tokens)** - Stateless authentication mechanism for secure API access
- **bcrypt** - Password hashing for secure credential storage
- **CORS** - Cross-Origin Resource Sharing configuration for mobile app integration

**Development & Deployment**
- **dotenv** - Environment variable management for secure configuration
- **Production-ready** - Error handling, health checks, and monitoring endpoints
- **Render** - Cloud platform deployment with auto-scaling capabilities

**Key Design Decisions**
- RESTful API architecture for clean, maintainable endpoints
- JWT-based authentication for stateless scalability
- Middleware pattern for code reusability and separation of concerns
- Environment-based configuration for secure deployment across environments
