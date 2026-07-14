<div align="center">

<img src="client/assets/icon.png" width="96" alt="Loona Logo" />

# Loona 🦊
### The Anonymous Social Network for Campus Life

*Post anonymously. React freely. Earn Potatoes. Rule the Campus War.*

[![Platform](https://img.shields.io/badge/platform-Android%20%7C%20iOS-orange?style=flat-square)](https://expo.dev/@loonaofficial/loona)
[![Built with Expo](https://img.shields.io/badge/built%20with-Expo%20SDK%2052-000020?style=flat-square&logo=expo)](https://expo.dev)
[![Backend](https://img.shields.io/badge/backend-Node.js%20%2B%20Express-green?style=flat-square&logo=node.js)](https://nodejs.org)
[![Database](https://img.shields.io/badge/database-MongoDB%20Atlas-47A248?style=flat-square&logo=mongodb)](https://mongodb.com)
[![Cache](https://img.shields.io/badge/cache-Redis-DC382D?style=flat-square&logo=redis)](https://redis.io)

</div>

---

## What is Loona?

Loona is a campus-anonymous social platform built for college students in Bhopal. Students log in with Google, pick their campus, and get a randomly generated anonymous identity. Everything they post — confessions, thoughts, events, offers, stories — is tied to that anonymous persona, never their real name.

The core loop: **Post → Get Upvoted → Earn 🥔 Potatoes → Climb the Campus Leaderboard → Win the Campus War.**

> Currently live for **Oriental College (OGI)** and **LNCT Bhopal**.

---

## Features

### 📝 Feed & Posts
- Anonymous posting with 7 post types: `thought`, `confession`, `story`, `discussion`, `event`, `offer`, `bhandara`
- Infinite-scroll feed with cursor-based pagination
- Hot-score algorithm (upvotes × 2 + comments × 1.5 + reactions − age decay)
- Burn-after-24h posts (Bull queue + MongoDB TTL)
- Polls with real-time vote counts
- Multi-image carousel support via Cloudinary CDN

### 💬 Comments & Chat
- Threaded comments per post
- Anonymous DMs — identity is derived from the post, not your profile
- Real-time message delivery via Socket.IO user rooms
- Unread count badges

### 🥔 Potatoes (Gamification)
- Every user starts with 25 🥔 Potatoes
- Earn potatoes by commenting (+1), getting upvoted (+1)
- Campus win-streak multiplier — winning campus gets **2× potato rewards** for 3+ day streaks
- Daily quests: post once + upvote 3 times = +5 bonus potatoes
- Spend potatoes to wave at nearby users, list items in the shop, or boost listings

### 🏆 Campus War Leaderboard
- Live campus vs campus potato totals
- Top 10 individual legends per campus
- Real-time updates via Socket.IO + Redis cache (5 min TTL)

### 📍 Nearby
- See anonymous users within 5 km on campus (GeoJSON + `$geoNear`)
- Wave at someone — mutual waves create a free chat
- Potato cost: 5🥔 per wave

### 🛒 Campus Shop
- List second-hand items for ₹5 (Razorpay) or 50🥔 (potatoes)
- Featured boost: ₹15 or 150🥔
- Campus-filtered listings

### 🔔 Notifications
- Real-time in-app notifications via Socket.IO
- Server-side Expo Push Notifications for comments, upvotes, waves, and DMs
- Notification deep-linking (tap → navigate to post/chat)

### 🛡️ Moderation
- Client + server-side content guard (25+ severe words, phone/email detection)
- Report system (auto-hide at 5 reports)
- Admin dashboard: reported posts, user management, confessions reveal, broadcast messages

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Mobile Client** | React Native + Expo SDK 52, Expo Router v3 |
| **State Management** | Zustand + TanStack Query v5 |
| **Backend** | Node.js + Express.js (ESM) |
| **Database** | MongoDB Atlas (Mongoose) |
| **Cache** | Redis (Upstash / local) |
| **Real-time** | Socket.IO |
| **Auth** | Google OAuth + JWT (access 1h, refresh 30d) |
| **Images** | Cloudinary CDN |
| **Push Notifications** | Expo Push Notification Service |
| **Payments** | Razorpay |
| **Error Tracking** | Sentry |
| **Logging** | Winston + Morgan |
| **Job Queue** | Bull (burn-post scheduling) |
| **Admin Panel** | React + Vite (separate web app) |
| **OTA Updates** | EAS Update (production channel) |

---

## Monorepo Structure

```
Loona/
├── client/          # React Native (Expo) mobile app
│   ├── app/         # Expo Router screens
│   │   ├── (tabs)/  # Main tab screens (feed, nearby, leaderboard, profile)
│   │   ├── chat/    # DM chat screens
│   │   └── (auth)/  # Login & onboarding
│   └── src/
│       ├── api/     # Axios API layer
│       ├── components/  # Reusable UI components & sheets
│       ├── hooks/   # React Query hooks
│       ├── store/   # Zustand stores
│       └── utils/   # Helpers (geo, haptics, cloudinary, socket)
│
├── server/          # Express.js backend
│   ├── src/
│   │   ├── controllers/  # Route handlers
│   │   ├── models/       # Mongoose schemas
│   │   ├── routes/       # Express routers
│   │   ├── middleware/   # Auth, rate-limit, cache
│   │   ├── utils/        # Redis, logger, push, badge service
│   │   └── services/     # Cron jobs
│   └── scripts/     # Migration & seed scripts
│
├── admin/           # React admin dashboard (Vite)
│   └── src/
│       └── pages/   # Dashboard, UserManagement, Confessions, etc.
│
└── docs/            # Privacy policy, Terms, Delete-account page
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB Atlas cluster (or local MongoDB)
- Redis instance (Upstash free tier or local)
- Cloudinary account (free tier)
- Google OAuth credentials
- Expo CLI (`npm install -g eas-cli`)

### 1. Clone & install
```bash
git clone https://github.com/bharat-mewada-ai/Loona.git
cd Loona
```

### 2. Configure environment
```bash
cp .env.example server/.env
# Fill in MONGO_URI, JWT_SECRET, GOOGLE_CLIENT_ID, CLOUDINARY_*, REDIS_URL
```

### 3. Start the backend
```bash
cd server
npm install
npm run dev
```

### 4. Start the mobile client
```bash
cd client
npm install
npx expo start
```

### 5. Start the admin panel
```bash
cd admin
npm install
npm run dev
```

---

## Environment Variables

See [`.env.example`](.env.example) for all required variables.

| Variable | Description |
|---|---|
| `MONGO_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | 32+ char random string for access tokens |
| `JWT_REFRESH_SECRET` | 32+ char random string for refresh tokens |
| `GOOGLE_CLIENT_ID` | Google OAuth web client ID |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `REDIS_URL` | Redis connection URL |
| `RAZORPAY_KEY_ID` | Razorpay key ID |
| `RAZORPAY_KEY_SECRET` | Razorpay key secret |
| `SENTRY_DSN` | Sentry DSN (optional) |
| `EXPO_PUBLIC_API_URL` | Backend API URL for the mobile client |

---

## Deployment

- **Backend** — Render (auto-deploy from `main` branch)
- **Mobile App** — EAS Build (production APK/AAB) + EAS Update (OTA JS patches)
- **Admin Panel** — Vercel / any static host

See [`DEPLOYMENT.md`](DEPLOYMENT.md) for full deployment steps.

---

## API Overview

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/auth/google` | Google OAuth login / register |
| `GET` | `/api/v1/auth/me` | Get current user |
| `GET` | `/api/v1/posts` | Paginated feed |
| `POST` | `/api/v1/posts` | Create post |
| `POST` | `/api/v1/posts/:id/vote` | Toggle upvote |
| `POST` | `/api/v1/posts/:id/react` | Add emoji reaction |
| `GET` | `/api/v1/auth/leaderboard` | Campus War leaderboard |
| `GET` | `/api/v1/auth/nearby` | Nearby anonymous users |
| `POST` | `/api/v1/chats` | Start a chat |
| `GET` | `/api/v1/shop` | Campus shop listings |
| `GET` | `/health` | Server health check |

---

## Contributing

This is a private project. Contributions are by invite only.

---

## License

Private & proprietary. All rights reserved © 2025 Loona.
