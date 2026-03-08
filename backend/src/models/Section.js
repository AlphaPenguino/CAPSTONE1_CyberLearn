import mongoose from "mongoose";

const sectionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Section name is required"],
      trim: true,
      unique: true,
      minlength: [3, "Section name must be at least 3 characters long"],
    },

    // Section code/ID for easy reference (auto-generated from name)
    sectionCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // Human-readable join code for students (e.g., "MATH101A")
    subjectCode: {
      type: String,
      unique: true,
      sparse: true, // allows multiple null values but unique non-null values
      trim: true,
      uppercase: true,
      minlength: [6, "Subject code must be at least 6 characters"],
      maxlength: [12, "Subject code must be at most 12 characters"],
    },

    // List of students in this section
    students: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // Primary instructor assigned to this section (for backward compatibility)
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Instructor is required"],
    },

    // Additional instructors who can manage this section
    instructors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // Additional metadata
    description: {
      type: String,
      default: "",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    // Soft delete: archived subjects are not deleted but hidden from regular view
    archived: {
      type: Boolean,
      default: false,
    },

    // Timestamp when the section was archived
    archivedAt: {
      type: Date,
      default: null,
    },

    // User who archived the section
    archivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Track when the section was created and by whom
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,

    // Add virtual methods for additional functionality
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for student count
sectionSchema.virtual("studentCount").get(function () {
  return this.students ? this.students.length : 0;
});

// Pre-save middleware to generate section code from name
sectionSchema.pre("save", function (next) {
  if (!this.sectionCode || this.isModified("name")) {
    // Convert name to lowercase, replace spaces with underscores
    this.sectionCode = this.name
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");
  }
  next();
});

// Static method to find sections by instructor
sectionSchema.statics.findByInstructor = function (instructorId) {
  return this.find({ instructor: instructorId }).populate(
    "instructor",
    "username email"
  );
};

// Static method to check if a section is at capacity
sectionSchema.methods.isAtCapacity = function () {
  return this.students.length >= this.capacity;
};

// Static method to add student to section
sectionSchema.methods.addStudent = function (studentId) {
  if (!this.students.includes(studentId)) {
    this.students.push(studentId);
  }
  return this.save();
};

// Static method to remove student from section
sectionSchema.methods.removeStudent = function (studentId) {
  this.students = this.students.filter(
    (id) => id.toString() !== studentId.toString()
  );
  return this.save();
};

// This should come AFTER all schema definitions and middleware
const Section = mongoose.model("Section", sectionSchema, "subjects");

export default Section;
