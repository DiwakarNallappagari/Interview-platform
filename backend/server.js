import express from 'express'
import cors from 'cors'
import http from 'http'
import { Server } from 'socket.io'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { connectDB } from './config/db.js'
import authRoutes from './routes/authRoutes.js'
import interviewRoutes from './routes/interviewRoutes.js'
import { initializeSocketHandlers } from './socket/socketHandler.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '.env') })

const app = express()
const server = http.createServer(app)

// CORS configuration - allow ngrok and localhost
const corsOriginFunction = (origin, callback) => {
  // Allow requests with no origin (mobile apps, curl, etc)
  if (!origin) return callback(null, true)
  
  // Allow all localhost and 127.0.0.1 origins for development
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
    return callback(null, true)
  }
  
  const allowedOrigins = process.env.FRONTEND_URL 
    ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
    : ['http://localhost:5173', 'http://localhost:3000']
  
  // Allow ngrok domains
  if (origin.includes('.ngrok-free.app') || origin.includes('.ngrok.io') || origin.includes('.ngrok-free.dev')) {
    return callback(null, true)
  }
  
  // Check if origin is in allowed list
  if (allowedOrigins.includes(origin)) {
    return callback(null, true)
  }
  
  callback(new Error('Not allowed by CORS'))
}

const io = new Server(server, {
  cors: {
    origin: corsOriginFunction,
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})

// Connect to MongoDB
connectDB()

// Middleware
app.use(
  cors({
    origin: corsOriginFunction,
    credentials: true,
  })
)
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`)
  next()
})

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/interviews', interviewRoutes)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

// Serve frontend build (production / remote access)
const frontendDistPath = path.join(__dirname, '../frontend/dist')
app.use(express.static(frontendDistPath))

// For any non-API route, serve the React app
app.get('*', (req, res, next) => {
  // Let API and health routes continue down the middleware chain
  if (req.path.startsWith('/api') || req.path === '/health') {
    return next()
  }

  return res.sendFile(path.join(frontendDistPath, 'index.html'))
})

// Initialize Socket.io handlers
initializeSocketHandlers(io)

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err)
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
  })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' })
})

// Start server
const PORT = process.env.PORT || 5000
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📝 MongoDB: ${process.env.MONGODB_URI || 'localhost:27017'}`)
  console.log(`🔗 CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`)
})

export default app
