import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";
import { sendPushNotification } from "./pushNotifications.js";
import logger from "./logger.js";

export const createNotification = async ({
  recipient,
  sender,
  type,
  title,
  body,
  data = {}
}) => {
  try {
    // 1. Save in-app notification
    const notification = await Notification.create({
      recipient,
      sender,
      type,
      title,
      body,
      data
    });

    // 2. Send push notification in background (if recipient has token and enabled)
    User.findById(recipient)
      .select("expoPushToken notificationsEnabled")
      .then((recipientUser) => {
        if (recipientUser?.expoPushToken && recipientUser.notificationsEnabled !== false) {
          sendPushNotification(recipientUser.expoPushToken, title, body, data).catch((err) => {
            logger.error("Error sending push notification: " + err.message);
          });
        }
      })
      .catch((err) => {
        logger.error("Error looking up recipient for push: " + err.message);
      });

    return notification;
  } catch (error) {
    logger.error("Error creating notification:", error.message);
  }
};
