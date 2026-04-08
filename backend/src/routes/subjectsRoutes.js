import express from "express";
import { protectRoute, authorizeRole } from "../middleware/auth.middleware.js";
import {
  logActivity,
  AUDIT_ACTIONS,
  AUDIT_RESOURCES,
  extractRequestInfo,
} from "../lib/auditLogger.js";

// We will use the existing Section model to represent a Subject in DB
import Section from "../models/Section.js";
import User from "../models/Users.js";
import CyberQuest from "../models/CyberQuest.js";

const router = express.Router();

// Helper function to generate a unique subject code (exactly 6 characters)
const generateSubjectCode = async (subjectName) => {
  // Create base code from name (e.g., "Computer Science" -> "CS")
  const words = subjectName.trim().split(/\s+/);
  let baseCode = "";

  if (words.length === 1) {
    // Single word: take first 2-3 characters
    baseCode = words[0].substring(0, 3).toUpperCase();
  } else {
    // Multiple words: take first 1-2 chars from each word
    baseCode = words
      .map((word) => word.substring(0, 2))
      .join("")
      .toUpperCase()
      .substring(0, 3); // Limit to 3 chars for base
  }

  // Ensure base code is at least 2 chars
  if (baseCode.length < 2) {
    baseCode = baseCode.padEnd(2, "X");
  }

  // Generate random suffix to make exactly 6 characters
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let attempts = 0;

  while (attempts < 50) {
    // Generate random suffix to make total 6 characters
    let suffix = "";
    const suffixLength = 6 - baseCode.length;
    for (let i = 0; i < suffixLength; i++) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const uniqueCode = baseCode + suffix;

    // Check if this code already exists
    const existing = await Section.findOne({ subjectCode: uniqueCode });
    if (!existing) {
      return uniqueCode;
    }

    attempts++;
  }

  // Fallback: completely random 6-character code
  let uniqueCode = "";
  for (let i = 0; i < 6; i++) {
    uniqueCode += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return uniqueCode;
};

// Create a new subject (same as section create)
router.post(
  "/",
  protectRoute,
  authorizeRole(["instructor", "admin"]),
  async (req, res) => {
    try {
      const { name, instructor, description, isActive } = req.body;

      if (!name || name.trim().length < 3) {
        return res.status(400).json({
          success: false,
          message: "Valid subject name is required (min 3 characters)",
        });
      }

      const sectionCode = name
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, "");

      // Generate unique subject code for sharing
      const subjectCode = await generateSubjectCode(name);
      console.log(
        `Generated subject code: ${subjectCode} for subject: ${name}`
      );

      // Ensure the code can be stored in legacy enum if needed
      try {
        await User.updateSchema(sectionCode);
      } catch (schemaError) {
        console.warn(
          "Schema update failed (may be harmless):",
          schemaError.message
        );
        // Continue with subject creation even if schema update fails
      }

      const subject = new Section({
        name,
        sectionCode: sectionCode,
        subjectCode: subjectCode, // Add the shareable subject code
        instructor: instructor || req.user.id,
        description: description || `Subject for ${name}`,
        isActive: isActive !== undefined ? isActive : true,
        createdBy: req.user.id,
      });

      console.log(`Attempting to save subject with data:`, {
        name: subject.name,
        sectionCode: subject.sectionCode,
        subjectCode: subject.subjectCode,
        instructor: subject.instructor,
      });

      await subject.save();
      console.log(`Successfully saved subject with ID: ${subject._id}`);

      // Log subject creation
      const requestInfo = extractRequestInfo(req);
      await logActivity({
        userId: req.user.id,
        username: req.user.username,
        userRole: req.user.privilege,
        action: AUDIT_ACTIONS.SUBJECT_CREATE,
        resource: AUDIT_RESOURCES.SUBJECT,
        resourceId: subject._id,
        details: {
          subjectName: subject.name,
          subjectCode: subject.sectionCode,
          description: subject.description,
          isActive: subject.isActive,
        },
        ...requestInfo,
      });

      return res.status(201).json({
        success: true,
        message: "Subject created successfully",
        subject,
      });
    } catch (error) {
      console.error("Error creating subject:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to create subject",
        error: error.message,
      });
    }
  }
);

