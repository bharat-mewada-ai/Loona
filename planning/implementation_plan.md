# Loona — Market Readiness Plan (5,000 Users)

> Deep analysis of every layer: Backend · Mobile Client · Admin · DevOps

---

## Executive Summary

Loona is a campus-anonymous social platform targeting students across OGI, LNCT, and NIT Bhopal.
The core loop — anonymous posting → reactions → upvotes → karma → leaderboard — is **fully built and functional**.
Infrastructure has solid bones: MongoDB Atlas with pooling, Redis caching, rate-limiting, Winston logs, Sentry error tracking, and a Bull queue for burn-posts.

**~70% of the platform is done.** The remaining 30% are gaps that **will cause failures or legal problems at scale.**

---

## ✅ What Is Already Done (Completed)

### 🔒 Authentication
- [x] Google OAuth (ID token + userinfo fallback)
- [x] JWT authentication middleware (`requireAuth`)
- [x] Secure store for token persistence on mobile
- [x] Campus selection at registration
- [x] Anonymous name + emoji avatar generation

### 📝 Core Feed & Posts
- [x] Create post with title, body, type, campus, image, event date/location
- [x] Infinite-scroll paginated feed (`useInfiniteQuery`)
- [x] Campus filter + post-type filter tabs
- [x] Hot-score algorithm (upvotes × 2 + comments × 1.5 + reactions - age decay)
- [x] Compound MongoDB indexes for 5k-scale feed queries
- [x] Duplicate-vote guard (voters array)
- [x] Burn-after-24h (Bull queue + hourly cron fallback + MongoDB TTL)
- [x] Post image support (base64 picker in ComposeSheet)
- [x] Vibe detection on compose (client-side keyword mapping)
- [x] 9 emoji reactions (wow, fire, same, skull, spicy, lit, wholesome, hmm, lmao)

### 💬 Comments & Chat
- [x] Comment thread per post (paginated, anon identity)
- [x] Delete own comment
- [x] DM via "Send a Message" from AuthorProfileSheet
- [x] Anonymous identity per chat (seeded from post ID)
- [x] Unread count badge logic in Chat model
- [x] Socket.IO real-time message delivery

### 🏆 Gamification & Leaderboard
- [x] Karma system (post +5, comment +2, upvote received +1)
- [x] Streak field on User model
- [x] Badges array on User model
- [x] Campus Patato War — live leaderboard refreshed every 10s
- [x] Top-10 users per campus aggregation
- [x] Profile stats (karma, post count, upvotes received)

### 🛡️ Moderation
- [x] Client-side content guard (25+ severe + 20+ mild words, phone/email detection)
- [x] Server-side `checkContent()` on post and comment creation
- [x] Report post (auto-hide at 5 reports)
- [x] Admin dashboard (reported posts list, delete / dismiss actions)
- [x] Admin role gate on profile screen and routes
- [x] `ReportSheet` UI component

### 📱 Mobile Client Polish
- [x] Dark mode (Zustand `uiStore`, theme token system)
- [x] Campus event reminders via `expo-notifications` (15-min local push)
- [x] GPS location autofill for event posts
- [x] FeedbackSheet + PrivacySheet in profile
- [x] Edit Identity modal (avatar picker + username rename)
- [x] PostCard supports text-only, photo-immersive, confession, and event layouts

### 🧰 Backend Infrastructure
- [x] Winston structured logger with `stream` for Morgan
- [x] Sentry error tracking (backend + `@sentry/react-native` installed)
- [x] Redis optional caching (feed 30s, stats 5m)
- [x] Rate limiting: global 200/min, auth 50/15min, post 20/min
- [x] Helmet + CORS + Compression + Morgan middleware
- [x] `maxPoolSize: 20` on MongoDB
- [x] Graceful shutdown on SIGTERM/SIGINT
- [x] `/health` endpoint
- [x] Env validation on startup (exits if `MONGO_URI`/`JWT_SECRET`/`GOOGLE_CLIENT_ID` missing)

---

## ❌ What Is NOT Done (Critical Gaps)

### 🚨 CRITICAL — Will Break or Block Launch

#### 1. Image Storage — **Base64 in MongoDB (WILL FAIL AT SCALE)**
**Status:** Posts store images as raw base64 strings directly in MongoDB documents.  
**Problem:** A single 1 MB photo = ~1.4 MB stored in Mongo. At 5k users × 10 posts/week with photos → **70 MB/week** of image data clogging the primary collection, blowing document size limits (16 MB BSON cap), and making the feed query extremely slow.  
**Fix Required:** Integrate Cloudinary (free tier) or AWS S3. On compose, upload the base64 to the CDN and store only the returned URL.

