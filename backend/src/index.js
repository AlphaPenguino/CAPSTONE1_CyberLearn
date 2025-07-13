import express from "express";
import cors from "cors";
import "dotenv/config";
import job from "./lib/cron.js";
//api build

import authRoutes from "./routes/authRoutes.js";
import quizRoutes from "./routes/quizRoutes.js"
import moduleRoutes from "./routes/moduleRoutes.js";
import { connectDB } from "./lib/db.js";
const app = express();
const PORT = process.env.PORT || 3000;

job.start();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cors());

app.use("/api/auth", authRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/modules", moduleRoutes);
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    connectDB();
})