// Get user's subjects (for both students and instructors)
router.get("/user-subjects", protectRoute, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.privilege;
    const { includeArchived = false } = req.query;

    let subjects = [];

    // Base query filters
    const baseFilters = {
      isActive: { $ne: false },
    };

    // Add archived filter unless explicitly including archived subjects
    if (!includeArchived || includeArchived === "false") {
      baseFilters.archived = { $ne: true };
    }

    if (userRole === "student") {
      // For students, find subjects they are assigned to
      subjects = await Section.find({
        students: userId,
        ...baseFilters,
      }).select(
        "_id name description sectionCode subjectCode instructor students archived archivedAt"
      );
    } else if (userRole === "instructor") {
      // For instructors, find subjects they created/teach OR are assigned to as additional instructors
      subjects = await Section.find({
        $or: [
          { instructor: userId }, // Primary instructor
          { instructors: userId }, // Additional instructor
        ],
        ...baseFilters,
      }).select(
        "_id name description sectionCode subjectCode students archived archivedAt"
      );
    } else if (userRole === "admin") {
      // For admins, show all subjects
      subjects = await Section.find({
        ...baseFilters,
      }).select(
        "_id name description sectionCode subjectCode instructor students archived archivedAt"
      );
    }

    console.log(
      `📡 Backend: Found ${subjects.length} subjects for ${userRole} ${userId}`
    );

    const subjectsWithCounts = subjects.map((subject) => {
      const subjectObj =
        typeof subject.toObject === "function" ? subject.toObject() : subject;
      return {
        ...subjectObj,
        subjectCode: subjectObj.subjectCode || subjectObj.sectionCode || "",
        studentCount: Array.isArray(subjectObj.students)
          ? subjectObj.students.length
          : 0,
      };
    });

    // Log subject view activity
    const requestInfo = extractRequestInfo(req);
    await logActivity({
      userId: req.user.id,
      username: req.user.username,
      userRole: req.user.privilege,
      action: AUDIT_ACTIONS.SUBJECT_VIEW,
      resource: AUDIT_RESOURCES.SUBJECT,
      details: {
        viewType: "user_subjects",
        subjectCount: subjects.length,
        userRole: userRole,
      },
      ...requestInfo,
    });

    return res.status(200).json({
      success: true,
      subjects: subjectsWithCounts,
      count: subjectsWithCounts.length,
    });
  } catch (error) {
    console.error("Error fetching user subjects:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch subjects",
      error: error.message,
    });
  }
});

// Join a subject using subject code (for students)
router.post("/join", protectRoute, async (req, res) => {
  try {
    const { subjectCode } = req.body;
    const userId = req.user.id;

    if (!subjectCode || subjectCode.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Subject code is required",
      });
    }

    // Find subject by subject code
    const subject = await Section.findOne({
      subjectCode: subjectCode.toUpperCase().trim(),
      isActive: { $ne: false },
    });

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found with the provided code",
      });
    }

    console.log(
      `Found subject "${subject.name}" with students:`,
      subject.students || []
    );

    // Ensure students array exists
    if (!subject.students) {
      subject.students = [];
    }

    // Check if user is already in the subject (ObjectId-safe comparison)
    const isAlreadyEnrolled = (subject.students || []).some(
      (studentId) => String(studentId) === String(userId)
    );
    if (isAlreadyEnrolled) {
      return res.status(400).json({
        success: false,
        message: "Subject Already enrolled",
      });
    }

    console.log(`Adding student ${userId} to subject "${subject.name}"`);

    // Add student to the subject
    subject.students.push(userId);
    await subject.save();

    console.log(
      `Student added successfully. Subject now has ${subject.students.length} students`
    );

    // Add subject to user's subjects list
    const user = await User.findById(userId);
    if (user) {
      // Ensure user.subjects is an array
      if (!user.subjects) {
        user.subjects = [];
      }
      if (!user.subjects.includes(subject.sectionCode)) {
        user.subjects.push(subject.sectionCode);
        await user.save();
        console.log(
          `Added subject "${subject.sectionCode}" to user's subjects list`
        );
      } else {
        console.log(
          `User already has subject "${subject.sectionCode}" in their subjects list`
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: `Successfully joined ${subject.name}`,
      subject: {
        _id: subject._id,
        name: subject.name,
        description: subject.description,
        sectionCode: subject.sectionCode,
      },
    });
  } catch (error) {
    console.error("Error joining subject:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to join subject",
      error: error.message,
    });
  }
});

// Bulk-assign students to a subject without overwriting user's single section
router.put(
  "/:id/students",
  protectRoute,
  authorizeRole(["instructor", "admin"]),
  async (req, res) => {
    try {
      const { studentIds } = req.body;
      const subjectId = req.params.id;

      if (!Array.isArray(studentIds) || studentIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Student IDs array is required",
        });
      }

      const subject = await Section.findById(subjectId);
      if (!subject) {
        return res
          .status(404)
          .json({ success: false, message: "Subject not found" });
      }

      // Add unique student IDs to subject.students
      const existingSet = new Set(subject.students.map((id) => id.toString()));
      let addedCount = 0;
      for (const sid of studentIds) {
        if (!existingSet.has(String(sid))) {
          subject.students.push(sid);
          existingSet.add(String(sid));
          addedCount++;
        }
      }
      await subject.save();

      // Update each user's 'sections' array (multi-subject) without touching 'section'
      const code = subject.sectionCode;
      await User.updateMany(
        { _id: { $in: studentIds }, privilege: "student" },
        { $addToSet: { sections: code } }
      );

      // Log bulk student assignment
      const requestInfo = extractRequestInfo(req);
      await logActivity({
        userId: req.user.id,
        username: req.user.username,
        userRole: req.user.privilege,
        action: AUDIT_ACTIONS.SUBJECT_STUDENT_ADD,
        resource: AUDIT_RESOURCES.SUBJECT,
        resourceId: subject._id,
        details: {
          subjectName: subject.name,
          studentsAdded: addedCount,
          totalStudentIds: studentIds.length,
          operation: "bulk_assign",
        },
        ...requestInfo,
      });

      return res.json({
        success: true,
        message: `${addedCount} students assigned to subject ${subject.name}`,
        subject: {
          _id: subject._id,
          name: subject.name,
          studentCount: subject.students.length,
        },
      });
    } catch (error) {
      console.error("Error assigning students to subject:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to assign students",
        error: error.message,
      });
    }
  }
);