```
Files to change:
  server/src/controllers/post.controller.js — createPost
  client/src/components/sheets/ComposeSheet.tsx — pickImage handler
  [NEW] server/src/utils/uploadImage.js — Cloudinary SDK wrapper
```

#### 2. JWT Secret Is Weak & Hardcoded
**Status:** `JWT_SECRET=loona_secret_123` is committed in the `.env` file.  
**Problem:** If repo is ever public or `.env` leaks, **all user sessions can be forged.** This is an immediate security vulnerability.  
**Fix Required:** Rotate to a 32+ character random secret. Remove `.env` from git. Add `.env` to `.gitignore` if not already.

#### 3. CORS Is Fully Open (`origin: "*"`)
**Status:** Both `app.js` (CORS middleware) and `server.js` (Socket.IO) use `origin: "*"`.  
**Problem:** Any website on the internet can make requests to your API using a user's credentials (CSRF vector). Allows API scraping.  
**Fix Required:** Lock CORS to your app's production domain and the Expo dev server.

#### 4. No Input Validation / Sanitization on Server (Only Client-Side)
**Status:** `checkContent()` runs on the client only. The server calls it too for posts/comments but skips sanitization for `name`, `campus`, `avatar`, `eventLocation`, `image` fields.  
**Problem:** A malicious user can bypass the app entirely, POST directly to the API with arbitrary payloads (XSS payloads in name fields, invalid campus values, negative karma injection, etc.).  
**Fix Required:** Add `express-validator` middleware on all POST/PATCH routes. Validate: campus is one of `[ogi, lnct, nit, all]`, title/body maxlength, name format, etc.

#### 5. No Push Notification Backend
**Status:** Only **local** notifications are implemented (`Notifications.scheduleNotificationAsync`). There is no server-side push.  
**Problem:** Users never get notified when someone replies to their post, DMs them, or when a campus war milestone is reached. Retention will tank.  
**Fix Required:** Integrate **Expo Push Notifications** service.
- Client: collect `expoPushToken` on app start, send to server.
- Server: add `expoPushToken` field to User model, send push via Expo API when a comment/DM is created.

#### 6. No Streak Calculation Logic
**Status:** `streak` field exists on the User model and is displayed on the profile, but **no code ever updates it.**  
**Problem:** Every user shows 0-day streak permanently, breaking the gamification loop.  
**Fix Required:** On `createPost`, compare `user.lastPostDate` to today. If yesterday, increment streak. If >1 day gap, reset to 1.

#### 7. No Badge Award Logic
**Status:** `badges` array exists on User model and is displayed in the profile badge row, but **no code ever grants badges.**  
**Problem:** No badges are ever earned; profile badge section always shows nothing. Core gamification pillar is broken.  
**Fix Required:** Award badges on milestones:
- `"First Post"` — on first post creation  
- `"Hot Poster"` — first time a post becomes `isHot`  
- `"Legend"` — when karma > 100  
- `"Consistent"` — when streak > 7

#### 8. Reactions Are Not Duplicate-Guarded
**Status:** Vote has a `voters` array preventing duplicate upvotes. Reactions have no such guard.  
**Problem:** A user can spam the same reaction to inflate the count. Any user can hit the API in a loop to make any post go viral artificially.  
**Fix Required:** Add `reactedBy` map to Post model, similar to the voters pattern. Or use a separate `Reaction` collection per post per user.

---

### ⚠️ HIGH PRIORITY — Significant UX / Reliability Issues

#### 9. My Posts Filter Is Client-Side and Incomplete
**Status:** Profile's "My Recent Posts" filters client-side: `data?.pages?.flatMap(p => p.posts)?.filter(p => p.author === user?._id)`.  
**Problem:** This only searches already-loaded feed pages. If the user's posts are older than what's loaded (page 2+), they won't appear. Also shows only first-page results of the global feed filtered locally.  
**Fix Required:** Add a dedicated backend route `GET /api/posts/mine` that queries `{ author: req.user._id }` directly.

#### 10. Chat Is HTTP-Polling, Not Truly Real-Time
**Status:** `getMessages` fetches messages on mount. Socket.IO `newMessage` event works only if both users are actively in the same chat room (`chatId`).  
**Problem:** If the target user is on a different screen, they never receive the message in real-time. The chat list unread count is only updated on the next `getChats` call.  
**Fix Required:** Implement user-level socket rooms. On connect, each user joins `user:<userId>` room. When a message is sent, emit to `user:<targetUserId>` room so they receive it regardless of screen.

