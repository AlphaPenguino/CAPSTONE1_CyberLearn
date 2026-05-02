import express from "express";
import { protectRoute, authorizeRole } from "../middleware/auth.middleware.js";
import QuickPlay from "../models/QuickPlay.js";

const router = express.Router();

const QUICK_PLAY_SLOT_COUNT = 3;
const QUICK_PLAY_PAIR_MIN = 4;
const QUICK_PLAY_PAIR_MAX = 8;

const stripImagePrefix = (value) =>
  typeof value === "string" && value.startsWith("__img__::")
    ? value.slice("__img__::".length)
    : value;

const normalizeContent = (value, fallbackText = "") => {
  if (value == null) {
    return { type: "text", text: fallbackText, uri: "" };
  }

  if (typeof value === "string") {
    if (value.startsWith("__img__::")) {
      return { type: "image", uri: stripImagePrefix(value), text: "" };
    }

    return { type: "text", text: value, uri: "" };
  }

  if (typeof value === "object") {
    const contentType = value.type || value.kind;
    if (contentType === "image") {
      return {
        type: "image",
        uri: stripImagePrefix(value.uri || value.imageUri || value.source || value.value || ""),
        text: "",
      };
    }

    if (contentType === "text") {
      return {
        type: "text",
        text: String(value.text || value.value || value.label || fallbackText || ""),
        uri: "",
      };
    }

    if (value.uri || value.imageUri || value.source) {
      return {
        type: "image",
        uri: stripImagePrefix(value.uri || value.imageUri || value.source || ""),
        text: "",
      };
    }

    if (value.text || value.value || value.label) {
      return {
        type: "text",
        text: String(value.text || value.value || value.label || fallbackText || ""),
        uri: "",
      };
    }
  }

  return { type: "text", text: String(value), uri: "" };
};

const normalizePair = (pair, index) => {
  if (!pair) return null;

  const definition = normalizeContent(
    pair.definition ?? pair.prompt ?? pair.question ?? pair.term ?? pair.left ?? pair.front,
    `Definition ${index + 1}`
  );
  const answer = normalizeContent(
    pair.answer ?? pair.match ?? pair.value ?? pair.right ?? pair.back ?? pair.definitionAnswer,
    `Answer ${index + 1}`
  );

  const definitionValid = definition.type === "image" ? Boolean(definition.uri) : Boolean(String(definition.text || "").trim());
  const answerValid = answer.type === "image" ? Boolean(answer.uri) : Boolean(String(answer.text || "").trim());

  if (!definitionValid || !answerValid) return null;

  return {
    id: String(pair.id || index + 1),
    title: pair.title || pair.label || `Pair ${index + 1}`,
    definition,
    answer,
  };
};

const toApiSlot = (doc) => ({
  id: doc._id.toString(),
  owner: doc.owner.toString(),
  slotNumber: doc.slotNumber,
  title: doc.title,
  description: doc.description,
  quizCode: doc.quizCode,
  timerSeconds: doc.timerSeconds,
  pairCount: doc.pairCount,
  pairs: doc.pairs,
  isActive: doc.isActive,
  updatedAt: doc.updatedAt,
  createdAt: doc.createdAt,
});