// Add individual student to a subject (idempotent), do not overwrite user's single 'section'
router.post(
  "/:id/students",
  protectRoute,
  authorizeRole(["instructor", "admin"]),
  async (req, res) => {
    try {
      const { studentId } = req.body;
      const subjectId = req.params.id;

      if (!studentId) {
        return res
          .status(400)
          .json({ success: false, message: "Student ID is required" });
      }

      const subject = await Section.findById(subjectId);
      if (!subject) {
        return res
          .status(404)
          .json({ success: false, message: "Subject not found" });
      }

      // Find student and ensure we have all required fields
      const student = await User.findById(studentId).select(
        "_id username fullName email sections"
      );
      if (!student) {
        return res
          .status(404)
          .json({ success: false, message: "Student not found" });
      }

      console.log(`📡 Backend: Student found:`, {
        id: student._id,
        username: student.username,
        fullName: student.fullName,
        email: student.email,
        sections: student.sections,
      });

      // Idempotent add: if already in this subject, return 200 with a friendly message
      const alreadyIn = subject.students.some(
        (id) => id.toString() === studentId.toString()
      );
      if (alreadyIn) {
        // Ensure user's sections array still includes this code
        const code = subject.sectionCode;
        console.log(
          `📡 Backend: Student already in subject, checking section code ${code}`
        );

        if (!student.sections || !student.sections.includes(code)) {
          console.log(
            `📡 Backend: Adding missing section code for already assigned student`
          );
          // Use updateOne to avoid validation issues
          await User.updateOne(
            { _id: studentId },
            { $addToSet: { sections: code } },
            { runValidators: false }
          );
        }
        return res.status(200).json({
          success: true,
          message: "Student already in this subject",
          subject: {
            _id: subject._id,
            name: subject.name,
            studentCount: subject.students.length,
          },
        });
      }

      subject.students.push(studentId);
      await subject.save();

      const code = subject.sectionCode;
      console.log(
        `📡 Backend: Adding section code ${code} to student ${studentId}`
      );

      // Check if student already has this section
      if (!student.sections || !student.sections.includes(code)) {
        console.log(`📡 Backend: Updating user sections with $addToSet`);
        // Use updateOne to avoid validation issues - this should not trigger validation
        const updateResult = await User.updateOne(
          { _id: studentId },
          { $addToSet: { sections: code } },
          { runValidators: false, new: false }
        );
        console.log(`📡 Backend: Update result:`, updateResult);
      } else {
        console.log(`📡 Backend: Student already has section ${code}`);
      }

      // Get student name safely without triggering validation
      const studentName = student.fullName || student.username || "Student";

      // Log individual student assignment
      const requestInfo = extractRequestInfo(req);
      await logActivity({
        userId: req.user.id,
        username: req.user.username,
        userRole: req.user.privilege,
        action: AUDIT_ACTIONS.SUBJECT_STUDENT_ADD,
        resource: AUDIT_RESOURCES.SUBJECT,
        resourceId: subject._id,
        details: {
          subjectName: subject.name,
          studentId: studentId,
          studentName: studentName,
          operation: "individual_assign",
        },
        ...requestInfo,
      });

      return res.status(200).json({
        success: true,
        message: `Student ${studentName} assigned to subject ${subject.name}`,
        subject: {
          _id: subject._id,
          name: subject.name,
          studentCount: subject.students.length,
        },
      });
    } catch (error) {
      console.error("Error adding student to subject:", error);
      console.error("Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });

      return res.status(500).json({
        success: false,
        message: "Failed to add student to subject",
        error: error.message,
      });
    }
  }
);

// Get students in a subject (populate from subject.students)
router.get(
  "/:id/students",
  protectRoute,
  authorizeRole(["instructor", "admin"]),
  async (req, res) => {
    try {
      const subjectId = req.params.id;
      console.log(`📡 Backend: Fetching students for subject ID: ${subjectId}`);

      // Validate ObjectId format
      if (!subjectId.match(/^[0-9a-fA-F]{24}$/)) {
        console.log(`📡 Backend: Invalid ObjectId format: ${subjectId}`);
        return res.status(400).json({
          success: false,
          message: "Invalid subject ID format",
        });
      }

      const subject = await Section.findById(subjectId).populate({
        path: "students",
        select: "fullName email username sections section privilege",
      });

      if (!subject) {
        console.log(`📡 Backend: Subject not found: ${subjectId}`);
        return res
          .status(404)
          .json({ success: false, message: "Subject not found" });
      }

      console.log(
        `📡 Backend: Found subject "${subject.name}" with ${
          subject.students?.length || 0
        } students`
      );

      return res.json({
        success: true,
        students: subject.students || [],
        subject: {
          _id: subject._id,
          name: subject.name,
          studentCount: subject.students?.length || 0,
        },
      });
    } catch (error) {
      console.error("📡 Backend: Error fetching subject students:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch students for this subject",
        error: error.message,
        details: error.stack,
      });
    }
  }
);

