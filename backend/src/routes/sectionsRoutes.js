import express from "express";

import { protectRoute, authorizeRole } from "../middleware/auth.middleware.js";

const router = express.Router();
// Create a new section
// POST /api/sections
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
          message: "Valid class name is required (min 3 characters)",
        });
      }

      // Add the new section name to the User model's section enum
      const newSectionName = name.toLowerCase().replace(/\s+/g, "_");

      // Check if section already exists
      const User = await import("../models/Users.js").then(
        (module) => module.default
      );
      const sectionExists = User.schema
        .path("section")
        .enumValues.includes(newSectionName);

      if (sectionExists) {
        return res.status(400).json({
          success: false,
          message: "Class with this name already exists",
        });
      }

      // Create a new section document
      const Section = await import("../models/Section.js").then(
        (module) => module.default
      );
      const newSection = new Section({
        name: name,
        sectionCode: newSectionName, // Changed from sectionId to sectionCode
        instructor: instructor || req.user.id, // Use provided instructor or default to creator
        description: description || `Class for ${name}`,
        isActive: isActive !== undefined ? isActive : true,
        createdBy: req.user.id,
      });

      await newSection.save();

      // Add the new section to User model enum
      await User.updateSchema(newSectionName);

      res.status(201).json({
        success: true,
        message: "Class created successfully",
        section: newSection,
      });
    } catch (error) {
      console.error("Error creating section:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create class",
        error: error.message,
      });
    }
  }
);

// Assign students to a section
// PUT /api/sections/:id/students
router.put(
  "/:id/students",
  protectRoute,
  authorizeRole(["instructor", "admin"]),
  async (req, res) => {
    try {
      const { studentIds, instructorId } = req.body;
      const sectionId = req.params.id;

      if (
        !studentIds ||
        !Array.isArray(studentIds) ||
        studentIds.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Student IDs array is required",
        });
      }

      // Get section details
      const Section = await import("../models/Section.js").then(
        (module) => module.default
      );
      const section = await Section.findById(sectionId);

      if (!section) {
        return res.status(404).json({
          success: false,
          message: "Section not found",
        });
      }

      // Update the instructor if provided
      if (instructorId) {
        section.instructor = instructorId;
        await section.save();
      }

      // Add students to section's students array
      section.students = [...section.students, ...studentIds];
      await section.save();

      // Update each student's section field
      const User = await import("../models/Users.js").then(
        (module) => module.default
      );
      const updateResults = await User.updateMany(
        { _id: { $in: studentIds } },
        { $set: { section: section.sectionCode } }
      );

      res.json({
        success: true,
        message: `${
          updateResults.nModified || studentIds.length
        } students assigned to class ${section.name}`,
        updatedCount: updateResults.nModified || studentIds.length,
        section: {
          _id: section._id,
          name: section.name,
          studentCount: section.students.length,
          instructor: section.instructor,
        },
      });
    } catch (error) {
      console.error("Error assigning students to section:", error);
      res.status(500).json({
        success: false,
        message: "Failed to assign students to class",
        error: error.message,
      });
    }
  }
);

// Add individual student to a section
// POST /api/sections/:id/students
router.post(
  "/:id/students",
  protectRoute,
  authorizeRole(["instructor", "admin"]),
  async (req, res) => {
    try {
      const { studentId } = req.body;
      const sectionId = req.params.id;

      if (!studentId) {
        return res.status(400).json({
          success: false,
          message: "Student ID is required",
        });
      }

      // Find the section
      const Section = await import("../models/Section.js").then(
        (module) => module.default
      );
      const section = await Section.findById(sectionId);

      if (!section) {
        return res.status(404).json({
          success: false,
          message: "Section not found",
        });
      }

      // Find the student
      const User = await import("../models/Users.js").then(
        (module) => module.default
      );
      const student = await User.findById(studentId);

      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Student not found",
        });
      }

      // Check if student is already in this section
      if (section.students.includes(studentId)) {
        return res.status(400).json({
          success: false,
          message: "Student is already assigned to this section",
        });
      }

      // Add student to section
      section.students.push(studentId);
      await section.save();

      // Update student's section
      const sectionCode =
        section.sectionCode || section.name.toLowerCase().replace(/\s+/g, "_");
      student.section = sectionCode;
      await student.save();

      res.status(200).json({
        success: true,
        message: `Student ${student.fullName} assigned to section ${section.name}`,
        section: {
          _id: section._id,
          name: section.name,
          studentCount: section.students.length,
        },
      });
    } catch (error) {
      console.error("Error adding student to section:", error);
      res.status(500).json({
        success: false,
        message: "Failed to add student to section",
        error: error.message,
      });
    }
  }
);