const generateQuizCode = (title, pairCount, timerSeconds) => {
  const base = `${title || "QP"}-${pairCount}-${timerSeconds}`
    .replace(/[^a-z0-9]+/gi, "")
    .toUpperCase();
  const prefix = (base.slice(0, 4) || "QP").padEnd(4, "X");
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${suffix}`;
};

const buildUniqueQuizCode = async (title, pairCount, timerSeconds, excludeId = null) => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const quizCode = generateQuizCode(title, pairCount, timerSeconds);
    const existing = await QuickPlay.findOne({
      quizCode,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    }).lean();
    if (!existing) return quizCode;
  }

  return `${generateQuizCode(title, pairCount, timerSeconds).slice(0, 9)}-${Date.now().toString(36).toUpperCase().slice(-4)}`;
};

const normalizeSavedPairs = (pairs) =>
  (Array.isArray(pairs) ? pairs : [])
    .map((pair, index) => normalizePair(pair, index))
    .filter(Boolean)
    .slice(0, QUICK_PLAY_PAIR_MAX);

const requireInstructorOrAdmin = authorizeRole(["instructor", "admin"]);

router.get("/slots", protectRoute, requireInstructorOrAdmin, async (req, res) => {
  try {
    const owner = req.user.id;
    const slots = await QuickPlay.find({ owner }).sort({ slotNumber: 1 }).lean();

    const normalizedSlots = Array.from({ length: QUICK_PLAY_SLOT_COUNT }, (_, index) => {
      const slotNumber = index + 1;
      const found = slots.find((slot) => slot.slotNumber === slotNumber);
      return (
        found || {
          owner,
          slotNumber,
          title: "Quick Play",
          description: "",
          quizCode: "",
          timerSeconds: 90,
          pairCount: 6,
          pairs: [],
          isActive: false,
        }
      );
    });

    return res.json({
      success: true,
      slots: normalizedSlots.map((slot) =>
        slot._id ? toApiSlot(slot) : { ...slot, id: null, createdAt: null, updatedAt: null }
      ),
    });
  } catch (error) {
    console.error("QuickPlay slots fetch failed:", error);
    return res.status(500).json({ success: false, message: "Failed to load Quick Play slots." });
  }
});

router.post("/slots", protectRoute, requireInstructorOrAdmin, async (req, res) => {
  try {
    const owner = req.user.id;
    const {
      slotNumber,
      title = "Quick Play",
      description = "",
      timerSeconds = 90,
      pairCount = 6,
      quizCode = "",
      pairs = [],
      isActive = true,
    } = req.body || {};

    const normalizedSlotNumber = Number(slotNumber);
    if (!Number.isInteger(normalizedSlotNumber) || normalizedSlotNumber < 1 || normalizedSlotNumber > QUICK_PLAY_SLOT_COUNT) {
      return res.status(400).json({ success: false, message: "slotNumber must be between 1 and 3." });
    }

    const normalizedPairs = normalizeSavedPairs(pairs);
    if (normalizedPairs.length < QUICK_PLAY_PAIR_MIN) {
      return res.status(400).json({
        success: false,
        message: "Quick Play tile sets must contain at least 4 valid pairs.",
      });
    }

    const normalizedTimer = Math.max(15, Math.min(3600, Number(timerSeconds) || 90));
    const normalizedPairCount = Math.max(
      QUICK_PLAY_PAIR_MIN,
      Math.min(QUICK_PLAY_PAIR_MAX, Number(pairCount) || normalizedPairs.length)
    );
    const finalPairs = normalizedPairs.slice(0, normalizedPairCount);
    const finalQuizCode = (quizCode || "").trim().toUpperCase() ||
      (await buildUniqueQuizCode(title, finalPairs.length, normalizedTimer));

    const updated = await QuickPlay.findOneAndUpdate(
      { owner, slotNumber: normalizedSlotNumber },
      {
        owner,
        slotNumber: normalizedSlotNumber,
        title: String(title).trim() || "Quick Play",
        description: String(description).trim(),
        timerSeconds: normalizedTimer,
        pairCount: finalPairs.length,
        quizCode: finalQuizCode,
        pairs: finalPairs,
        isActive: Boolean(isActive),
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    ).lean();

    return res.json({ success: true, slot: toApiSlot(updated) });
  } catch (error) {
    console.error("QuickPlay slot save failed:", error);
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "That quiz code or slot is already in use.",
      });
    }
    return res.status(500).json({ success: false, message: "Failed to save Quick Play slot." });
  }
});

router.get("/code/:quizCode", protectRoute, async (req, res) => {
  try {
    const quizCode = String(req.params.quizCode || "").trim().toUpperCase();
    if (!quizCode) {
      return res.status(400).json({ success: false, message: "quizCode is required." });
    }

    const slot = await QuickPlay.findOne({ quizCode, isActive: true }).lean();
    if (!slot) {
      return res.status(404).json({ success: false, message: "Quick Play set not found." });
    }

    return res.json({ success: true, slot: toApiSlot(slot) });
  } catch (error) {
    console.error("QuickPlay quizCode lookup failed:", error);
    return res.status(500).json({ success: false, message: "Failed to load Quick Play set." });
  }
});

export default router;