// Remove a student from a subject; do not reset user's single 'section'
router.delete(
  "/:id/students/:studentId",
  protectRoute,
  authorizeRole(["instructor", "admin"]),
  async (req, res) => {
    try {
      const { id: subjectId, studentId } = req.params;
      const subject = await Section.findById(subjectId);
      if (!subject) {
        return res
          .status(404)
          .json({ success: false, message: "Subject not found" });
      }

      const student = await User.findById(studentId);
      if (!student) {
        return res
          .status(404)
          .json({ success: false, message: "Student not found" });
      }

      const beforeLen = subject.students.length;
      subject.students = subject.students.filter(
        (id) => id.toString() !== studentId.toString()
      );
      await subject.save();

      const code = subject.sectionCode;
      // Pull this code from user's sections array
      await User.updateOne({ _id: studentId }, { $pull: { sections: code } });

      const removed = beforeLen !== subject.students.length;

      // Log student removal
      const requestInfo = extractRequestInfo(req);
      await logActivity({
        userId: req.user.id,
        username: req.user.username,
        userRole: req.user.privilege,
        action: AUDIT_ACTIONS.SUBJECT_STUDENT_REMOVE,
        resource: AUDIT_RESOURCES.SUBJECT,
        resourceId: subject._id,
        details: {
          subjectName: subject.name,
          studentId: studentId,
          studentName: student.fullName || student.username,
          studentEmail: student.email,
          removed: removed,
        },
        ...requestInfo,
      });

      return res.json({
        success: true,
        message: removed
          ? "Student removed from subject successfully"
          : "Student was not a member of this subject",
        removedStudent: {
          id: student._id,
          fullName: student.fullName,
          email: student.email,
        },
      });
    } catch (error) {
      console.error("Error removing student from subject:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to remove student from subject",
        error: error.message,
      });
    }
  }
);

// Get instructors for a specific subject
router.get(
  "/:id/instructors",
  protectRoute,
  authorizeRole(["instructor", "admin"]),
  async (req, res) => {
    try {
      const { id: subjectId } = req.params;
      const subject = await Section.findById(subjectId).populate(
        "instructor instructors",
        "fullName email username"
      );

      if (!subject) {
        return res
          .status(404)
          .json({ success: false, message: "Subject not found" });
      }

      // Check authorization: only the primary instructor or assigned instructors can view
      const userId = req.user.id.toString();
      const isPrimaryInstructor = subject.instructor._id.toString() === userId;
      const isAssignedInstructor = subject.instructors.some(
        (inst) => inst._id.toString() === userId
      );

      if (
        req.user.privilege !== "admin" &&
        !isPrimaryInstructor &&
        !isAssignedInstructor
      ) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to view these instructors",
        });
      }

      // Combine primary instructor and additional instructors
      const allInstructors = [
        {
          ...subject.instructor.toObject(),
          isPrimary: true,
        },
        ...subject.instructors.map((inst) => ({
          ...inst.toObject(),
          isPrimary: false,
        })),
      ];

      return res.json({
        success: true,
        instructors: allInstructors,
      });
    } catch (error) {
      console.error("Error fetching subject instructors:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch instructors",
        error: error.message,
      });
    }
  }
);

