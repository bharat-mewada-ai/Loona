# Loona Production Deployment Guide 🚀

This document outlines the steps to deploy Loona to a production environment (Render + MongoDB Atlas + Upstash).

## 1. Prerequisites
- **Node.js**: v20.x or higher
- **MongoDB**: Atlas Cluster (v5.0+)
- **Redis**: Upstash (TLS enabled)
- **Cloudinary**: Account for image storage
- **Google Cloud**: OAuth Credentials

## 2. Environment Variables (.env)
Ensure the following variables are set in your production environment (e.g., Render Dashboard):

```bash
PORT=5000
NODE_ENV=production
MONGO_URI=mongodb+srv://...
JWT_SECRET=your_rotated_64_char_secret
JWT_REFRESH_SECRET=your_rotated_64_char_secret
GOOGLE_CLIENT_ID=...
REDIS_URL=rediss://... (Use rediss:// for TLS)
ALLOWED_ORIGINS=https://your-loona-web.onrender.com
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

## 3. Deployment Steps (Server)
1.  **Connect Repo**: Connect your GitHub repository to Render.
2.  **Build Command**: `npm install`
3.  **Start Command**: `npm start`
4.  **Health Check**: Verify `/health` returns 200 OK.

## 4. Deployment Steps (Client)
1.  **Environment**: Ensure `EXPO_PUBLIC_API_URL` points to your production backend.
2.  **Build APK**: `eas build --platform android --profile production`
3.  **Web Deployment**: `npx expo export --platform web` (Deploy the `dist` folder to Vercel/Netlify).

## 5. Security Checklist
- [x] JWT Secrets rotated (Done in Phase 1)
- [x] CORS Lockdown active (Done in Phase 1)
- [x] Cloudinary Whitelist enforced (Done in Phase 1)
- [x] Input sanitization active (Done in Phase 1)
- [x] Rate limiting configured (Done in app.js)

## 6. Performance
- **Indexes**: MongoDB text and compound indexes are already in `post.model.js`.
- **Caching**: Redis is used for feed and leaderboard caching.

---
*Loona - Space for Secrets* 🦊
