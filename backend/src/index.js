import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { createServer } from "http";

function ensureIconvLiteHelper() {
  const helperPath = path.join(
    process.cwd(),
    "node_modules",
    "iconv-lite",
    "lib",
    "helpers",
    "merge-exports.js"
  );

  if (fs.existsSync(helperPath)) {
    return;
  }

  fs.mkdirSync(path.dirname(helperPath), { recursive: true });
  fs.writeFileSync(
    helperPath,
    '"use strict"\n\nvar hasOwn = typeof Object.hasOwn === "undefined" ? Function.call.bind(Object.prototype.hasOwnProperty) : Object.hasOwn\n\nfunction mergeModules (target, module) {\n  for (var key in module) {\n    if (hasOwn(module, key)) {\n      target[key] = module[key]\n    }\n  }\n}\n\nmodule.exports = mergeModules\n',
    "utf8"
  );
}

ensureIconvLiteHelper();

await import("dotenv/config");

const [
  { default: express },
  { default: cors },
  { Server },
  { default: job },
  { default: authRoutes },
  { default: quizRoutes },
  { default: moduleRoutes },
  { default: progressRoutes },
  { default: sectionsRoutes },
  { default: subjectsRoutes },
  { default: userRoutes },
  { default: adminRoutes },
  { default: cyberQuestRoutes },
  { default: debugRoutes },
  { default: knowledgeRelayRoutes },
  { default: quizShowdownRoutes },
  { default: digitalDefendersRoutes },
  { default: instructorRoutes },
  { default: quickplayRoutes },
  { default: rpsRoutes },
  { default: rainOfWordsRoutes },
  { connectDB },
  { trackUserActivity },
  { KnowledgeRelayQuestion },
  { setGlobalKnowledgeRelayQuestions },
  { initializeGameSocket },
  { initializeKnowledgeRelaySocket },
  { initializeQuizShowdownSocket },
  { initializeDigitalDefendersSocket },
  { initializeRpsSocket },
  { initializeRainOfWordsSocket },
  { DigitalDefendersQuestion },
] = await Promise.all([
  import("express"),
  import("cors"),
  import("socket.io"),
  import("./lib/cron.js"),
  import("./routes/authRoutes.js"),
  import("./routes/quizRoutes.js"),
  import("./routes/moduleRoutes.js"),
  import("./routes/progressRoutes.js"),
  import("./routes/sectionsRoutes.js"),
  import("./routes/subjectsRoutes.js"),
  import("./routes/userRoutes.js"),
  import("./routes/adminRoutes.js"),
  import("./routes/cyberQuestRoutes.js"),
  import("./routes/debugRoutes.js"),
  import("./routes/knowledgeRelayRoutes.js"),
  import("./routes/quizShowdownRoutes.js"),
  import("./routes/digitalDefendersRoutes.js"),
  import("./routes/instructorRoutes.js"),
  import("./routes/quickplayRoutes.js"),
  import("./routes/rpsRoutes.js"),
  import("./routes/rainOfWordsRoutes.js"),
  import("./lib/db.js"),
  import("./middleware/analytics.middleware.js"),
  import("./models/KnowledgeRelayQuestion.js"),
  import("./controllers/knowledgeRelayController.js"),
  import("./controllers/gameController.js"),
  import("./controllers/knowledgeRelayController.js"),
  import("./controllers/quizShowdownController.js"),
  import("./controllers/digitalDefendersController.js"),
  import("./controllers/rpsController.js"),
  import("./controllers/rainOfWordsController.js"),
  import("./models/DigitalDefenders.js"),
]);

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

// Global process-level error handlers to avoid unhandled crashes and improve logging
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err && err.stack ? err.stack : err);
  // Keep process alive for debugging; in production you might restart the process manager
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// HTTP server error listener to handle listen errors (EADDRINUSE, EACCES, etc.)
server.on("error", (err) => {
  console.error("HTTP Server Error:", err && err.stack ? err.stack : err);
  if (err && err.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use.`);
    // exit so a supervisor (pm2/systemd) can restart or the developer can investigate
    process.exit(1);
  }
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
app.use("/api/quickplay", trackUserActivity, quickplayRoutes);
app.use("/api/rps", trackUserActivity, rpsRoutes);
app.use("/api/rain-of-words", trackUserActivity, rainOfWordsRoutes);

// Initialize Socket.IO game handlers
initializeGameSocket(io);
initializeKnowledgeRelaySocket(io);
initializeQuizShowdownSocket(io);
initializeDigitalDefendersSocket(io);
initializeRpsSocket(io);
initializeRainOfWordsSocket(io);

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