// Add this route to get students with no section
router.get(
  "/unassigned-students",
  protectRoute,
  authorizeRole(["instructor", "admin"]),
  async (req, res) => {
    try {
      // Pagination parameters
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      // Sorting options
      const sortField = req.query.sort || "username";
      const sortDirection = req.query.direction === "desc" ? -1 : 1;
      const sortOptions = {};
      sortOptions[sortField] = sortDirection;

      // Filter for students with no_section, null, or undefined section and student privilege
      const filter = {
        $or: [
          { section: "no_section" },
          { section: null },
          { section: { $exists: false } },
        ],
        privilege: "student",
      };

      // Add search functionality if provided
      if (req.query.search) {
        const searchRegex = new RegExp(req.query.search, "i");
        filter.$or = [{ username: searchRegex }, { email: searchRegex }];
      }

      // Get total count for pagination
      const User = await import("../models/Users.js").then(
        (module) => module.default
      );
      const total = await User.countDocuments(filter);

      // Select fields excluding password
      const students = await User.find(filter)
        .select("-password -__v")
        .sort(sortOptions)
        .skip(skip)
        .limit(limit);

      // Calculate pagination metadata
      const totalPages = Math.ceil(total / limit);

      res.json({
        success: true,
        students,
        pagination: {
          currentPage: page,
          totalPages,
          totalStudents: total,
          hasMore: page < totalPages,
          limit,
        },
      });
    } catch (error) {
      console.error("Error fetching unassigned students:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch unassigned students",
        error: error.message,
      });
    }
  }
);

// Get instructor's sections
// GET /api/sections/my-sections
router.get(
  "/my-sections",
  protectRoute,
  authorizeRole(["instructor", "admin"]),
  async (req, res) => {
    try {
      const Section = await import("../models/Section.js").then(
        (module) => module.default
      );

      // Get sections where the instructor is the current user
      const sections = await Section.find({
        instructor: req.user.id,
        isActive: true,
      })
        .select("_id name description studentCount createdAt")
        .populate({
          path: "students",
          select: "fullName email",
        })
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        sections,
      });
    } catch (error) {
      console.error("Error fetching instructor sections:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch sections",
        error: error.message,
      });
    }
  }
);

// Get user's sections (for both instructors and students)
// GET /api/sections/user-sections
router.get("/user-sections", protectRoute, async (req, res) => {
  try {
    const Section = await import("../models/Section.js").then(
      (module) => module.default
    );
    const User = await import("../models/Users.js").then(
      (module) => module.default
    );

    let sections = [];

    if (req.user.privilege === "instructor" || req.user.privilege === "admin") {
      // For instructors and admins: get ALL sections
      sections = await Section.find({
        isActive: true,
      })
        .select("_id name description studentCount createdAt")
        .populate({
          path: "students",
          select: "fullName email",
        })
        .sort({ createdAt: -1 });
    } else {
      // For students: get sections they're assigned to
      const user = await User.findById(req.user.id).select("section");

      if (user && user.section && user.section !== "no_section") {
        // Try to find section by sectionCode first (new way)
        let section = await Section.findOne({
          sectionCode: user.section,
          isActive: true,
        })
          .select("_id name description studentCount createdAt")
          .populate({
            path: "students",
            select: "fullName email",
          });

        // If not found, try to find by section name (backward compatibility)
        if (!section) {
          section = await Section.findOne({
            name: user.section,
            isActive: true,
          })
            .select("_id name description studentCount createdAt")
            .populate({
              path: "students",
              select: "fullName email",
            });
        }

        if (section) {
          sections = [section];
        }
      }

      // Also check if user is in any section's students array (fallback)
      if (sections.length === 0) {
        const sectionsFromStudentsArray = await Section.find({
          students: req.user.id,
          isActive: true,
        })
          .select("_id name description studentCount createdAt")
          .populate({
            path: "students",
            select: "fullName email",
          });

        sections = sectionsFromStudentsArray;
      }
    }

    res.json({
      success: true,
      sections,
    });
  } catch (error) {
    console.error("Error fetching user sections:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch sections",
      error: error.message,
    });
  }
});

// Modify the GET /sections route
router.get(
  "/",
  protectRoute,
  authorizeRole(["instructor", "admin"]),
  async (req, res) => {
    try {
      const Section = await import("../models/Section.js").then(
        (module) => module.default
      );

      // Get query parameters for filtering, sorting, pagination
      const {
        search,
        sort = "createdAt",
        direction = "desc",
        page = 1,
        limit = 10,
      } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Build filter
      const filter = {};
      if (search) {
        filter.name = { $regex: search, $options: "i" };
      }

      // For instructors, only show sections they created or where they are the instructor
      if (req.user.privilege === "instructor") {
        filter.$or = [{ instructor: req.user.id }, { createdBy: req.user.id }];
      }
      // Admin can see all sections, so no additional filter needed for them

      // Set sort options
      const sortOptions = {};
      sortOptions[sort] = direction === "desc" ? -1 : 1;

      // Find sections with populated instructor data
      const sections = await Section.find(filter)
        .populate("instructor", "username email")
        .populate("createdBy", "username")
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit));

      // Get total count for pagination
      const total = await Section.countDocuments(filter);

      // Add instructor name to each section for easier display
      const sectionsWithInstructorName = sections.map((section) => {
        const sectionObj = section.toObject();
        if (sectionObj.instructor) {
          sectionObj.instructorName = sectionObj.instructor.username;
        }
        return sectionObj;
      });

      res.json({
        success: true,
        sections: sectionsWithInstructorName,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalSections: total,
        },
      });
    } catch (error) {
      console.error("Error fetching sections:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch sections",
        error: error.message,
      });
    }
  }
);

