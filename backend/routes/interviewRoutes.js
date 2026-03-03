import express from "express";
import { nanoid } from "nanoid";
import mongoose from "mongoose";
import Interview from "../models/Interview.js";
import User from "../models/User.js"; // ✅ IMPORTANT
import authMiddleware from "../middleware/authMiddleware.js";
import { validateCodeUpdate, validateRating } from "../middleware/validationMiddleware.js";
import memoryStore from "../utils/memoryStore.js";
import Chat from "../models/Chat.js";
import { runCodeOnJudge0, analyzeInterview } from "../utils/ai.js";

const router = express.Router();

// =========================
// MongoDB Check
// =========================
const isMongoConnected = () => {
  return mongoose.connection.readyState === 1;
};

// =========================
// Helper to Create Interview Object
// =========================
const createInterviewObject = (data) => ({
  roomId: data.roomId,
  interviewer: data.interviewer,
  candidate: data.candidate, // ✅ MUST NOT BE NULL
  code: data.code || "// Start coding here...\n",
  language: data.language || "javascript",
  status: data.status || "active",
  rating: null,
  feedback: null,
  startTime: new Date(),
  endTime: null,
  createdAt: new Date(),
  updatedAt: new Date(),
});

// =========================
// Create Interview Room
// =========================
router.post("/create-room", authMiddleware, async (req, res) => {
  try {
    const { candidateEmail, language } = req.body;

    if (!candidateEmail) {
      return res.status(400).json({ message: "Candidate email is required" });
    }

    const candidateUser = await User.findOne({ email: candidateEmail });

    if (!candidateUser) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    const roomId = nanoid(12);

    const interviewData = createInterviewObject({
      roomId,
      interviewer: req.user.userId,
      candidate: candidateUser._id, // ✅ FIXED
      language,
    });

    let savedInterview;

    if (isMongoConnected()) {
      savedInterview = await Interview.create(interviewData);
    } else {
      savedInterview = memoryStore.saveInterview(interviewData);
    }

    res.status(201).json({
      message: "Interview room created successfully",
      roomId,
      interviewId: savedInterview._id,
    });
  } catch (err) {
    console.error("Create room error:", err);
    res.status(500).json({ message: "Failed to create interview room" });
  }
});

// =========================
// Get All Interviews
// =========================
router.get("/", authMiddleware, async (req, res) => {
  try {
    let interviews;

    if (isMongoConnected()) {
      interviews = await Interview.find({
        $or: [
          { interviewer: req.user.userId },
          { candidate: req.user.userId },
        ],
      })
        .populate("interviewer", "name email")
        .populate("candidate", "name email")
        .sort({ createdAt: -1 });
    } else {
      interviews = memoryStore.findInterviewsByUserId(req.user.userId);
    }

    res.json(interviews);
  } catch (err) {
    console.error("Get interviews error:", err);
    res.status(500).json({ message: "Failed to fetch interviews" });
  }
});

// =========================
// Get Interview By Room ID
// =========================
router.get("/room/:roomId", authMiddleware, async (req, res) => {
  try {
    let interview;

    if (isMongoConnected()) {
      interview = await Interview.findOne({ roomId: req.params.roomId })
        .populate("interviewer", "name email")
        .populate("candidate", "name email");
    } else {
      interview = memoryStore.findInterviewByRoomId(req.params.roomId);
    }

    if (!interview) {
      return res.status(404).json({ message: "Interview not found" });
    }

    res.json(interview);
  } catch (err) {
    console.error("Get interview error:", err);
    res.status(500).json({ message: "Failed to fetch interview" });
  }
});

// =========================
// Update Code
// =========================
router.put("/:roomId/code", authMiddleware, validateCodeUpdate, async (req, res) => {
  try {
    const { code, language } = req.body;

    let interview;

    if (isMongoConnected()) {
      interview = await Interview.findOneAndUpdate(
        { roomId: req.params.roomId },
        { code, language },
        { new: true }
      );
    } else {
      interview = memoryStore.updateInterview(req.params.roomId, { code, language });
    }

    if (!interview) {
      return res.status(404).json({ message: "Interview not found" });
    }

    res.json(interview);
  } catch (err) {
    console.error("Update code error:", err);
    res.status(500).json({ message: "Failed to update code" });
  }
});

// =========================
// Run Code
// =========================
router.post("/:roomId/run", authMiddleware, async (req, res) => {
  try {
    const { code, language, stdin } = req.body;

    const result = await runCodeOnJudge0(code, language, stdin);

    res.json({
      output:
        result.stdout ||
        result.stderr ||
        result.compile_output ||
        "No output",
      status: result.status || "Completed",
    });
  } catch (err) {
    console.error("Run code error:", err);
    res.status(500).json({ message: "Failed to run code" });
  }
});

// =========================
// Rate Interview
// =========================
router.post("/:roomId/rate", authMiddleware, validateRating, async (req, res) => {
  try {
    const { rating, feedback } = req.body;

    const interview = await Interview.findOneAndUpdate(
      { roomId: req.params.roomId },
      {
        rating,
        feedback,
        status: "completed",
        endTime: new Date(),
      },
      { new: true }
    )
      .populate("interviewer", "name email")
      .populate("candidate", "name email");

    if (!interview) {
      return res.status(404).json({ message: "Interview not found" });
    }

    res.json(interview);
  } catch (err) {
    console.error("Rate interview error:", err);
    res.status(500).json({ message: "Failed to rate interview" });
  }
});

export default router;