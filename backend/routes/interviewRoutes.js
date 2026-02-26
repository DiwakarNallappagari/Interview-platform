import express from 'express'
import { nanoid } from 'nanoid'
import mongoose from 'mongoose'
import Interview from '../models/Interview.js'
import authMiddleware from '../middleware/authMiddleware.js'
import { validateCodeUpdate, validateRating } from '../middleware/validationMiddleware.js'
import memoryStore from '../utils/memoryStore.js'
import Chat from '../models/Chat.js'
import { runCodeOnJudge0, analyzeInterview } from '../utils/ai.js'

const router = express.Router()

// =========================
// MongoDB Check
// =========================
const isMongoConnected = () => {
  return mongoose.connection.readyState === 1
}

// =========================
// Helper to Create Interview Object
// =========================
const createInterviewObject = (data) => ({
  _id: data._id || data.roomId,
  roomId: data.roomId,
  interviewer: data.interviewer,
  candidate: data.candidate || null,
  code: data.code || '// Start coding here...\n',
  language: data.language || 'javascript',
  status: data.status || 'active',
  rating: data.rating || null,
  feedback: data.feedback || null,
  startTime: data.startTime || new Date(),
  endTime: data.endTime || null,
  createdAt: data.createdAt || new Date(),
  updatedAt: data.updatedAt || new Date(),
})

// =========================
// Create Interview Room
// =========================
router.post('/create-room', authMiddleware, async (req, res) => {
  try {
    const roomId = nanoid(12)

    const interviewData = createInterviewObject({
      roomId,
      interviewer: req.user.userId,
    })

    let savedInterview

    if (isMongoConnected()) {
      const interview = new Interview(interviewData)
      savedInterview = await interview.save()
    } else {
      savedInterview = memoryStore.saveInterview(interviewData)
    }

    res.status(201).json({
      roomId,
      interviewId: savedInterview._id
    })

  } catch (err) {
    console.error('Create room error:', err.message)
    res.status(500).json({ message: 'Failed to create interview room' })
  }
})

// =========================
// Get All Interviews
// =========================
router.get('/', authMiddleware, async (req, res) => {
  try {
    let interviews

    if (isMongoConnected()) {
      interviews = await Interview.find({
        $or: [
          { interviewer: req.user.userId },
          { candidate: req.user.userId },
        ],
      })
        .populate('interviewer', 'name email')
        .populate('candidate', 'name email')
        .sort({ createdAt: -1 })
    } else {
      interviews = memoryStore.findInterviewsByUserId(req.user.userId)
    }

    res.json(interviews)

  } catch (err) {
    console.error('Get interviews error:', err.message)
    res.status(500).json({ message: 'Failed to fetch interviews' })
  }
})

// =========================
// Get Interview By Room ID
// =========================
router.get('/room/:roomId', authMiddleware, async (req, res) => {
  try {
    let interview

    if (isMongoConnected()) {
      interview = await Interview.findOne({ roomId: req.params.roomId })
        .populate('interviewer', 'name email')
        .populate('candidate', 'name email')
    } else {
      interview = memoryStore.findInterviewByRoomId(req.params.roomId)
    }

    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' })
    }

    res.json(interview)

  } catch (err) {
    console.error('Get interview error:', err.message)
    res.status(500).json({ message: 'Failed to fetch interview' })
  }
})

// =========================
// Update Code
// =========================
router.put('/:roomId/code', authMiddleware, validateCodeUpdate, async (req, res) => {
  try {
    const { code, language } = req.body
    let interview

    if (isMongoConnected()) {
      interview = await Interview.findOneAndUpdate(
        { roomId: req.params.roomId },
        { code, language },
        { new: true }
      )
    } else {
      interview = memoryStore.updateInterview(req.params.roomId, { code, language })
    }

    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' })
    }

    res.json(interview)

  } catch (err) {
    console.error('Update code error:', err.message)
    res.status(500).json({ message: 'Failed to update code' })
  }
})

// =========================
// Run Code (Judge0 Multi-Language)
// =========================
router.post('/:roomId/run', authMiddleware, async (req, res) => {
  try {
    const { code, language, stdin } = req.body

    if (!code) {
      return res.status(400).json({ message: 'Code is required' })
    }

    if (!language) {
      return res.status(400).json({ message: 'Language is required' })
    }

    const result = await runCodeOnJudge0(code, language, stdin)

    res.json({
      output:
        result.stdout ||
        result.stderr ||
        result.compile_output ||
        "No output",
      status: result.status || "Completed"
    })

  } catch (err) {
    console.error('Run code error:', err.message)

    res.status(500).json({
      message: 'Failed to run code',
      error: err.message
    })
  }
})

// =========================
// AI Analysis
// =========================
router.post('/analyze', authMiddleware, async (req, res) => {
  try {
    const { transcript, code, language } = req.body

    if (!transcript && !code) {
      return res.status(400).json({
        message: 'Transcript or code required'
      })
    }

    const analysis = await analyzeInterview({ transcript, code, language })

    res.json({ analysis })

  } catch (err) {
    console.error('Analyze error:', err.message)
    res.status(500).json({
      message: 'Failed to analyze interview',
      error: err.message
    })
  }
})

// =========================
// Get Chat History
// =========================
router.get('/:roomId/chats', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params
    let chats

    if (isMongoConnected()) {
      chats = await Chat.find({ roomId }).sort({ createdAt: 1 })
    } else {
      chats = []
    }

    res.json(chats)

  } catch (err) {
    console.error('Get chats error:', err.message)
    res.status(500).json({ message: 'Failed to fetch chats' })
  }
})

// =========================
// Rate Interview
// =========================
router.post('/:roomId/rate', authMiddleware, validateRating, async (req, res) => {
  try {
    const { rating, feedback }
      = req.body

    let interview

    if (isMongoConnected()) {
      interview = await Interview.findOneAndUpdate(
        { roomId: req.params.roomId },
        {
          rating,
          feedback,
          status: 'completed',
          endTime: new Date(),
        },
        { new: true }
      )
        .populate('interviewer', 'name email')
        .populate('candidate', 'name email')
    } else {
      interview = memoryStore.updateInterview(req.params.roomId, {
        rating,
        feedback,
        status: 'completed',
        endTime: new Date(),
      })
    }

    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' })
    }

    res.json(interview)

  } catch (err) {
    console.error('Rate interview error:', err.message)
    res.status(500).json({ message: 'Failed to rate interview' })
  }
})

export default router