// Add instructor to a subject
router.post(
  "/:id/instructors",
  protectRoute,
  authorizeRole(["instructor", "admin"]),
  async (req, res) => {
    try {
      const { id: subjectId } = req.params;
      const { instructorId } = req.body;

      if (!instructorId) {
        return res.status(400).json({
          success: false,
          message: "Instructor ID is required",
        });
      }

      const subject = await Section.findById(subjectId);
      if (!subject) {
        return res
          .status(404)
          .json({ success: false, message: "Subject not found" });
      }

      // Check authorization: only primary instructor or admin can add instructors
      if (
        req.user.privilege !== "admin" &&
        subject.instructor.toString() !== req.user.id.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: "Only the primary instructor or admin can add instructors",
        });
      }

      const instructor = await User.findById(instructorId);
      if (!instructor) {
        return res
          .status(404)
          .json({ success: false, message: "Instructor not found" });
      }

      // Verify the user is actually an instructor
      if (
        instructor.privilege !== "instructor" &&
        instructor.privilege !== "admin"
      ) {
        return res.status(400).json({
          success: false,
          message: "User must have instructor or admin privileges",
        });
      }

      // Check if already primary instructor
      if (subject.instructor.toString() === instructorId) {
        return res.status(400).json({
          success: false,
          message: "This user is already the primary instructor",
        });
      }

      // Check if already in instructors array
      if (
        subject.instructors.some(
          (id) => id.toString() === instructorId.toString()
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Instructor is already assigned to this subject",
        });
      }

      // Add instructor to the array
      subject.instructors.push(instructorId);
      await subject.save();

      // Log instructor addition
      const requestInfo = extractRequestInfo(req);
      await logActivity({
        userId: req.user.id,
        username: req.user.username,
        userRole: req.user.privilege,
        action: AUDIT_ACTIONS.SUBJECT_INSTRUCTOR_ADD,
        resource: AUDIT_RESOURCES.SUBJECT,
        resourceId: subject._id,
        details: {
          subjectName: subject.name,
          instructorId: instructorId,
          instructorName: instructor.fullName || instructor.username,
          instructorEmail: instructor.email,
        },
        ...requestInfo,
      });

      return res.json({
        success: true,
        message: "Instructor added to subject successfully",
        addedInstructor: {
          _id: instructor._id,
          fullName: instructor.fullName,
          email: instructor.email,
          username: instructor.username,
          isPrimary: false,
        },
      });
    } catch (error) {
      console.error("Error adding instructor to subject:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to add instructor to subject",
        error: error.message,
      });
    }
  }
);

// Remove instructor from a subject
router.delete(
  "/:id/instructors/:instructorId",
  protectRoute,
  authorizeRole(["instructor", "admin"]),
  async (req, res) => {
    try {
      const { id: subjectId, instructorId } = req.params;
      const subject = await Section.findById(subjectId);

      if (!subject) {
        return res
          .status(404)
          .json({ success: false, message: "Subject not found" });
      }

      // Check authorization: only primary instructor or admin can remove instructors
      if (
        req.user.privilege !== "admin" &&
        subject.instructor.toString() !== req.user.id.toString()
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Only the primary instructor or admin can remove instructors",
        });
      }

      const instructor = await User.findById(instructorId);
      if (!instructor) {
        return res
          .status(404)
          .json({ success: false, message: "Instructor not found" });
      }

      // Check if removing primary instructor
      const isPrimaryInstructor =
        subject.instructor.toString() === instructorId;

      if (isPrimaryInstructor) {
        // Remove from primary instructor field by setting to null or first available instructor
        if (subject.instructors.length > 0) {
          // Promote first additional instructor to primary
          subject.instructor = subject.instructors[0];
          subject.instructors = subject.instructors.slice(1);
        } else {
          // No other instructors, cannot remove the last instructor
          return res.status(400).json({
            success: false,
            message:
              "Cannot remove the only instructor. Add another instructor first.",
          });
        }
        await subject.save();

        // Log instructor removal
        const requestInfo = extractRequestInfo(req);
        await logActivity({
          userId: req.user.id,
          username: req.user.username,
          userRole: req.user.privilege,
          action: AUDIT_ACTIONS.SUBJECT_INSTRUCTOR_REMOVE,
          resource: AUDIT_RESOURCES.SUBJECT,
          resourceId: subject._id,
          details: {
            subjectName: subject.name,
            instructorId: instructorId,
            instructorName: instructor.fullName || instructor.username,
            instructorEmail: instructor.email,
            wasPrimary: true,
            newPrimaryInstructor: subject.instructor,
          },
          ...requestInfo,
        });

        return res.json({
          success: true,
          message: "Primary instructor removed and replaced successfully",
          removedInstructor: {
            _id: instructor._id,
            fullName: instructor.fullName,
            email: instructor.email,
          },
        });
      }

      const beforeLen = subject.instructors.length;
      subject.instructors = subject.instructors.filter(
        (id) => id.toString() !== instructorId.toString()
      );
      await subject.save();

      const removed = beforeLen !== subject.instructors.length;

      // Log instructor removal
      const requestInfo = extractRequestInfo(req);
      await logActivity({
        userId: req.user.id,
        username: req.user.username,
        userRole: req.user.privilege,
        action: AUDIT_ACTIONS.SUBJECT_INSTRUCTOR_REMOVE,
        resource: AUDIT_RESOURCES.SUBJECT,
        resourceId: subject._id,
        details: {
          subjectName: subject.name,
          instructorId: instructorId,
          instructorName: instructor.fullName || instructor.username,
          instructorEmail: instructor.email,
          removed: removed,
        },
        ...requestInfo,
      });

      return res.json({
        success: true,
        message: removed
          ? "Instructor removed from subject successfully"
          : "Instructor was not assigned to this subject",
        removedInstructor: {
          _id: instructor._id,
          fullName: instructor.fullName,
          email: instructor.email,
        },
      });
    } catch (error) {
      console.error("Error removing instructor from subject:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to remove instructor from subject",
        error: error.message,
      });
    }
  }
);

