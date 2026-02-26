import express from 'express'
import jwt from 'jsonwebtoken'
import bcryptjs from 'bcryptjs'
import mongoose from 'mongoose'
import User from '../models/User.js'
import authMiddleware from '../middleware/authMiddleware.js'
import memoryStore from '../utils/memoryStore.js'

const router = express.Router()

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'your_secret_key', {
    expiresIn: '7d',
  })
}

const isMongoConnected = () => {
  return mongoose.connection.readyState === 1
}

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body

    // Validate input
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'All fields are required' })
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' })
    }

    const emailLower = String(email).trim().toLowerCase()
    let userExists
    if (isMongoConnected()) {
      userExists = await User.findOne({ email: emailLower })
    } else {
      userExists = memoryStore.findUserByEmail(emailLower)
    }

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' })
    }

    const userId = `user_${Date.now()}`

    let user
    if (isMongoConnected()) {
      // Don't hash here - User model pre-save hook handles it
      const newUser = new User({ name, email: emailLower, password, role })
      user = await newUser.save()
    } else {
      // Hash password for memory store (no model hook)
      const hashedPassword = await bcryptjs.hash(password, 10)
      user = memoryStore.saveUser(userId, {
        name,
        email: emailLower,
        password: hashedPassword,
        role,
      })
    }

    // Generate token
    const token = generateToken(user._id)

    res.status(201).json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    })
  } catch (err) {
    console.error('Register error:', err.message)
    // Duplicate email (MongoDB unique index)
    if (err.code === 11000 || err.message?.includes('duplicate key')) {
      return res.status(400).json({ message: 'User already exists' })
    }
    // Validation error
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message || 'Invalid input' })
    }
    res.status(500).json({
      message: err.message || 'Failed to register user',
    })
  }
})

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' })
    }

    const emailLower = String(email).trim().toLowerCase()
    let user
    if (isMongoConnected()) {
      user = await User.findOne({ email: emailLower })
    } else {
      user = memoryStore.findUserByEmail(emailLower)
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    // Check password
    const isMatch = await bcryptjs.compare(password, user.password)
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    // Generate token
    const token = generateToken(user._id)

    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    })
  } catch (err) {
    console.error('Login error:', err.message)
    res.status(500).json({ message: 'Failed to login' })
  }
})

// Get current user
router.get('/me', authMiddleware, async (req, res) => {
  try {
    let user
    if (isMongoConnected()) {
      user = await User.findById(req.user.userId)
    } else {
      user = memoryStore.getUser(req.user.userId)
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    })
  } catch (err) {
    console.error('Get user error:', err.message)
    res.status(500).json({ message: 'Failed to fetch user' })
  }
})

export default router
