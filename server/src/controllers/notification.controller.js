import Notification from "../models/notification.model.js";

export const getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const notifications = await Notification.find({ recipient: req.user._id })
        .populate("sender", "name avatar")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit) + 1)
        .lean();

    const hasMore = notifications.length > parseInt(limit);
    if (hasMore) notifications.pop();

    res.json({
      notifications,
      total: -1,
      page: parseInt(page),
      hasMore,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const markAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { $set: { read: true } }
    );
    res.json({ message: "Notifications marked as read" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, recipient: req.user._id });
    res.json({ message: "Notification deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