// Add this route to delete a section
router.delete(
  "/:id",
  protectRoute,
  authorizeRole(["instructor", "admin"]),
  async (req, res) => {
    try {
      const sectionId = req.params.id;

      // Find the section first to get its code
      const Section = await import("../models/Section.js").then(
        (module) => module.default
      );
      const section = await Section.findById(sectionId);

      if (!section) {
        return res.status(404).json({
          success: false,
          message: "Section not found",
        });
      }

      const sectionCode = section.sectionCode;

      // Update all students in this section back to no_section
      const User = await import("../models/Users.js").then(
        (module) => module.default
      );
      await User.updateMany(
        { section: sectionCode },
        { $set: { section: "no_section" } }
      );

      // Delete the section
      await Section.findByIdAndDelete(sectionId);

      res.json({
        success: true,
        message: `Section "${section.name}" deleted successfully`,
      });
    } catch (error) {
      console.error("Error deleting section:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete section",
        error: error.message,
      });
    }
  }
);

// GET /sections/:id/students - Get all students in a section
router.get(
  "/:id/students",
  protectRoute,
  authorizeRole(["instructor", "admin"]),
  async (req, res) => {
    try {
      const sectionId = req.params.id;

      // Find the section to get sectionCode and verify it exists
      const Section = await import("../models/Section.js").then(
        (module) => module.default
      );
      const section = await Section.findById(sectionId);

      if (!section) {
        return res.status(404).json({
          success: false,
          message: "Section not found",
        });
      }

      // Get all students with this section code
      const User = await import("../models/Users.js").then(
        (module) => module.default
      );
      const students = await User.find({
        section: section.sectionCode,
        privilege: "student",
      }).select("-password -__v");

      res.json({
        success: true,
        students,
        section: {
          _id: section._id,
          name: section.name,
          studentCount: students.length,
        },
      });
    } catch (error) {
      console.error("Error fetching section students:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch students for this class",
        error: error.message,
      });
    }
  }
);

// DELETE /sections/:id/students/:studentId - Remove a student from a section
router.delete(
  "/:id/students/:studentId",
  protectRoute,
  authorizeRole(["instructor", "admin"]),
  async (req, res) => {
    try {
      const { id: sectionId, studentId } = req.params;
      console.log("DELETE student request:", { sectionId, studentId });

      // Find the section
      const Section = await import("../models/Section.js").then(
        (module) => module.default
      );
      const section = await Section.findById(sectionId);
      console.log("Found section:", section ? section.name : "Not found");

      if (!section) {
        console.log("Section not found, returning 404");
        return res.status(404).json({
          success: false,
          message: "Section not found",
        });
      }

      // Find the student
      const User = await import("../models/Users.js").then(
        (module) => module.default
      );
      const student = await User.findById(studentId);
      console.log("Found student:", student ? student.fullName : "Not found");

      if (!student) {
        console.log("Student not found, returning 404");
        return res.status(404).json({
          success: false,
          message: "Student not found",
        });
      }

      // Check if student is in this section
      if (!section.students.includes(studentId)) {
        console.log(
          "Student not in section, current students:",
          section.students
        );
        return res.status(400).json({
          success: false,
          message: "Student is not assigned to this section",
        });
      }

      // Remove student from section's students array
      console.log("Removing student from section...");
      section.students = section.students.filter(
        (id) => id.toString() !== studentId.toString()
      );
      await section.save();
      console.log("Section updated, remaining students:", section.students);

      // Update student's section to "no_section"
      console.log("Updating student section to no_section...");
      await User.findByIdAndUpdate(studentId, {
        section: "no_section",
      });
      console.log("Student section updated successfully");

      console.log("Sending success response");
      res.json({
        success: true,
        message: "Student removed from section successfully",
        removedStudent: {
          id: student._id,
          fullName: student.fullName,
          email: student.email,
        },
      });
    } catch (error) {
      console.error("Error removing student from section:", error);
      res.status(500).json({
        success: false,
        message: "Failed to remove student from section",
        error: error.message,
      });
    }
  }
);

export default router;
