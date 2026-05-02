/**
 * server/src/utils/pushNotifications.js
 *
 * Expo Push Notification helper.
 * Sends push notifications via Expo's push API.
 * No SDK needed — uses the HTTP API directly.
 *
 * Usage:
 *   import { sendPush } from '../utils/pushNotifications.js';
 *   await sendPush(user.expoPushToken, 'New comment!', 'Someone replied to your post');
 */

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

/**
 * Send a single push notification to one Expo push token.
 * Silently no-ops if token is null/undefined (user not registered for push).
 *
 * @param {string|null} token - The user's expoPushToken
 * @param {string} title - Notification title
 * @param {string} body - Notification body text
 * @param {object} [data] - Optional extra data payload (available in notification handler)
 */
export const sendPush = async (token, title, body, data = {}) => {
  if (!token) return; // user hasn't granted push permission yet
  if (!token.startsWith("ExponentPushToken[")) return; // not a valid Expo token

  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        to: token,
        title,
        body,
        data,
        sound: "default",
        priority: "high",
      }),
    });

    const json = await res.json();
    // Log delivery errors from Expo (e.g. token invalid, app uninstalled)
    if (json.data?.status === "error") {
      console.warn(`[Push] Delivery error for token ${token}:`, json.data.message);
    }
  } catch (err) {
    // Non-blocking — a push failure should never crash a request
    console.error("[Push] Failed to send notification:", err.message);
  }
};

/**
 * Send push notifications to multiple tokens in a single batch request.
 * Expo's API accepts up to 100 messages per request.
 *
 * @param {Array<{ token: string, title: string, body: string, data?: object }>} messages
 */
export const sendPushBatch = async (messages) => {
  const valid = messages.filter(
    (m) => m.token && m.token.startsWith("ExponentPushToken[")
  );
  if (valid.length === 0) return;

  try {
    await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(
        valid.map((m) => ({
          to: m.token,
          title: m.title,
          body: m.body,
          data: m.data ?? {},
          sound: "default",
          priority: "high",
        }))
      ),
    });
  } catch (err) {
    console.error("[Push] Batch send failed:", err.message);
  }
};