// List subjects (same as sections list for instructors/admin)
router.get(
  "/",
  protectRoute,
  authorizeRole(["instructor", "admin"]),
  async (req, res) => {
    try {
      const {
        search,
        sort = "createdAt",
        direction = "desc",
        page = 1,
        limit = 10,
        includeArchived = false,
      } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const filter = {};
      if (search) filter.name = { $regex: search, $options: "i" };
      if (req.user.privilege === "instructor") {
        filter.$or = [{ instructor: req.user.id }, { createdBy: req.user.id }];
      }

      // Add archived filter unless explicitly including archived subjects
      if (!includeArchived || includeArchived === "false") {
        filter.archived = { $ne: true };
      }

      const sortOptions = {}; // dynamic sort
      sortOptions[sort] = direction === "desc" ? -1 : 1;

      const subjects = await Section.find(filter)
        .populate("instructor", "username email")
        .populate("createdBy", "username")
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Section.countDocuments(filter);
      const subjectsWithInstructorName = subjects.map((s) => {
        const o = s.toObject();
        if (o.instructor) o.instructorName = o.instructor.username;
        return o;
      });

      return res.json({
        success: true,
        subjects: subjectsWithInstructorName,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalSubjects: total,
        },
      });
    } catch (error) {
      console.error("Error fetching subjects:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch subjects",
        error: error.message,
      });
    }
  }
);

// Get cyber quests for a specific subject
router.get("/:id/cyber-quests", protectRoute, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if subject exists
    const subject = await Section.findById(id);
    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found",
      });
    }

    // Get cyber quests for this subject
    const cyberQuests = await CyberQuest.findBySubject(id);

    return res.json({
      success: true,
      cyberQuests,
      subject: {
        _id: subject._id,
        name: subject.name,
        description: subject.description,
      },
    });
  } catch (error) {
    console.error("Error fetching cyber quests for subject:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch cyber quests",
      error: error.message,
    });
  }
});

// Update a subject's name and description
router.put(
  "/:id",
  protectRoute,
  authorizeRole(["instructor", "admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description } = req.body;

      if (!name || name.trim().length < 3) {
        return res.status(400).json({
          success: false,
          message: "Valid subject name is required (min 3 characters)",
        });
      }

      // Find the subject
      const subject = await Section.findById(id);
      if (!subject) {
        return res.status(404).json({
          success: false,
          message: "Subject not found",
        });
      }

      // If instructor, ensure ownership
      if (
        req.user.privilege === "instructor" &&
        subject.instructor.toString() !== req.user.id.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to update this subject",
        });
      }

      // Store old values for audit log
      const oldName = subject.name;
      const oldDescription = subject.description;

      // Update the subject
      subject.name = name.trim();
      subject.description = description?.trim() || "";
      subject.updatedAt = new Date();

      await subject.save();

      // Log subject update
      const requestInfo = extractRequestInfo(req);
      await logActivity({
        userId: req.user.id,
        username: req.user.username,
        userRole: req.user.privilege,
        action: AUDIT_ACTIONS.SUBJECT_UPDATE,
        resource: AUDIT_RESOURCES.SUBJECT,
        resourceId: subject._id,
        details: {
          subjectId: subject._id,
          oldName,
          newName: subject.name,
          oldDescription,
          newDescription: subject.description,
          changes: {
            name: oldName !== subject.name,
            description: oldDescription !== subject.description,
          },
        },
        ...requestInfo,
      });

      return res.json({
        success: true,
        message: "Subject updated successfully",
        subject: {
          _id: subject._id,
          name: subject.name,
          description: subject.description,
          sectionCode: subject.sectionCode,
          subjectCode: subject.subjectCode,
          students: subject.students,
          updatedAt: subject.updatedAt,
        },
      });
    } catch (error) {
      console.error("Error updating subject:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to update subject",
        error: error.message,
      });
    }
  }
);

