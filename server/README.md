# Loona Server

This is the Express.js backend for the Loona platform.

## Architecture
- **Web Framework:** Express.js (Node.js 18+)
- **Database:** MongoDB Atlas (accessed via Mongoose)
- **Caching:** Redis (Upstash or local)
- **Real-time:** Socket.IO
- **Job Queue:** Bull (for burn-after-reading features)

## Setup

1. Copy `.env.example` to `.env` and fill in the required variables (including `MONGO_URI`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `CLOUDINARY_*`, `REDIS_URL`, `RAZORPAY_*`, `OWNER_USER_ID`, etc.).
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run in development mode:
   ```bash
   npm run dev
   ```

## Scripts
- `npm run dev`: Starts the server with Nodemon.
- `npm start`: Starts the server for production.
- `node scripts/seed.js`: Seeds the database (if needed).
- `node scripts/migrate_karma_to_potato.js`: Legacy migration script.
