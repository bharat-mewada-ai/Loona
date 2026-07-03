import express from "express";
import { requireAuth } from "../middlewares/auth.js";
import { createReport, getLiveReports } from "../controllers/busReport.controller.js";

const router = express.Router();

router.use(requireAuth);

router.post("/", createReport);
router.get("/", getLiveReports);

export default router;