// Delete a subject and (optionally) its associated cyber quests ("cyber map")
router.delete(
  "/:id",
  protectRoute,
  authorizeRole(["instructor", "admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const cascade =
        (req.query.cascadeCyberQuests || "true").toString().toLowerCase() !==
        "false"; // default true

      // Validate subject exists
      const subject = await Section.findById(id);
      if (!subject) {
        return res.status(404).json({
          success: false,
          message: "Subject not found",
        });
      }

      // If instructor, ensure ownership
      if (
        req.user.privilege === "instructor" &&
        subject.instructor.toString() !== req.user.id.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to delete this subject",
        });
      }

      // Gather counts before deletion
      const studentCount = subject.students?.length || 0;

      let cyberQuestsDeleted = 0;
      let cyberQuestIds = [];
      if (cascade) {
        const quests = await CyberQuest.find({ subject: id }).select("_id");
        cyberQuestIds = quests.map((q) => q._id);
        if (quests.length > 0) {
          const delResult = await CyberQuest.deleteMany({ subject: id });
          cyberQuestsDeleted = delResult.deletedCount || quests.length;
        }
      }

      // Remove section code from all users' sections arrays
      if (subject.sectionCode) {
        const sectionCode = subject.sectionCode;
        const sectionsPullResult = await User.updateMany(
          { sections: sectionCode },
          { $pull: { sections: sectionCode } }
        );
        const currentSectionResult = await User.updateMany(
          { currentSection: sectionCode },
          { $unset: { currentSection: 1 } }
        );
        const primarySectionResult = await User.updateMany(
          { section: sectionCode },
          { $set: { section: "no_section" } }
        );
        var userCleanupStats = {
          usersSectionsPullModified: sectionsPullResult.modifiedCount || 0,
          usersCurrentSectionCleared: currentSectionResult.modifiedCount || 0,
          usersPrimarySectionReset: primarySectionResult.modifiedCount || 0,
        };
      }

      await subject.deleteOne();

      // Log deletion
      const requestInfo = extractRequestInfo(req);
      await logActivity({
        userId: req.user.id,
        username: req.user.username,
        userRole: req.user.privilege,
        action: AUDIT_ACTIONS.SUBJECT_DELETE,
        resource: AUDIT_RESOURCES.SUBJECT,
        resourceId: id,
        details: {
          subjectName: subject.name,
          sectionCode: subject.sectionCode,
          studentCount,
          cyberQuestsCascade: cascade,
          cyberQuestsDeleted,
          cyberQuestIds,
          ...(userCleanupStats || {}),
        },
        ...requestInfo,
      });

      return res.json({
        success: true,
        message: `Subject "${subject.name}" deleted$${
          cascade ? " with associated cyber quests" : ""
        }.`,
        deletedSubjectId: id,
        cyberQuestsDeleted,
        studentCount,
        ...(userCleanupStats || {}),
      });
    } catch (error) {
      console.error("Error deleting subject:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to delete subject",
        error: error.message,
      });
    }
  }
);

// Archive/Unarchive a subject (soft delete/restore)
router.patch(
  "/:id/archive",
  protectRoute,
  authorizeRole(["instructor", "admin"]),
  async (req, res) => {
    try {
      const subjectId = req.params.id;
      const { archive = true } = req.body; // default to archive if not specified

      // Validate ObjectId format
      if (!subjectId.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({
          success: false,
          message: "Invalid subject ID format",
        });
      }

      const subject = await Section.findById(subjectId);
      if (!subject) {
        return res.status(404).json({
          success: false,
          message: "Subject not found",
        });
      }

      // Authorization check: instructor can only archive their own subjects
      if (
        req.user.privilege === "instructor" &&
        subject.instructor.toString() !== req.user.id
      ) {
        return res.status(403).json({
          success: false,
          message: "You can only archive your own subjects",
        });
      }

      // Prevent archiving/unarchiving if already in desired state
      if (archive && subject.archived) {
        return res.status(400).json({
          success: false,
          message: "Subject is already archived",
        });
      }

      if (!archive && !subject.archived) {
        return res.status(400).json({
          success: false,
          message: "Subject is not archived",
        });
      }

      // Update archive status
      subject.archived = archive;
      subject.archivedAt = archive ? new Date() : null;
      subject.archivedBy = archive ? req.user.id : null;

      await subject.save();

      // Log archive/unarchive activity
      const requestInfo = extractRequestInfo(req);
      await logActivity({
        userId: req.user.id,
        username: req.user.username,
        userRole: req.user.privilege,
        action: archive
          ? AUDIT_ACTIONS.SUBJECT_ARCHIVE
          : AUDIT_ACTIONS.SUBJECT_UNARCHIVE,
        resource: AUDIT_RESOURCES.SUBJECT,
        resourceId: subject._id,
        details: {
          subjectName: subject.name,
          previousState: archive ? "active" : "archived",
          newState: archive ? "archived" : "active",
          operation: archive ? "archive" : "unarchive",
        },
        ...requestInfo,
      });

      return res.status(200).json({
        success: true,
        message: `Subject ${archive ? "archived" : "unarchived"} successfully`,
        subject: {
          _id: subject._id,
          name: subject.name,
          archived: subject.archived,
          archivedAt: subject.archivedAt,
        },
      });
    } catch (error) {
      console.error(
        `Error ${req.body.archive ? "archiving" : "unarchiving"} subject:`,
        error
      );
      return res.status(500).json({
        success: false,
        message: `Failed to ${
          req.body.archive ? "archive" : "unarchive"
        } subject`,
        error: error.message,
      });
    }
  }
);

