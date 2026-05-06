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

    // 2. Send push notification (if recipient has token and enabled)
    const recipientUser = await User.findById(recipient).select("expoPushToken notificationsEnabled");
    if (recipientUser?.expoPushToken && recipientUser.notificationsEnabled !== false) {
      await sendPushNotification(recipientUser.expoPushToken, title, body, data);
    }

    return notification;
  } catch (error) {
    logger.error("Error creating notification:", error.message);
  }
};
