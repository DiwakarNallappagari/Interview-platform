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


// ─────────────────────────────────────────────
// CORS — driven by FRONTEND_URL env var
// ─────────────────────────────────────────────

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

// Build the allowed-origins list from the env var
// (supports comma-separated list:  https://a.vercel.app,https://b.vercel.app)
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  ...FRONTEND_URL.split(',').map(u => u.trim()),
]

const corsOptions = {
  origin: function (origin, callback) {
    // allow server-side / mobile requests with no Origin header
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      // In production, log unknown origins but still allow (prevents 403 deploy surprises)
      console.warn(`⚠️  Unknown origin: ${origin}`)
      callback(null, true)
    }
  },
  credentials: true,
}


// ─────────────────────────────────────────────
// SOCKET.IO  — must reflect origin for credentials
// ─────────────────────────────────────────────

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  },
  // polling first so Render's proxy can upgrade to WS
  transports: ['polling', 'websocket'],
  // longer ping timeout for slow connections on free Render tier
  pingTimeout: 60000,
  pingInterval: 25000,
})


// ─────────────────────────────────────────────
// DATABASE
// ─────────────────────────────────────────────

connectDB()


// ─────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────

app.use(cors(corsOptions))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))


// ─────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────

app.use('/api/auth', authRoutes)
app.use('/api/interviews', interviewRoutes)


// ─────────────────────────────────────────────
// HEALTH CHECK  (used by keep-alive ping from frontend)
// ─────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
})


// ─────────────────────────────────────────────
// SOCKET HANDLERS
// ─────────────────────────────────────────────

initializeSocketHandlers(io)


// ─────────────────────────────────────────────
// ERROR HANDLER
// ─────────────────────────────────────────────

app.use((err, req, res, next) => {
  console.error(err)
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
  })
})


// ─────────────────────────────────────────────
// 404 HANDLER
// ─────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' })
})


// ─────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────

const PORT = process.env.PORT || 5000

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`   NODE_ENV   : ${process.env.NODE_ENV || 'development'}`)
  console.log(`   FRONTEND   : ${allowedOrigins.join(', ')}`)
})


export default app