#### 11. No Refresh Token / Long-Session Management
**Status:** JWT is issued with `expiresIn: "7d"`. When it expires, the user is silently logged out with a 401 error.  
**Problem:** Users lose session after 7 days with no graceful re-auth flow. The `useAuth` hook doesn't handle 401 responses by redirecting to login.  
**Fix Required:** Add an Axios interceptor in `client.ts` that catches 401 responses and redirects to `/(auth)/login`.

#### 12. Image Upload Size — No Server-Side Limit Enforcement
**Status:** `express.json({ limit: "10mb" })` allows up to 10 MB payloads. ComposeSheet uses `quality: 0.7` but the base64 of even a compressed image is large.  
**Problem:** Even with CDN migration (#1 above), large payloads stress the Node.js event loop.  
**Fix Required:** Add explicit file size validation in `createPost`. If migrating to Cloudinary, size limit is enforced by the SDK.

#### 13. Admin Dashboard Has No Authentication Guard on Client
**Status:** `profile.tsx` shows the admin link only if `user.role === 'admin'`, but `app/admin/index.tsx` itself has no route guard.  
**Problem:** Any user who navigates to `/admin` directly (by typing the URL in Expo Go, for example) sees the admin UI.  
**Fix Required:** Add role check at top of `AdminDashboard` component, redirect non-admins immediately.

#### 14. Socket.IO CORS Is `origin: "*"` with No Auth
**Status:** `new Server(server, { cors: { origin: "*" } })` — no auth on socket connection.  
**Problem:** Anyone can connect to the socket and join any chat room by knowing the chatId.  
**Fix Required:** Add JWT verification middleware on socket `connection` event using `socket.handshake.auth.token`.

---

### 📋 MEDIUM PRIORITY — Store / Launch Readiness

#### 15. App Not Configured for Production Build (EAS)
**Status:** `eas.json` exists but `app.json` has placeholder values (`"slug": "client"`, no app store IDs).  
**Fix Required:**
- Set proper `name`, `slug`, `bundleIdentifier` (iOS), `package` (Android) in `app.json`
- Configure EAS build profiles for staging and production
- Set `SENTRY_DSN` and API URL as EAS secrets (not in `.env`)

#### 16. No Terms of Service Document
**Status:** PrivacySheet exists but only contains a placeholder policy. There is no Terms of Service screen.  
**Problem:** Both Google Play Store and Apple App Store **require** a real privacy policy and TOS URL.  
**Fix Required:** Write a real Privacy Policy and Terms of Service. Host on a simple webpage. Link from the app.

#### 17. No Onboarding / Splash Screen Flow
**Status:** New users who open the app are dropped directly into the login screen with no explanation of what Loona is.  
**Problem:** Cold conversion rate will be poor without context.  
**Fix Required:** Add a 3-slide onboarding carousel on first launch (using `AsyncStorage` to check `hasOnboarded`).

#### 18. Feed Has No Skeleton Loading State
**Status:** Feed shows a spinner during initial load. On slow connections this feels broken.  
**Fix Required:** Add skeleton placeholder cards using `Animated` API during `isLoading` state.

#### 19. No Error Boundary on Client
**Status:** Any unhandled JS error in a screen will crash the whole app with a red screen (dev) or white screen (prod).  
**Fix Required:** Wrap the root layout with a React Error Boundary that shows a friendly "Something went wrong" UI with a reload button.

#### 20. `injectFakeComment.js` & `seed.js` Left in Production Server
**Status:** `server/injectFakeComment.js` and `server/seed.js` are in the root of the server directory.  
**Problem:** These are developer scripts that could be accidentally run on the live database.  
**Fix Required:** Move to a `/scripts` subdirectory. Add a safeguard check for `NODE_ENV !== 'production'`.

---

### 🔍 LOW PRIORITY — Performance & Polish

#### 21. `voters` Array Grows Without Bound
**Status:** Every upvoter's ObjectId is pushed to `post.voters`. Over time, popular posts accumulate thousands of IDs in a single array.  
**Problem:** At scale, the voters array bloats document size and slows `findById`.  
**Fix Required:** Either move voters to a separate `Vote` collection, or use a Set-based Map in the Post document with a projection exclude.

#### 22. Leaderboard Polls Every 10 Seconds
**Status:** `useLeaderboard` has `refetchInterval: 10_000`.  
**Problem:** With 5k concurrent users, that's 5,000 requests every 10 seconds to the leaderboard endpoint (~500 req/s bursts).  
**Fix Required:** Cache the leaderboard response in Redis for 30s. Push updates via Socket.IO when karma changes instead of polling.

#### 23. No App Version / Update Prompt
**Status:** No over-the-air (OTA) update mechanism is configured.  
**Fix Required:** Configure Expo Updates for OTA delivery of JS bundle updates without full store releases.

#### 24. TypeScript Errors Present
**Status:** `tsc_output.txt` exists in the client root — indicating TypeScript compilation errors.  
**Fix Required:** Resolve all TS errors before production build.

#### 25. No Analytics
**Status:** No analytics SDK is integrated. There is no way to know which post types are most popular, what the DAU/MAU is, or where users drop off.  
**Fix Required:** Integrate **PostHog** (open-source, free tier) or Mixpanel for event tracking.

---

## 📊 Summary Scorecard

| Category | Status | Score |
|---|---|---|
| Core Post Feed | ✅ Complete | 9/10 |
| Authentication & Sessions | ⚠️ Weak secret, no 401 handler | 6/10 |
| Gamification (Streak + Badges) | ❌ Logic missing | 3/10 |
| Moderation | ⚠️ Reaction spam unguarded | 7/10 |
| Real-time (Chat/Socket) | ⚠️ Not user-room based | 6/10 |
| Push Notifications | ❌ No server-side push | 2/10 |
| Image Storage | ❌ Base64 in Mongo | 1/10 |
| Security (CORS, validation) | ❌ Open CORS, no server validation | 4/10 |
| Admin Dashboard | ⚠️ No client guard | 7/10 |
| Store / Launch Readiness | ❌ No TOS, no EAS config | 3/10 |
| Monitoring | ✅ Sentry + Winston done | 8/10 |
| **Overall** | | **~56%** |

---

## 🗺️ Execution Roadmap (Priority Order)

### Phase 1 — Security & Stability (Week 1) 🔥
Must be done BEFORE any real users touch the app.

1. **Rotate JWT secret** → generate 32-char random string, update env, remove `.env` from git
2. **Lock CORS** → whitelist production domain + Expo dev origins
3. **Migrate images to Cloudinary** → remove base64 from Post model
4. **Add server-side input validation** → `express-validator` on all routes
5. **Socket.IO auth middleware** → verify JWT on `connection` event
6. **Fix streak calculation** in `createPost` controller
7. **Add 401 Axios interceptor** on client → auto-redirect to login on token expiry

### Phase 2 — Core Feature Completion (Week 2) ✨
8. **Award badges** in `createPost`, `votePost`, after karma thresholds
9. **Add `/api/posts/mine` route** and update Profile screen to use it
10. **Guard reaction duplicates** with `reactedBy` field
11. **Admin client-side route guard** → redirect non-admins from `/admin`
12. **User-level socket rooms** → real-time DM delivery on any screen
13. **Server-side push notifications** → collect Expo push token, notify on comment/DM

### Phase 3 — Store & Launch Prep (Week 3) 🚀
14. **Real Privacy Policy + TOS** → host on a page, link from PrivacySheet
15. **Configure `app.json`** → bundle ID, app store IDs, icons, splash
16. **EAS build setup** → staging + production profiles, env secrets
17. **Onboarding flow** → 3-slide intro on first launch
18. **Error boundary** on root layout
19. **Skeleton loaders** on feed
20. **Resolve TypeScript errors** (`tsc_output.txt`)
21. **Move dev scripts** (`injectFakeComment.js`, `seed.js`) to `/scripts`

### Phase 4 — Scale Optimization (Week 4) 📈
22. **Cache leaderboard in Redis** → push updates via Socket.IO instead of polling
23. **Expo OTA updates** → configure `expo-updates`
24. **PostHog analytics** → install SDK, track key events
25. **voters array refactor** → move to separate `Vote` collection for popular posts

---

## Open Questions for You

> [!IMPORTANT]
> **Image hosting**: Do you want to use Cloudinary (easiest, free tier) or AWS S3? This decision blocks Phase 1 item #3.

> [!IMPORTANT]
> **Push notifications**: Expo Push is free and the simplest choice for React Native. Should we use that, or do you want Firebase Cloud Messaging (FCM)?

> [!WARNING]
> **Campus expansion**: The code is hardcoded to `ogi`, `lnct`, `nit`. If you plan to add more campuses at launch, we need to make campus list dynamic (DB-driven) before Phase 3.

> [!NOTE]
> **Monetization**: Is there a premium subscription planned (seen references in conversation history)? If yes, Stripe/Razorpay integration should be scoped into Phase 3 alongside store submission.
