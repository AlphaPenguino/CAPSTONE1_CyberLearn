import express from "express";
import cors from "cors";
import "dotenv/config";
//api build

import authRoutes from "./routes/authRoutes.js";
import moduleRoutes from "./routes/moduleRoutes.js";
import { connectDB } from "./lib/db.js";
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

app.use("/api/auth", authRoutes);
app.use("/api/module", moduleRoutes);
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    connectDB();
})