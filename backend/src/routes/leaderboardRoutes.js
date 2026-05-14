import express from "express";
import User from "../models/Users.js";

const router = express.Router();

const GAME_TYPES = ["quickplay", "digitalDefenders", "rainOfWords"];

// GET /api/leaderboard/other-games/top
// Returns the highest recorded score for each supported other-game
router.get("/other-games/top", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 5;

    const pipeline = [
      { $unwind: "$analytics.gameLog" },
      {
        $match: {
          privilege: "student",
          "analytics.gameLog.gameType": { $in: GAME_TYPES },
          "analytics.gameLog.score": { $type: "number" },
        },
      },
      {
        $sort: {
          "analytics.gameLog.gameType": 1,
          "analytics.gameLog.score": -1,
          "analytics.gameLog.completedAt": -1,
        },
      },
      {
        $group: {
          _id: {
            gameType: "$analytics.gameLog.gameType",
            userId: "$_id",
          },
          gameType: { $first: "$analytics.gameLog.gameType" },
          userId: { $first: "$_id" },
          username: { $first: "$username" },
          fullName: { $first: "$fullName" },
          profileImage: { $first: "$profileImage" },
          score: { $first: "$analytics.gameLog.score" },
          completedAt: { $first: "$analytics.gameLog.completedAt" },
        },
      },
      {
        $project: {
          _id: 0,
          gameType: 1,
          userId: 1,
          username: 1,
          fullName: 1,
          profileImage: 1,
          score: 1,
          completedAt: 1,
        },
      },
    ];

    const results = await User.aggregate(pipeline).exec();

    const grouped = GAME_TYPES.reduce((accumulator, gameType) => {
      accumulator[gameType] = [];
      return accumulator;
    }, {});

    for (const row of results) {
      if (!grouped[row.gameType]) {
        grouped[row.gameType] = [];
      }

      if (grouped[row.gameType].length < limit) {
        grouped[row.gameType].push({
          gameType: row.gameType,
          userId: row.userId,
          username: row.username,
          fullName: row.fullName,
          profileImage: row.profileImage,
          score: row.score,
          completedAt: row.completedAt,
        });
      }
    }

    return res.json({ success: true, data: grouped });
  } catch (err) {
    console.error("/api/leaderboard/other-games/top error:", err);
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
});

export default router;
