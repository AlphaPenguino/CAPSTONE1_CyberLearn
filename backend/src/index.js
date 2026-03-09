import express from "express";
import cors from "cors";
import "dotenv/config";
import { createServer } from "http";
import { Server } from "socket.io";
import job from "./lib/cron.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// API routes
import authRoutes from "./routes/authRoutes.js";
import quizRoutes from "./routes/quizRoutes.js";
import moduleRoutes from "./routes/moduleRoutes.js";
import progressRoutes from "./routes/progressRoutes.js";
import sectionsRoutes from "./routes/sectionsRoutes.js";
import subjectsRoutes from "./routes/subjectsRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import cyberQuestRoutes from "./routes/cyberQuestRoutes.js";
import debugRoutes from "./routes/debugRoutes.js";
import knowledgeRelayRoutes from "./routes/knowledgeRelayRoutes.js";
import quizShowdownRoutes from "./routes/quizShowdownRoutes.js";
import digitalDefendersRoutes from "./routes/digitalDefendersRoutes.js";
import instructorRoutes from "./routes/instructorRoutes.js";
import { connectDB } from "./lib/db.js";
import { trackUserActivity } from "./middleware/analytics.middleware.js";
import { KnowledgeRelayQuestion } from "./models/KnowledgeRelayQuestion.js";
import { setGlobalKnowledgeRelayQuestions } from "./controllers/knowledgeRelayController.js";
import { initializeGameSocket } from "./controllers/gameController.js";
import { initializeKnowledgeRelaySocket } from "./controllers/knowledgeRelayController.js";
import { initializeQuizShowdownSocket } from "./controllers/quizShowdownController.js";
import { initializeDigitalDefendersSocket } from "./controllers/digitalDefendersController.js";

// Game initialization functions
import { DigitalDefendersQuestion } from "./models/DigitalDefenders.js";

// Global initialization function
async function initializeGlobalData() {
  try {
    // Check if global Digital Defenders questions exist
    const globalQuestions = await DigitalDefendersQuestion.countDocuments({
      section: null,
      isActive: true,
    });

    if (globalQuestions === 0) {
      console.log(
        "🌱 No global Digital Defenders questions found, auto-seeding..."
      );
      try {
        const { seedGlobalQuestions } = await import(
          "./scripts/seed-global-questions.js"
        );
        await seedGlobalQuestions();
        console.log(
          "✅ Global Digital Defenders questions seeded successfully"
        );
      } catch (seedError) {
        console.error(
          "❌ Error seeding global Digital Defenders questions:",
          seedError
        );
      }
    } else {
      console.log(
        `✅ Found ${globalQuestions} global Digital Defenders questions`
      );
    }
  } catch (error) {
    console.error("❌ Error during global data initialization:", error);
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Create HTTP server and Socket.IO instance
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: true, // Allow all origins for development
    // Include PATCH so archive endpoint works via Socket.IO transports if needed
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  },
});

job.start();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(
  cors({
    origin: true, // Allow all origins for development
    // Added PATCH to allow archive/unarchive endpoint
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: true,
    optionsSuccessStatus: 200, // For legacy browser support
  })
);

// Serve static files for uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Hello World route
app.get("/", (req, res) => {
  res.json({
    message: "Hello World! CL Backend is working! 🚀",
    timestamp: new Date().toISOString(),
    status: "success",
  });
});

app.get("/api/hello", (req, res) => {
  res.json({
    message: "Hello from the CL API! Backend is running successfully! 🎉",
    timestamp: new Date().toISOString(),
    status: "success",
  });
});

// Existing API routes
app.use("/api/auth", authRoutes);
app.use("/api/quiz", trackUserActivity, quizRoutes);
app.use("/api/modules", trackUserActivity, moduleRoutes);
app.use("/api/progress", trackUserActivity, progressRoutes);
app.use("/api/users", trackUserActivity, userRoutes);
app.use("/api/sections", trackUserActivity, sectionsRoutes);
app.use("/api/subjects", trackUserActivity, subjectsRoutes);
app.use("/api/admin", trackUserActivity, adminRoutes);
app.use("/api", trackUserActivity, cyberQuestRoutes);
app.use("/api/debug", debugRoutes);
app.use("/api/knowledge-relay", trackUserActivity, knowledgeRelayRoutes);
app.use("/api/quiz-showdown", trackUserActivity, quizShowdownRoutes);
app.use("/api/digital-defenders", trackUserActivity, digitalDefendersRoutes);
app.use("/api/instructor", trackUserActivity, instructorRoutes);

// Initialize Socket.IO game handlers
initializeGameSocket(io);
initializeKnowledgeRelaySocket(io);
initializeQuizShowdownSocket(io);
initializeDigitalDefendersSocket(io);

// Use server.listen instead of app.listen to support Socket.IO
server.listen(PORT, "0.0.0.0", async () => {
  console.log(`Server is running on port ${PORT}`);
  await connectDB();

  // Initialize Knowledge Relay global questions from DB if available
  try {
    const storedKRQuestions = await KnowledgeRelayQuestion.find({
      isActive: true,
    })
      .lean()
      .exec();
    if (storedKRQuestions.length > 0) {
      setGlobalKnowledgeRelayQuestions(
        storedKRQuestions.map((q) => ({
          id: q._id.toString(),
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          category: q.category,
          difficulty: q.difficulty,
          points: q.points,
        }))
      );
      console.log(
        `✅ Initialized Knowledge Relay global questions from database: ${storedKRQuestions.length} questions loaded.`
      );
    } else {
      console.log(
        "ℹ️ No persisted Knowledge Relay questions found. Using default in-memory seed questions."
      );
    }
  } catch (krInitErr) {
    console.error(
      "❌ Failed to initialize Knowledge Relay questions from database:",
      krInitErr
    );
  }

  // Initialize global data after database connection
  await initializeGlobalData();
});

// Ensure upload directories exist on startup
const uploadDirs = [
  path.join(process.cwd(), "src", "uploads", "user-profiles"),
];

uploadDirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});
