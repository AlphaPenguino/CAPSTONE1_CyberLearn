import express from "express"
import cors from "cors"
import "dotenv/config"
import { createServer } from "http"
import { Server } from "socket.io"
import job from "./lib/cron.js"

// API routes
import authRoutes from "./routes/authRoutes.js"
import quizRoutes from "./routes/quizRoutes.js"
import moduleRoutes from "./routes/moduleRoutes.js"
import progressRoutes from "./routes/progressRoutes.js"
import sectionsRoutes from "./routes/sectionsRoutes.js"
import userRoutes from "./routes/userRoutes.js"
import { connectDB } from "./lib/db.js"
import { initializeGameSocket } from "./controllers/gameController.js"

const app = express()
const PORT = process.env.PORT || 3000

// Create HTTP server and Socket.IO instance
const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
})

job.start()

app.use(express.json({ limit: "50mb" }))
app.use(express.urlencoded({ extended: true, limit: "50mb" }))
app.use(cors())

// Existing API routes
app.use("/api/auth", authRoutes)
app.use("/api/quiz", quizRoutes)
app.use("/api/modules", moduleRoutes)
app.use("/api/progress", progressRoutes)
app.use("/api/users", userRoutes)
app.use("/api/sections", sectionsRoutes)

// Initialize Socket.IO game handlers
initializeGameSocket(io);

// Use server.listen instead of app.listen to support Socket.IO
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
  connectDB()
})