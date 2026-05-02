import Feedback from "../models/feedback.model.js";

export const submitFeedback = async (req, res) => {
  try {
    const { content, category } = req.body;
    const userId = req.user._id;

    if (!content) {
      return res.status(400).json({ error: "Feedback content is required" });
    }

    const feedback = new Feedback({
      userId,
      content,
      category: category || "other",
    });

    await feedback.save();
    res.status(201).json({ message: "Feedback submitted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getFeedbacks = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: "Forbidden: Admin access only" });
    }
    const feedbacks = await Feedback.find().populate('userId', 'name email avatar').sort({ createdAt: -1 });
    res.json(feedbacks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
