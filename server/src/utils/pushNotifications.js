import axios from "axios";
import logger from "./logger.js";

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
export const sendPushNotification = async (token, title, body, data = {}) => {
  if (!token) return; // user hasn't granted push permission yet
  if (!token.startsWith("ExponentPushToken[")) return; // not a valid Expo token

  // Group notifications by chatId or postId to enable WhatsApp-style grouping
  const threadId = data.chatId || data.postId || data.threadId || "default_thread";

  try {
    const res = await axios.post(
      EXPO_PUSH_URL,
      {
        to: token,
        title,
        body,
        data,
        sound: "default",
        priority: "high",
        threadId,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    const json = res.data;
    logger.info(`[Push] Expo response: ${res.status} ${JSON.stringify(json)}`);
    // Log delivery errors from Expo (e.g. token invalid, app uninstalled)
    if (json.data?.status === "error") {
      logger.warn(`[Push] Delivery error for token ${token}:`, json.data.message);
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
      const res = await axios.post(
        EXPO_PUSH_URL,
        valid.map((m) => {
          const threadId = m.data?.chatId || m.data?.postId || m.data?.threadId || "default_thread";
          return {
            to: m.token,
            title: m.title,
            body: m.body,
            data: m.data ?? {},
            sound: "default",
            priority: "high",
            threadId,
          };
        }),
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );
      const json = res.data;
      logger.info(`[Push] Batch Expo response: ${res.status} ${JSON.stringify(json)}`);
  } catch (err) {
    console.error("[Push] Batch send failed:", err.message);
  }
};
