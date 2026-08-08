# API Reference

This document outlines the API endpoints exposed by the Loona server. Most endpoints require a valid JWT `Authorization` header (`Bearer <token>`).

## Base URL
`/api/v1`

## Authentication & Users (`/auth`)
| Method | Endpoint | Description | Auth Required |
| --- | --- | --- | --- |
| `POST` | `/auth/google` | Login or register with Google OAuth token | No |
| `POST` | `/auth/login` | Local login (development) | No |
| `POST` | `/auth/refresh` | Refresh JWT tokens | No |
| `GET` | `/auth/me` | Get the currently authenticated user's profile | Yes |
| `GET` | `/auth/profile/:userId` | Get a specific user's public profile | Yes |
| `GET` | `/auth/users/:userId` | Get a specific user's public profile (alias) | Yes |
| `PATCH` | `/auth/update-profile` | Update the current user's profile | Yes |
| `PATCH` | `/auth/push-token` | Register an Expo push token | Yes |
| `POST` | `/auth/logout` | Invalidate tokens and logout | Yes |
| `DELETE` | `/auth/delete-account` | Request account deletion | Yes |
| `POST` | `/auth/cancel-deletion` | Cancel pending account deletion | Yes |
| `PATCH` | `/auth/location` | Update user geo-location coordinates | Yes |
| `GET` | `/auth/nearby` | Fetch nearby users on the same campus | Yes |
| `POST` | `/auth/block/:userId` | Block a user | Yes |
| `DELETE` | `/auth/unblock/:userId` | Unblock a user | Yes |
| `GET` | `/auth/blocks` | List blocked users | Yes |
| `POST` | `/auth/wave/:userId` | Send a wave to a nearby user (costs potatoes) | Yes |
| `GET` | `/auth/leaderboard` | Get Campus War leaderboard and top players | No |
| `GET` | `/auth/campuses` | Get list of supported campuses | No |

## Posts (`/posts`)
*Routes grouped under `/posts` handle the core feed, polling, and content interactions.*

| Method | Endpoint | Description | Auth Required |
| --- | --- | --- | --- |
| `GET` | `/posts` | Paginated feed of posts (supports filters) | Yes |
| `POST` | `/posts` | Create a new post (thought, confession, etc.) | Yes |
| `GET` | `/posts/:id` | Get a single post by ID | Yes |
| `DELETE` | `/posts/:id` | Delete a post | Yes |
| `POST` | `/posts/:id/vote` | Upvote or downvote a post | Yes |
| `POST` | `/posts/:id/react` | Add an emoji reaction to a post | Yes |
| `POST` | `/posts/:id/comments` | Add a comment to a post | Yes |
| `DELETE` | `/posts/:id/comments/:commentId` | Delete a comment | Yes |
| `POST` | `/posts/:id/report` | Report a post | Yes |
| `POST` | `/posts/:id/vote-poll` | Vote on a poll | Yes |

## Chats (`/chats`)
| Method | Endpoint | Description | Auth Required |
| --- | --- | --- | --- |
| `GET` | `/chats` | Get all active chats for the user | Yes |
| `POST` | `/chats/start` | Start a new chat (often anonymous) | Yes |
| `GET` | `/chats/:chatId/messages` | Get paginated messages for a chat | Yes |
| `POST` | `/chats/:chatId/messages` | Send a new message | Yes |
| `POST` | `/chats/:chatId/messages/:messageId/react` | React to a message | Yes |
| `POST` | `/chats/:chatId/reveal` | Reveal identity to chat partner | Yes |
| `POST` | `/chats/:chatId/report` | Report a chat | Yes |
| `DELETE` | `/chats/:chatId` | Delete or leave a chat | Yes |

## Shop (`/shop`)
| Method | Endpoint | Description | Auth Required |
| --- | --- | --- | --- |
| `GET` | `/shop` | Get campus shop listings | Yes |
| `POST` | `/shop` | Create a new listing | Yes |
| `GET` | `/shop/:id` | Get a specific listing | Yes |
| `DELETE` | `/shop/:id` | Delete a listing | Yes |
| `POST` | `/shop/:id/boost` | Boost a listing for more visibility | Yes |
| `POST` | `/shop/:id/report` | Report a listing | Yes |

## Admin (`/admin`)
*Requires Admin or Staff privileges.*
| Method | Endpoint | Description | Auth Required |
| --- | --- | --- | --- |
| `GET` | `/admin/broadcast/recipients` | Get potential broadcast recipients | Admin |
| `GET` | `/admin/broadcast/history` | View broadcast history | Admin |
| `POST` | `/admin/broadcast` | Send a broadcast notification | Admin |
| `POST` | `/admin/users/:userId/adjust-potatoes` | Add/remove potatoes | Staff |
| `GET` | `/admin/users/search` | Search for users by email or ID | Staff |
| `GET` | `/admin/users/:userId/details` | Get full user history/details | Staff |
| `POST` | `/admin/users/:userId/ban` | Ban a user | Admin |
| `POST` | `/admin/users/:userId/unban` | Unban a user | Admin |
| `POST` | `/admin/users/:userId/verify` | Give user a verified badge | Staff |
| `POST` | `/admin/users/:userId/unverify` | Remove verified badge | Staff |
| `GET` | `/admin/health` | Get server health metrics | Admin |
| `GET` | `/admin/analytics/summary` | Get high-level analytics | Admin |
| `GET` | `/admin/errors` | View logged errors | Admin |
| `GET` | `/admin/criminals` | View banned/flagged users | Admin |
| `GET` | `/admin/reported-chats` | View flagged chats | Staff |
| `GET` | `/admin/reported-chats/:reportId/messages` | View messages in reported chat | Staff |
| `POST` | `/admin/reported-chats/:reportId/resolve` | Resolve a chat report | Staff |
| `POST` | `/admin/reported-chats/:reportId/dismiss` | Dismiss a chat report | Staff |
| `GET` | `/admin/confessions` | View confession unmasked authors | Owner |
| `GET` | `/admin/users/last-active` | View last active user stats | Owner |

## Other Endpoints
| Method | Endpoint | Description | Auth Required |
| --- | --- | --- | --- |
| `GET` | `/bus-report` | Get live bus locations/reports | Yes |
| `POST` | `/bus-report` | Submit a new bus location report | Yes |
| `GET` | `/campus-streak/status` | Get current campus win streaks | Yes |
| `GET` | `/config/mobile` | Get mobile app config (versions, etc) | No |
| `GET` | `/daily-poll/today` | Get today's daily poll | Yes |
| `POST` | `/feedback` | Submit app feedback | Yes |
| `GET` | `/notifications` | Get user notifications | Yes |
| `PATCH` | `/notifications/read-all` | Mark all notifications as read | Yes |

| `POST` | `/upload/image` | Upload image to Cloudinary (returns URL) | Yes |
| `GET` | `/health` | Public server health check | No |