// POST fallback for Archive/Unarchive (some clients or proxies may block PATCH)
router.post(
  "/:id/archive",
  protectRoute,
  authorizeRole(["instructor", "admin"]),
  async (req, res) => {
    // Reuse the same logic by delegating to patch handler semantics
    // Simply call next middleware chain would require refactor; duplicating minimal logic here for clarity.
    try {
      const subjectId = req.params.id;
      const { archive = true } = req.body;

      if (!subjectId.match(/^[0-9a-fA-F]{24}$/)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid subject ID format" });
      }

      const subject = await Section.findById(subjectId);
      if (!subject) {
        return res
          .status(404)
          .json({ success: false, message: "Subject not found" });
      }

      if (
        req.user.privilege === "instructor" &&
        subject.instructor.toString() !== req.user.id
      ) {
        return res.status(403).json({
          success: false,
          message: "You can only archive your own subjects",
        });
      }

      if (archive && subject.archived) {
        return res
          .status(400)
          .json({ success: false, message: "Subject is already archived" });
      }
      if (!archive && !subject.archived) {
        return res
          .status(400)
          .json({ success: false, message: "Subject is not archived" });
      }

      subject.archived = archive;
      subject.archivedAt = archive ? new Date() : null;
      subject.archivedBy = archive ? req.user.id : null;
      await subject.save();

      const requestInfo = extractRequestInfo(req);
      await logActivity({
        userId: req.user.id,
        username: req.user.username,
        userRole: req.user.privilege,
        action: archive
          ? AUDIT_ACTIONS.SUBJECT_ARCHIVE
          : AUDIT_ACTIONS.SUBJECT_UNARCHIVE,
        resource: AUDIT_RESOURCES.SUBJECT,
        resourceId: subject._id,
        details: {
          subjectName: subject.name,
          previousState: archive ? "active" : "archived",
          newState: archive ? "archived" : "active",
          operation: archive
            ? "archive_fallback_post"
            : "unarchive_fallback_post",
        },
        ...requestInfo,
      });

      return res.status(200).json({
        success: true,
        message: `Subject ${
          archive ? "archived" : "unarchived"
        } successfully (POST fallback)`,
        subject: {
          _id: subject._id,
          name: subject.name,
          archived: subject.archived,
          archivedAt: subject.archivedAt,
        },
      });
    } catch (error) {
      console.error(
        `Error ${
          req.body.archive ? "archiving" : "unarchiving"
        } subject via POST fallback:`,
        error
      );
      return res.status(500).json({
        success: false,
        message: `Failed to ${
          req.body.archive ? "archive" : "unarchive"
        } subject (POST fallback)`,
        error: error.message,
      });
    }
  }
);
router.get(
  "/:id/cyber-quests/export",
  protectRoute,
  authorizeRole(["instructor", "admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;

      const subject = await Section.findById(id);
      if (!subject) {
        return res.status(404).json({
          success: false,
          message: "Subject not found",
        });
      }

      const cyberQuests = await CyberQuest.findBySubject(id);

      // Strip volatile fields like timestamps to keep JSON simpler.
      // Keep sourceQuestId only for traceability; imports should clone, not mutate originals.
      const exported = cyberQuests.map((q) => ({
        sourceQuestId: q._id,
        title: q.title,
        description: q.description,
        difficulty: q.difficulty,
        level: q.level,
        prerequisiteLevel: q.prerequisiteLevel,
        questions: q.questions,
      }));

      return res.json({
        success: true,
        subject: {
          _id: subject._id,
          name: subject.name,
          sectionCode: subject.sectionCode,
          subjectCode: subject.subjectCode,
        },
        cyberQuests: exported,
        exportedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error exporting cyber quests:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to export cyber quests",
        error: error.message,
      });
    }
  }
);

// Import cyber quests JSON for a subject by cloning entries
router.post(
  "/:id/cyber-quests/import",
  protectRoute,
  authorizeRole(["instructor", "admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { cyberQuests } = req.body;

      const subject = await Section.findById(id);
      if (!subject) {
        return res.status(404).json({
          success: false,
          message: "Subject not found",
        });
      }

      if (!Array.isArray(cyberQuests) || cyberQuests.length === 0) {
        return res.status(400).json({
          success: false,
          message: "cyberQuests array is required and cannot be empty",
        });
      }

      let createdCount = 0;
      const errors = [];

      for (const item of cyberQuests) {
        try {
          const payload = {
            title: item.title,
            description: item.description || "",
            difficulty: item.difficulty || "medium",
            level: item.level || 1,
            prerequisiteLevel:
              item.prerequisiteLevel !== undefined
                ? item.prerequisiteLevel
                : null,
            subject: subject._id,
            questions: item.questions,
            created_by: req.user.id,
          };

          // Basic shape validation
          if (!payload.title || !Array.isArray(payload.questions)) {
            throw new Error("Each cyber quest must have title and questions");
          }

          // Always create a new quest in the target subject.
          // Ignore incoming identifiers so source subject data stays untouched.
          const cq = new CyberQuest(payload);
          const validationErrors = cq.validateQuestions();
          if (validationErrors) {
            throw new Error(validationErrors.join("; "));
          }
          await cq.save();
          createdCount++;
        } catch (err) {
          console.error("Error importing cyber quest entry:", err);
          errors.push({
            title: item.title || "(untitled)",
            error: err.message,
          });
        }
      }

      return res.status(200).json({
        success: true,
        message: "Cyber quests import completed",
        summary: {
          created: createdCount,
          updated: 0,
          failed: errors.length,
        },
        errors,
      });
    } catch (error) {
      console.error("Error importing cyber quests:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to import cyber quests",
        error: error.message,
      });
    }
  }
);
export default router;
