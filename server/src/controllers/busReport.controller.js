import BusReport from "../models/busReport.model.js";
import logger from "../utils/logger.js";

// ─── POST /bus-reports ────────────────────────────────────────────────────────
export const createReport = async (req, res) => {
  try {
    const { busNumber, route, parkingSpot } = req.body;
    if (!busNumber || !route || !parkingSpot) {
      return res.status(400).json({ error: "Bus number, route, and parking spot are required" });
    }

    const report = await BusReport.create({
      busNumber: busNumber.trim(),
      route: route.trim(),
      parkingSpot: parkingSpot.trim(),
      campus: req.user.campus,
      reporter: req.user._id,
    });

    const populated = await BusReport.findById(report._id)
      .populate("reporter", "name avatar")
      .lean();

    res.status(201).json(populated);
  } catch (err) {
    logger.error("[BusReport] createReport error:", err.message);
    res.status(500).json({ error: "Could not create bus location report" });
  }
};

// ─── GET /bus-reports ─────────────────────────────────────────────────────────
// Returns all reports from the last 4 hours for the current campus
export const getLiveReports = async (req, res) => {
  try {
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);

    const reports = await BusReport.find({
      campus: req.user.campus,
      createdAt: { $gte: fourHoursAgo },
    })
      .populate("reporter", "name avatar")
      .sort({ createdAt: -1 })
      .lean();

    res.json(reports);
  } catch (err) {
    logger.error("[BusReport] getLiveReports error:", err.message);
    res.status(500).json({ error: "Could not fetch live bus locator reports" });
  }
};
