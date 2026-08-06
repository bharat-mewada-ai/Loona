# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Features
- **UI Polish:** Premium profile UI polish sprint — chats, comments, zoomable images, unread badges, and nearby pencil FAB. Removed stories from UI and switched to DM Sans font with dark background `#0F1115`.
- **Music & Audio:** Real playable background music integration using iTunes search API and `expo-av` player. Full Instagram-style music selector picker with trending suggestions. Added instant stream optimization, song portion selector slider, and auto-stop music on scroll-out. Universal audio player and live iTunes track search.
- **Campuses:** Added MANIT and RGPV campuses with dynamic full stack support.
- **Push Notifications:** Grouped notifications, thread ID configurations for WhatsApp/Instagram-style groupings, and an option to stop marketing notifications.
- **Gamification & Polls:** Added 100 unique daily polls with sequential non-repeating daily indexing. Updated potato rewards logic.
- **Admin:** Support multiple owner IDs for confessions and last active access.
- **Feed:** Insta-style photo display, song sticker, and nearby bio/tags.

### Fixes
- **Security:** Secured hardcoded credentials and fixed gitignore gaps.
- **Build & CI:** Fixed CI testing and TypeScript build regressions.
- **Audio & Media:** Fixed ComposeSheet sticky bottom post button footer, mobile audio speaker loudness bugs, and song modal black screen issues (replaced TouchableOpacity with View).
- **Client UI:** Fixed ComposeSheet scroll layout bug, Top and Sticky Post bounds, and confession display layout when missing titles.
- **Server / Backend:** Fixed potato system race conditions, voting/like issues, chat latency, and shop gaps. Fixed rate limiter double counting and stuck limits when Redis is offline. Hardcoded owner ID fallback on admin UI. Fixed `app.json` `fallbackToCacheTimeout` to 0 for instant OTA updates.

### Chores
- Move planning files to ignored folder.
- Add issue and pull request templates.
- Rewrite README to match current realities.
- Remove campus mood panel from admin dashboard.
- Rename `logo.png.png` to `logo.png`.
