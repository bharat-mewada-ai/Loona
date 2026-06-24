import DailyPoll from "../models/dailyPoll.model.js";

// Helper to seed a default poll if none is active today
const seedDefaultPoll = async (activeDate) => {
  const defaultPolls = [
    {
      question: "Is OGI's canteen samosa actually edible? 🥟",
      options: [
        { text: "Yes, it is fire! 🔥" },
        { text: "Nah, it is biohazard 💀" },
        { text: "Meh, average 🤷" }
      ]
    },
    {
      question: "LNCT Canteen vs OGI Canteen: Which one wins? ⚔️",
      options: [
        { text: "LNCT 🌙" },
        { text: "OGI 🦊" },
        { text: "Both are trash 🗑️" }
      ]
    },
    {
      question: "Do you attend 9:00 AM lectures? ⏰",
      options: [
        { text: "Yes, standard topper 🤓" },
        { text: "Only for attendance 📝" },
        { text: "Never, sleep is life 😴" }
      ]
    }
  ];

  const index = Math.abs(activeDate.split("-").reduce((acc, c) => acc + parseInt(c, 10), 0)) % defaultPolls.length;
  const chosen = defaultPolls[index];
  
  return await DailyPoll.create({
    question: chosen.question,
    options: chosen.options,
    activeDate
  });
};

export const getTodayPoll = async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split("T")[0];
    let poll = await DailyPoll.findOne({ activeDate: todayStr }).lean();

    if (!poll) {
      // Seed a default poll dynamically if none is created yet
      poll = await seedDefaultPoll(todayStr);
    }

    const userId = req.user._id.toString();
    const userVote = poll.votedUsers && poll.votedUsers[userId] !== undefined ? poll.votedUsers[userId] : null;

    // Clean up votedUsers mapping from response payload to save bandwidth
    const { votedUsers, ...rest } = poll;

    res.json({
      ...rest,
      userVote
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const voteDailyPoll = async (req, res) => {
  try {
    const { optionIndex } = req.body;
    const todayStr = new Date().toISOString().split("T")[0];
    const userId = req.user._id.toString();

    if (optionIndex === undefined || optionIndex < 0) {
      return res.status(400).json({ error: "Invalid option index" });
    }

    let poll = await DailyPoll.findOne({ activeDate: todayStr });
    if (!poll) {
      poll = await seedDefaultPoll(todayStr);
    }

    // Check if user has already voted
    if (poll.votedUsers.has(userId)) {
      return res.status(400).json({ error: "You already voted in today's poll!" });
    }

    if (optionIndex >= poll.options.length) {
      return res.status(400).json({ error: "Option index out of bounds" });
    }

    // Atomic update
    poll.options[optionIndex].votes += 1;
    poll.votedUsers.set(userId, optionIndex);
    await poll.save();

    const userVote = optionIndex;
    const pollObj = poll.toObject();
    delete pollObj.votedUsers;

    res.json({
      ...pollObj,
      userVote
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
