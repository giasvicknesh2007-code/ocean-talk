# 🌊 OceanTalk | Professional Real-Time Chat

OceanTalk is a high-performance, stateful real-time chat platform built with Node.js, Socket.io, and MongoDB. It demonstrates advanced full-stack engineering concepts including JWT authentication, scoped room architecture, message status synchronization, and ephemeral presence tracking.

## 🚀 Features

- **🔐 Secure Identity**: Full JWT-based signup and login system.
- **⚓ Room Architecture**: Isolated communication channels and deterministic private DM rooms.
- **📡 Real-Time Status**: 
  - `sent` / `delivered` / `read` message statuses.
  - Live typing indicators with debounced events.
  - Global and private unread message badges.
- **🖼️ Media Sharing**: Integrated image sharing support (expandable to Cloudinary).
- **⏳ Presence Persistence**: `lastSeen` tracking for offline users.
- **🐳 Production Ready**: Fully containerized with Docker and Docker Compose.

## 🛠️ Technology Stack

- **Backend**: Node.js, Express, Socket.io
- **Database**: MongoDB (Mongoose)
- **Security**: bcryptjs, JSON Web Tokens (JWT)
- **Frontend**: Vanilla JS (ES6+), Glassmorphism CSS
- **DevOps**: Docker, Docker Compose

## 📦 Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB (Local or Atlas)
- Docker (Optional)

### Installation
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root:
   ```env
   MONGO_URI=your_mongodb_uri
   JWT_SECRET=your_jwt_secret
   PORT=5000
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

### Running with Docker
```bash
docker-compose up --build
```

## 🏗️ Architecture Discipline

OceanTalk adheres to a strict separation of concerns:
- **`server/socket`**: Handles real-time events and state transitions.
- **`server/models`**: Defined schemas with indexing for optimized scoped queries.
- **`public/app.js`**: Managed state for unread counts, active rooms, and background events.

---
*Built for high-credibility portfolio demonstration.*
