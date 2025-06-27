import express from "express";
import "dotenv/config";
//api build

import authRoutes from "./routes/authRoutes.js";
import { connectDB } from "./lib/db.js";
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use("/api/auth", authRoutes)

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    connectDB();
})