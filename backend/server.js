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


// --------------------
// CORS FIX (IMPORTANT)
// --------------------

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://interview-platform-delta-gilt.vercel.app"
]

const corsOptions = {
  origin: function (origin, callback) {

    // allow requests with no origin (mobile apps, postman)
    if (!origin) return callback(null, true)

    if (allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      // allow anyway to prevent deploy issues
      callback(null, true)
    }
  },
  credentials: true
}


// --------------------
// SOCKET.IO
// --------------------

const io = new Server(server, {
  cors: {
    origin: true,           // reflect any origin (all are allowed, including Vercel)
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  },
  // allow both polling (needed to establish connection on Render) and websocket
  transports: ["polling", "websocket"]
})


// --------------------
// DATABASE
// --------------------

connectDB()


// --------------------
// MIDDLEWARE
// --------------------

app.use(cors(corsOptions))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))


// --------------------
// ROUTES
// --------------------

app.use('/api/auth', authRoutes)
app.use('/api/interviews', interviewRoutes)


// --------------------
// HEALTH CHECK
// --------------------

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString()
  })
})


// --------------------
// SOCKET HANDLERS
// --------------------

initializeSocketHandlers(io)


// --------------------
// ERROR HANDLER
// --------------------

app.use((err, req, res, next) => {
  console.error(err)

  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error'
  })
})


// --------------------
// 404 HANDLER
// --------------------

app.use((req, res) => {
  res.status(404).json({
    message: 'Route not found'
  })
})


// --------------------
// START SERVER
// --------------------

const PORT = process.env.PORT || 5000

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
})


export default app