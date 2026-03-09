import express from "express";
import { nanoid } from "nanoid";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import Interview from "../models/Interview.js";
import User from "../models/User.js";
import Chat from "../models/Chat.js";

import authMiddleware from "../middleware/authMiddleware.js";
import { validateCodeUpdate, validateRating } from "../middleware/validationMiddleware.js";

import memoryStore from "../utils/memoryStore.js";
import { runCodeOnJudge0 } from "../utils/ai.js";

const router = express.Router();


// =========================
// MongoDB Connection Check
// =========================
const isMongoConnected = () => {
  return mongoose.connection.readyState === 1;
};


// =========================
// Helper: Create Interview Object
// =========================
const createInterviewObject = (data) => ({
  roomId: data.roomId,
  interviewer: data.interviewer,
  candidate: data.candidate,
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
      return res.status(400).json({
        message: "Candidate email is required"
      });
    }

    let candidateUser = await User.findOne({ email: candidateEmail });

    // Auto-create candidate if not exists
    if (!candidateUser) {

      const hashedPassword = await bcrypt.hash("tempPassword123", 10);

      candidateUser = await User.create({
        email: candidateEmail,
        role: "candidate",
        password: hashedPassword,
        name: candidateEmail.split("@")[0]
      });

    }

    const roomId = nanoid(12);

    const interviewData = createInterviewObject({
      roomId,
      interviewer: req.user.userId,
      candidate: candidateUser._id,
      language
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
      interviewId: savedInterview._id
    });

  } catch (err) {

    console.error("Create room error:", err);

    res.status(500).json({
      message: "Failed to create interview room"
    });

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
          { candidate: req.user.userId }
        ]
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

    res.status(500).json({
      message: "Failed to fetch interviews"
    });

  }

});


// =========================
// Get Interview By Room ID
// =========================
router.get("/room/:roomId", authMiddleware, async (req, res) => {

  try {

    let interview;

    if (isMongoConnected()) {

      interview = await Interview.findOne({
        roomId: req.params.roomId
      })
        .populate("interviewer", "name email")
        .populate("candidate", "name email");

    } else {

      interview = memoryStore.findInterviewByRoomId(req.params.roomId);

    }

    if (!interview) {

      return res.status(404).json({
        message: "Interview not found"
      });

    }

    res.json(interview);

  } catch (err) {

    console.error("Get interview error:", err);

    res.status(500).json({
      message: "Failed to fetch interview"
    });

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
        {
          code,
          language,
          updatedAt: new Date()
        },
        { new: true }
      );

    } else {

      interview = memoryStore.updateInterview(req.params.roomId, {
        code,
        language
      });

    }

    if (!interview) {

      return res.status(404).json({
        message: "Interview not found"
      });

    }

    res.json(interview);

  } catch (err) {

    console.error("Update code error:", err);

    res.status(500).json({
      message: "Failed to update code"
    });

  }

});


// =========================
// Run Code (Judge0)
// =========================
router.post("/:roomId/run", authMiddleware, async (req, res) => {

  try {

    const { code, language, stdin } = req.body;

    const result = await runCodeOnJudge0(code, language, stdin);

    const output =
      result?.stdout ||
      result?.stderr ||
      result?.compile_output ||
      result?.message ||
      "No output";

    res.json({
      output,
      status: result?.status?.description || "Completed"
    });

  } catch (err) {

    console.error("Run code error:", err);

    res.status(500).json({
      message: "Failed to run code"
    });

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
        endTime: new Date()
      },
      { new: true }
    )
      .populate("interviewer", "name email")
      .populate("candidate", "name email");

    if (!interview) {

      return res.status(404).json({
        message: "Interview not found"
      });

    }

    res.json(interview);

  } catch (err) {

    console.error("Rate interview error:", err);

    res.status(500).json({
      message: "Failed to rate interview"
    });

  }

});


// =========================
// End Interview
// =========================
router.post("/:roomId/end", authMiddleware, async (req, res) => {

  try {

    const interview = await Interview.findOneAndUpdate(
      { roomId: req.params.roomId },
      {
        status: "completed",
        endTime: new Date()
      },
      { new: true }
    );

    if (!interview) {

      return res.status(404).json({
        message: "Interview not found"
      });

    }

    res.json({
      message: "Interview ended successfully"
    });

  } catch (err) {

    console.error("End interview error:", err);

    res.status(500).json({
      message: "Failed to end interview"
    });

  }

});


// =========================
// Delete Interview
// =========================
router.delete("/:roomId", authMiddleware, async (req, res) => {

  try {

    const { roomId } = req.params;

    let deletedInterview;

    if (isMongoConnected()) {

      deletedInterview = await Interview.findOneAndDelete({ roomId });

    } else {

      deletedInterview = memoryStore.deleteInterview(roomId);

    }

    if (!deletedInterview) {

      return res.status(404).json({
        message: "Interview not found"
      });

    }

    res.json({
      message: "Interview deleted successfully"
    });

  } catch (err) {

    console.error("Delete interview error:", err);

    res.status(500).json({
      message: "Failed to delete interview"
    });

  }

});


export default router;