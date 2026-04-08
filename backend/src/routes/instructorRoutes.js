import express from "express";
import User from "../models/Users.js";
import Progress from "../models/Progress.js";
import Quiz from "../models/Quiz.js";
import Section from "../models/Section.js";
import { protectRoute, authorizeRole } from "../middleware/auth.middleware.js";
import {
  logActivity,
  AUDIT_ACTIONS,
  AUDIT_RESOURCES,
  extractRequestInfo,
} from "../lib/auditLogger.js";

const router = express.Router();

/**
 * @route   GET /api/instructor/analytics/students
 * @desc    Get per-student performance analytics for an instructor (or admin)
 * @query   section (optional) - filter students by section name
 * @query   subjectId (optional) - filter by enrolled subject
 * @access  Private (Instructor/Admin)
 * @returns {
 *  success: boolean,
 *  data: {
 *    summary: { totalStudents, averageScore, totalGames },
 *    students: [
 *      {
 *        id, studentName, email, section,
 *        gamesPlayed, totalScore, averageScore, completionRate,
 *        timeSpent, lastActivity
 *      }
 *    ]
 *  }
 * }
 */
router.get(
  "/analytics/students",
  protectRoute,
  authorizeRole(["instructor", "admin"]),
  async (req, res) => {
    try {
      const { section, subjectId } = req.query;
      const userRole = req.user?.privilege;
      const userId = req.user?.id;

      const normalizedSubjectId =
        typeof subjectId === "string" && subjectId.trim()
          ? subjectId.trim()
          : null;

      if (
        normalizedSubjectId &&
        !/^[0-9a-fA-F]{24}$/.test(normalizedSubjectId)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid subjectId format",
        });
      }

      // Resolve which student IDs are accessible to the requesting role.
      let scopedStudentIds = null;
      let selectedSubjectName = "all_subjects";

      if (normalizedSubjectId) {
        const subjectQuery = {
          _id: normalizedSubjectId,
          archived: { $ne: true },
          isActive: { $ne: false },
        };

        if (userRole === "instructor") {
          subjectQuery.$or = [{ instructor: userId }, { instructors: userId }];
        }

        const selectedSubject = await Section.findOne(subjectQuery)
          .select("_id name students")
          .lean();

        if (!selectedSubject) {
          return res.status(userRole === "admin" ? 404 : 403).json({
            success: false,
            message:
              userRole === "admin"
                ? "Subject not found"
                : "You do not have access to this subject",
          });
        }

        selectedSubjectName = selectedSubject.name || "selected_subject";
        scopedStudentIds = Array.isArray(selectedSubject.students)
          ? [...new Set(selectedSubject.students.map((id) => id.toString()))]
          : [];
      } else if (userRole === "instructor") {
        const instructorSubjects = await Section.find({
          $or: [{ instructor: userId }, { instructors: userId }],
          archived: { $ne: true },
          isActive: { $ne: false },
        })
          .select("students")
          .lean();

        const uniqueStudentIds = new Set();
        instructorSubjects.forEach((subjectDoc) => {
          (subjectDoc.students || []).forEach((studentId) => {
            uniqueStudentIds.add(studentId.toString());
          });
        });

        scopedStudentIds = [...uniqueStudentIds];
      }

      // Fetch students (optionally filter by section)
      const userFilter = { privilege: "student" };
      if (section) userFilter.section = section;
      if (Array.isArray(scopedStudentIds)) {
        userFilter._id = { $in: scopedStudentIds };
      }

      const normalizedSelectedSubjectName =
        typeof selectedSubjectName === "string" && selectedSubjectName.trim()
          ? selectedSubjectName.trim().toLowerCase()
          : null;
      const isObjectIdLike = (value) =>
        typeof value === "string" && /^[0-9a-fA-F]{24}$/.test(value.trim());
      const normalizeSubjectId = (value) => {
        if (!value) return null;
        if (typeof value === "string") {
          const trimmed = value.trim();
          return trimmed || null;
        }
        if (typeof value === "object" && value?.toString) {
          const parsed = value.toString().trim();
          return parsed || null;
        }
        return null;
      };
      const normalizeSubjectName = (value) =>
        typeof value === "string" && value.trim()
          ? value.trim().toLowerCase()
          : null;
      const matchesSelectedSubject = (subjectIdCandidate, subjectNameCandidate) => {
        if (!normalizedSubjectId) return true;

        const normalizedCandidateId = normalizeSubjectId(subjectIdCandidate);
        if (normalizedCandidateId === normalizedSubjectId) return true;

        const normalizedCandidateName = normalizeSubjectName(subjectNameCandidate);
        if (
          normalizedCandidateName &&
          normalizedSelectedSubjectName &&
          normalizedCandidateName === normalizedSelectedSubjectName
        ) {
          return true;
        }

        return false;
      };

      const students = await User.find(userFilter)
        // Include gamification for leaderboard-style combined score
        .select("_id fullName email section analytics gamification")
        .lean();

      if (!students.length) {
        return res.json({
          success: true,
          data: {
            summary: { totalStudents: 0, averageScore: 0, totalGames: 0 },
            students: [],
          },
        });
      }

      // Fetch all progress docs in one query
      const progressDocs = await Progress.find({
        user: { $in: students.map((s) => s._id) },
      })
        .select(
          "user moduleProgress.completedQuizzes quizAttempts.completedAt quizAttempts.score quizAttempts.timeSpent quizAttempts.quiz quizAttempts.module cyberQuestProgress.cyberQuest cyberQuestProgress.attempts cyberQuestProgress.bestScore cyberQuestProgress.lastAttemptAt moduleProgress.unlockedQuizzes"
        )
        .lean();

      // Fetch all UserLevel docs for these students to compute level-based points for combinedScore
      const UserLevel = await import("../models/UserLevel.js").then(
        (m) => m.default
      );
      const userLevels = await UserLevel.find({
        user: { $in: students.map((s) => s._id) },
      })
        .select("user maxLevelReached totalXPEarned")
        .lean();
      const userLevelsMap = new Map();
      for (const ul of userLevels) {
        const key = ul.user.toString();
        if (!userLevelsMap.has(key)) userLevelsMap.set(key, []);
        userLevelsMap.get(key).push(ul);
      }

      const progressMap = new Map();
      for (const p of progressDocs) progressMap.set(p.user.toString(), p);

      // Collect all quiz IDs from all attempts to fetch details in one go
      const allQuizIds = progressDocs.flatMap(
        (p) => p.quizAttempts?.map((qa) => qa.quiz) || []
      );
      const allCyberQuestIds = progressDocs.flatMap(
        (p) => p.cyberQuestProgress?.map((cqp) => cqp.cyberQuest) || []
      );
      const uniqueQuizIds = [...new Set(allQuizIds.filter(Boolean))];
      const uniqueCyberQuestIds = [
        ...new Set(allCyberQuestIds.filter(Boolean)),
      ];

      // Fetch both regular quizzes and cyber quests
      const quizzes = await Quiz.find({ _id: { $in: uniqueQuizIds } })
        .select("_id title subject")
        .lean();

      // Import and fetch cyber quests
      const CyberQuest = await import("../models/CyberQuest.js").then(
        (m) => m.default
      );
      const cyberQuests = await CyberQuest.find({
        _id: { $in: uniqueCyberQuestIds },
      })
        .select("_id title subject level questions")
        .lean();

      // Merge both types into a single map
      const quizMap = new Map();
      quizzes.forEach((q) => quizMap.set(q._id.toString(), q));
      cyberQuests.forEach((cq) => quizMap.set(cq._id.toString(), cq)); // No recent game results are collected/returned

      // First pass: compute raw stats & collect quiz ids needed
      const studentStats = students.map((stu) => {
        const prog = progressMap.get(stu._id.toString());
        const analytics = stu.analytics || {};
        const analyticsLastActivityTs = analytics.lastActivity
          ? new Date(analytics.lastActivity).getTime()
          : null;
        const toNum = (value) => {
          if (typeof value === "number") return value;
          if (typeof value === "string" && value.trim()) {
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : null;
          }
          return null;
        };

        // We will derive gamesPlayed strictly from CyberQuest attempts (map-only)
        let gamesPlayed = 0;
        let totalScore = 0;
        let scoreCount = 0;
        let completionRate = 0;
        let totalUnlocked = 0;
        // Time spent comes from persisted analytics plus any ongoing session time
        const baseTime = analytics.totalTimeSpent || 0; // minutes (persisted)
        const ongoingMinutes = analytics.currentSessionStart
          ? (() => {
              const nowMs = Date.now();
              const startMs = new Date(analytics.currentSessionStart).getTime();
              // Cap by inactivity window of 30 minutes from lastActivity if available
              const INACTIVITY_MS = 30 * 60 * 1000;
              const activeWindowEnd = analyticsLastActivityTs
                ? Math.min(nowMs, analyticsLastActivityTs + INACTIVITY_MS)
                : nowMs;
              const effectiveMs = Math.max(0, activeWindowEnd - startMs);
              return Math.floor(effectiveMs / (1000 * 60));
            })()
          : 0;
        let timeSpentMinutes = baseTime + ongoingMinutes;
        let lastActivity = analytics.lastActivity || null;
        // recentAttempts removed
        const gameHistory = [];
        const cyberQuestHistory = [];
        const cyberQuestLogHistory = [];

        // If we have progress data, also count from there (for backward compatibility)
        if (prog) {
          // Completed quizzes from moduleProgress (older system)
          const completedQuizzes = (prog.moduleProgress || []).flatMap(
            (mp) => mp.completedQuizzes || []
          );
          // Legacy quizzes no longer contribute to gamesPlayed count (CyberQuest only)

          for (const cq of completedQuizzes) {
            if (typeof cq.score === "number") {
              totalScore += cq.score;
              scoreCount++;
            }
            if (
              cq.completedAt &&
              (!lastActivity || cq.completedAt > lastActivity)
            ) {
              lastActivity = cq.completedAt;
            }
            const quizInfo = quizMap.get(cq.quiz?.toString());
            gameHistory.push({
              id:
                cq.quiz?.toString() ||
                `cq-${new Date(cq.completedAt).getTime()}`,
              title: quizInfo?.title || "Legacy Quiz",
              subject: quizInfo?.subject || "N/A",
              score: cq.score,
              completedAt: cq.completedAt,
            });
          }

          // Unlocked quizzes for completion rate denominator
          totalUnlocked = (prog.moduleProgress || []).reduce(
            (acc, mp) =>
              acc + (mp.unlockedQuizzes ? mp.unlockedQuizzes.length : 0),
            0
          );

          // Attempts for additional time spent & recent games (current system)
          const attempts = prog.quizAttempts || [];
          let attemptSecondsSum = 0;
          // Add EVERY attempt (no de-duplication) so instructors can see full history
          attempts.forEach((att, idx) => {
            if (att.timeSpent) attemptSecondsSum += att.timeSpent; // seconds
            if (
              att.completedAt &&
              (!lastActivity || att.completedAt > lastActivity)
            ) {
              lastActivity = att.completedAt;
            }

            const quizId = att.quiz?.toString();
            const quizInfo = quizId ? quizMap.get(quizId) : null;
            if (quizInfo) {
              // Ensure unique id per attempt by appending timestamp/index
              const attemptStamp = att.completedAt
                ? new Date(att.completedAt).getTime()
                : Date.now() + idx; // fallback to avoid collisions
              gameHistory.push({
                id: `${quizId}-${attemptStamp}`,
                title: quizInfo.title,
                subject: quizInfo.subject || "N/A",
                score: att.score,
                completedAt: att.completedAt || new Date().toISOString(),
              });
            }
          });

          // If no analytics/session time, fall back to attempts-derived time (seconds -> minutes)
          if (!timeSpentMinutes && attemptSecondsSum > 0) {
            timeSpentMinutes = Math.round(attemptSecondsSum / 60);
          }

          // Add cyber quest progress to game history
          const cyberQuestProgress = prog.cyberQuestProgress || [];
          for (const cqp of cyberQuestProgress) {
            const cyberQuestId = cqp.cyberQuest?.toString();
            const cyberQuestInfo = cyberQuestId
              ? quizMap.get(cyberQuestId)
              : null;
            const resolvedQuestInfo = cyberQuestInfo || {
              title: "CyberQuest",
              subject: "N/A",
              level: null,
            };
            const resolvedSubjectId = normalizeSubjectId(resolvedQuestInfo.subject);
            const hasResolvedSubjectSignal = !!resolvedSubjectId;
            if (
              normalizedSubjectId &&
              hasResolvedSubjectSignal &&
              !matchesSelectedSubject(resolvedSubjectId, null)
            ) {
              continue;
            }
            if (cyberQuestId) {
              // Push EACH attempt (if attempts array exists) otherwise fallback to bestScore summary
               if (Array.isArray(cqp.attempts) && cqp.attempts.length) {
                 cqp.attempts.forEach((attempt, idx) => {
                   const attemptStamp = attempt.completedAt
                     ? new Date(attempt.completedAt).getTime()
                     : Date.now() + idx;
                   const derivedTotal =
                     toNum(attempt.totalQuestions) ??
                     (Array.isArray(attempt.answers)
                       ? attempt.answers.length
                       : Array.isArray(resolvedQuestInfo.questions)
                       ? resolvedQuestInfo.questions.length
                       : null);
                   const derivedCorrect =
                     toNum(attempt.correctAnswers) ??
                     (Array.isArray(attempt.answers)
                       ? attempt.answers.filter((a) => a.isCorrect).length
                      : typeof derivedTotal === "number" &&
                        typeof toNum(attempt.score) === "number"
                      ? Math.max(
                          Math.min(
                            Math.round((toNum(attempt.score) / 100) * derivedTotal),
                            derivedTotal
                          ),
                          0
                        )
                       : null);
                   const derivedIncorrect =
                     toNum(attempt.incorrectAnswers) ??
                     (typeof derivedTotal === "number" &&
                     typeof derivedCorrect === "number"
                       ? Math.max(derivedTotal - derivedCorrect, 0)
                       : null);

                   cyberQuestHistory.push({
                     id: `${cyberQuestId}-attempt-${attemptStamp}`,
                     title: resolvedQuestInfo.title,
                     subjectId: resolvedSubjectId || normalizedSubjectId || null,
                     subject:
                       resolvedQuestInfo.subject ||
                       (normalizedSubjectId ? selectedSubjectName : "N/A"),
                     score: toNum(attempt.score) ?? toNum(cqp.bestScore) ?? 0,
                     completedAt:
                       attempt.completedAt ||
                       attempt.startedAt ||
                       cqp.lastAttemptAt ||
                       new Date().toISOString(),
                     type: "cyberQuest",
                     level: toNum(attempt.level) ?? toNum(resolvedQuestInfo.level),
                     totalQuestions: derivedTotal,
                     correctAnswers: derivedCorrect,
                     incorrectAnswers: derivedIncorrect,
                   });
                 });
               } else if (cqp.bestScore > 0) {
                 // Preserve a single summary entry if no granular attempts exist
                 const attemptStamp = cqp.lastAttemptAt
                   ? new Date(cqp.lastAttemptAt).getTime()
                   : Date.now();
                 cyberQuestHistory.push({
                   id: `${cyberQuestId}-best-${attemptStamp}`,
                   title: resolvedQuestInfo.title,
                   subjectId: resolvedSubjectId || normalizedSubjectId || null,
                   subject:
                     resolvedQuestInfo.subject ||
                     (normalizedSubjectId ? selectedSubjectName : "N/A"),
                   score: toNum(cqp.bestScore),
                   completedAt: cqp.lastAttemptAt || new Date().toISOString(),
                   type: "cyberQuest",
                   level: toNum(resolvedQuestInfo.level),
                   totalQuestions: Array.isArray(resolvedQuestInfo.questions)
                    ? resolvedQuestInfo.questions.length
                    : null,
                  correctAnswers:
                    Array.isArray(resolvedQuestInfo.questions) &&
                    typeof toNum(cqp.bestScore) === "number"
                      ? Math.max(
                          Math.min(
                            Math.round(
                              (toNum(cqp.bestScore) / 100) *
                                resolvedQuestInfo.questions.length
                            ),
                            resolvedQuestInfo.questions.length
                          ),
                          0
                        )
                      : null,
                  incorrectAnswers:
                    Array.isArray(resolvedQuestInfo.questions) &&
                    typeof toNum(cqp.bestScore) === "number"
                      ? Math.max(
                          resolvedQuestInfo.questions.length -
                            Math.max(
                              Math.min(
                                Math.round(
                                  (toNum(cqp.bestScore) / 100) *
                                    resolvedQuestInfo.questions.length
                                ),
                                resolvedQuestInfo.questions.length
                              ),
                              0
                            ),
                          0
                        )
                      : null,
                 });
               }
            }
          }
        }

        // Merge in unified gameLog (covers quickplay, knowledgeRelay, quizShowdown, digitalDefenders, cyberQuest, quiz)
        if (Array.isArray(analytics.gameLog)) {
          analytics.gameLog.forEach((log, idx) => {
            const stamp = log.completedAt
              ? new Date(log.completedAt).getTime()
              : Date.now() + idx;
            const gameType = log.gameType || "game";
            const meta = log.meta || {};
            const rawTitle =
              log.title ||
              meta.title ||
              meta.cyberQuestTitle ||
              meta.questTitle ||
              `${gameType} play`;
            const isGenericTitle =
              rawTitle === `${gameType} game` ||
              rawTitle === `${gameType} play`;
             // Skip generic placeholders for quiz & cyberQuest (already represented by detailed progress attempts)
             if (
               isGenericTitle &&
               (gameType === "quiz" || gameType === "cyberQuest")
             ) {
               return;
             }

             const toNum = (v) =>
               typeof v === "number" ? v :
               typeof v === "string" && v.trim() ? Number(v) || null :
               null;

             if (gameType === "cyberQuest") {
               const completedAt = log.completedAt || new Date().toISOString();
               const metaSubjectIdSource =
                 meta.subjectId ||
                 meta.sectionId ||
                 meta.subject?.id ||
                 meta.subject?._id ||
                 meta?.result?.subjectId ||
                 meta?.result?.sectionId;
               const metaSubjectCandidate =
                 typeof meta.subject === "string" ? meta.subject : null;
               const metaSubjectName =
                 metaSubjectCandidate && !isObjectIdLike(metaSubjectCandidate)
                   ? metaSubjectCandidate
                   : typeof meta.subjectName === "string"
                   ? meta.subjectName
                   : typeof meta?.result?.subjectName === "string"
                   ? meta?.result?.subjectName
                   : null;
               const parsedMetaSubjectId = normalizeSubjectId(metaSubjectIdSource);
               const metaSubjectId = isObjectIdLike(parsedMetaSubjectId)
                 ? parsedMetaSubjectId
                 : isObjectIdLike(metaSubjectCandidate)
                 ? metaSubjectCandidate.trim()
                 : null;
               const hasMetaSubjectSignal = !!(metaSubjectId || metaSubjectName);
               if (
                 normalizedSubjectId &&
                 hasMetaSubjectSignal &&
                 !matchesSelectedSubject(metaSubjectId, metaSubjectName)
               ) {
                 return;
               }
               const level =
                 toNum(meta.level) ??
                 toNum(meta.questLevel) ??
                 toNum(meta?.result?.level) ??
                 toNum(meta?.result?.questLevel);
               const totalQuestions =
                 toNum(meta.totalQuestions) ??
                 toNum(meta?.result?.totalQuestions);
               const correctAnswers =
                 toNum(meta.correctAnswers) ??
                 toNum(meta?.result?.correctAnswers);
               const incorrectAnswers =
                 toNum(meta.incorrectAnswers) ??
                 (typeof totalQuestions === "number" &&
                 typeof correctAnswers === "number"
                   ? Math.max(totalQuestions - correctAnswers, 0)
                   : null);

               cyberQuestLogHistory.push({
                 id: `alog-cq-${stamp}-${idx}`,
                 title: rawTitle,
                 subjectId: metaSubjectId || normalizedSubjectId || null,
                 subject:
                   metaSubjectName ||
                   (normalizedSubjectId ? selectedSubjectName : "N/A"),
                 score:
                   typeof log.score === "number"
                     ? log.score
                     : toNum(meta.score) ?? toNum(meta?.result?.score) ?? 0,
                 completedAt,
                 type: "cyberQuest",
                 level,
                 levelTitle: meta.levelTitle || meta.questLevelTitle,
                 totalQuestions,
                 correctAnswers,
                 incorrectAnswers,
               });
             }

              gameHistory.push({
               id: `alog-${stamp}-${gameType}`,
               title: rawTitle,
               subject:
                 gameType === "cyberQuest"
                   ? meta.subjectName || meta.subject || "N/A"
                   : gameType,
               subjectId:
                 gameType === "cyberQuest"
                   ? normalizeSubjectId(
                       meta.subjectId ||
                         meta.sectionId ||
                         meta.subject?.id ||
                         meta.subject?._id
                     )
                   : null,
               score: typeof log.score === "number" ? log.score : toNum(meta.score),
               completedAt: log.completedAt || new Date().toISOString(),
               type: gameType,
             });
          });
        }

        // Backfill CyberQuest history from analytics gameLog for legacy users without progress entries.
        if (!cyberQuestHistory.length && cyberQuestLogHistory.length) {
          cyberQuestHistory.push(...cyberQuestLogHistory);
        }

        const averageScore = scoreCount
          ? +(totalScore / scoreCount).toFixed(1)
          : 0;

        // Only calculate completion rate if we have unlocked quizzes
        if (totalUnlocked > 0) {
          const completedCount = prog
            ? (prog.moduleProgress || []).flatMap(
                (mp) => mp.completedQuizzes || []
              ).length
            : 0;
          completionRate = Math.round((completedCount / totalUnlocked) * 100);
        } else {
          completionRate = 0; // Remove the 0% when no quizzes are unlocked
        }

        // Combined score now equals global XP (level bonus removed)
        const globalXP = stu.gamification?.totalXP || 0;
        const combinedScore = globalXP;

        // Recalculate gamesPlayed strictly as number of CyberQuest entries
        gamesPlayed = cyberQuestHistory.length;

        return {
          id: stu._id.toString(),
          studentName: stu.fullName,
          email: stu.email,
          section: stu.section,
          gamesPlayed,
          totalScore: Math.round(totalScore),
          averageScore,
          completionRate,
          timeSpentMinutes,
          lastActivity,
          combinedScore,
          gameHistory: gameHistory.sort(
            (a, b) =>
              new Date(b.completedAt).getTime() -
              new Date(a.completedAt).getTime()
          ),
          cyberQuestHistory: cyberQuestHistory.sort(
            (a, b) =>
              new Date(b.completedAt).getTime() -
              new Date(a.completedAt).getTime()
          ),
          // No recentAttempts
        };
      });

      // Helper: format time spent
      function formatTime(minutes) {
        if (!minutes) return "0m";
        const h = Math.floor(minutes / 60);
        const m = Math.round(minutes % 60);
        return h ? `${h}h ${m}m` : `${m}m`;
      }

      function formatRelative(date) {
        if (!date) return null;
        const now = Date.now();
        const diffMs = now - new Date(date).getTime();
        const diffH = Math.floor(diffMs / (1000 * 60 * 60));
        if (diffH < 1) {
          const diffM = Math.max(1, Math.floor(diffMs / (1000 * 60)));
          return `${diffM} min ago`;
        }
        if (diffH < 24) return `${diffH} hours ago`;
        const diffD = Math.floor(diffH / 24);
        return diffD === 1 ? "1 day ago" : `${diffD} days ago`;
      }

      // Final formatting (no recent games)
      for (const s of studentStats) {
        s.timeSpent = formatTime(s.timeSpentMinutes);
        s.lastActivity = s.lastActivity ? formatRelative(s.lastActivity) : null;
        delete s.timeSpentMinutes;
      }

      // Summary aggregation
      const totalStudents = studentStats.length;
      const totalGames = studentStats.reduce(
        (acc, s) => acc + s.gamesPlayed,
        0
      );
      const averageScore = totalStudents
        ? +(
            studentStats.reduce((acc, s) => acc + s.averageScore, 0) /
            totalStudents
          ).toFixed(1)
        : 0;

      res.json({
        success: true,
        data: {
          summary: { totalStudents, totalGames, averageScore },
          students: studentStats,
        },
      });

      // Log instructor analytics access
      const requestInfo = extractRequestInfo(req);
      await logActivity({
        userId: req.user.id,
        username: req.user.username,
        userRole: req.user.privilege,
        action: AUDIT_ACTIONS.INSTRUCTOR_STUDENT_ANALYTICS_VIEW,
        resource: AUDIT_RESOURCES.ANALYTICS,
        details: {
          analyticsType: "student_performance",
          studentsAnalyzed: studentStats.length,
          sectionFilter: section || "all_sections",
          subjectFilter: normalizedSubjectId || selectedSubjectName,
          averageScore: averageScore,
          totalGames: totalGames,
        },
        ...requestInfo,
      });
    } catch (error) {
      console.error("Error fetching instructor student analytics:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch student analytics",
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/instructor/dashboard/summary
 * @desc    Summary stats for instructor dashboard: total students, average score, recent activity
 * @access  Private (Instructor/Admin)
 * @returns {
 *  success: boolean,
 *  data: {
 *    totalStudents: number,
 *    averageScore: number,
 *    recentActivity: Array<{ id, studentName, email, section, lastActivity: string | null, lastActiveRelative: string | null }>
 *  }
 * }
 */
router.get(
  "/dashboard/summary",
  protectRoute,
  authorizeRole(["instructor", "admin"]),
  async (req, res) => {
    try {
      // Fetch all students
      const students = await User.find({ privilege: "student" })
        .select("_id fullName email section analytics")
        .lean();

      const totalStudents = students.length;

      // Early return if no students
      if (!totalStudents) {
        return res.json({
          success: true,
          data: { totalStudents: 0, averageScore: 0, recentActivity: [] },
        });
      }

      // Fetch minimal progress to compute average scores from completed quizzes
      const progressDocs = await Progress.find({
        user: { $in: students.map((s) => s._id) },
      })
        .select("user moduleProgress.completedQuizzes")
        .lean();

      const progressMap = new Map();
      for (const p of progressDocs) progressMap.set(p.user.toString(), p);

      // Compute per-student average score, like analytics route
      const studentAverages = students.map((stu) => {
        const prog = progressMap.get(stu._id.toString());
        if (!prog) return 0;
        const completedQuizzes = (prog.moduleProgress || []).flatMap(
          (mp) => mp.completedQuizzes || []
        );
        let totalScore = 0;
        let count = 0;
        for (const cq of completedQuizzes) {
          if (typeof cq.score === "number") {
            totalScore += cq.score;
            count++;
          }
        }
        return count ? +(totalScore / count).toFixed(1) : 0;
      });

      const averageScore = totalStudents
        ? +(
            studentAverages.reduce((acc, v) => acc + v, 0) / totalStudents
          ).toFixed(1)
        : 0;

      // Build recent activity list based on lastActivity
      function formatRelative(date) {
        if (!date) return null;
        const now = Date.now();
        const diffMs = now - new Date(date).getTime();
        const diffM = Math.floor(diffMs / (1000 * 60));
        if (diffM < 60) return `${Math.max(1, diffM)} min ago`;
        const diffH = Math.floor(diffM / 60);
        if (diffH < 24) return `${diffH} hours ago`;
        const diffD = Math.floor(diffH / 24);
        return diffD === 1 ? "1 day ago" : `${diffD} days ago`;
      }

      const recentActivity = students
        .filter((s) => s.analytics?.lastActivity)
        .sort(
          (a, b) =>
            new Date(b.analytics.lastActivity) -
            new Date(a.analytics.lastActivity)
        )
        .slice(0, 10)
        .map((s) => ({
          id: s._id.toString(),
          studentName: s.fullName,
          email: s.email,
          section: s.section,
          lastActivity: s.analytics?.lastActivity
            ? new Date(s.analytics.lastActivity).toISOString()
            : null,
          lastActiveRelative: s.analytics?.lastActivity
            ? formatRelative(s.analytics.lastActivity)
            : null,
        }));

      res.json({
        success: true,
        data: {
          totalStudents,
          averageScore,
          recentActivity,
        },
      });

      // Log instructor dashboard access
      const requestInfo = extractRequestInfo(req);
      await logActivity({
        userId: req.user.id,
        username: req.user.username,
        userRole: req.user.privilege,
        action: AUDIT_ACTIONS.INSTRUCTOR_DASHBOARD_ACCESS,
        resource: AUDIT_RESOURCES.DASHBOARD,
        details: {
          dashboardType: "instructor_summary",
          totalStudents: totalStudents,
          averageScore: averageScore,
          recentActivityCount: recentActivity.length,
        },
        ...requestInfo,
      });
    } catch (error) {
      console.error("Error fetching instructor dashboard summary:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch dashboard summary",
        error: error.message,
      });
    }
  }
);

export default router;
