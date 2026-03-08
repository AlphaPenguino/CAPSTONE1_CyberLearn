import { API_URL } from "@/constants/api.js";

class SubjectsAPI {
  constructor() {
    this.baseURL = API_URL;
  }

  // Helper to get auth headers
  getHeaders(token, contentType = "application/json") {
    const headers = {
      Authorization: `Bearer ${token}`,
    };
    if (contentType) {
      headers["Content-Type"] = contentType;
    }
    return headers;
  }

  // Helper to handle API responses
  async handleResponse(response) {
    const contentType = response.headers.get("content-type");

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;

      try {
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } else {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        }
      } catch (parseError) {
        console.warn("Failed to parse error response:", parseError);
      }

      throw new Error(errorMessage);
    }

    try {
      if (contentType && contentType.includes("application/json")) {
        return await response.json();
      } else {
        return await response.text();
      }
    } catch (parseError) {
      console.warn("Failed to parse response:", parseError);
      return null;
    }
  }

  // Get all subjects for instructor/admin
  async getSubjects(token, options = {}) {
    const {
      search = "",
      sort = "createdAt",
      direction = "desc",
      page = 1,
      limit = 10,
    } = options;

    const params = new URLSearchParams({
      search,
      sort,
      direction,
      page: page.toString(),
      limit: limit.toString(),
    });

    const response = await fetch(`${this.baseURL}/subjects?${params}`, {
      headers: this.getHeaders(token, null),
    });

    return this.handleResponse(response);
  }

  // Get students assigned to a specific subject
  async getSubjectStudents(token, subjectId) {
    if (!subjectId) {
      throw new Error("Subject ID is required");
    }

    console.log(`📡 Fetching students for subject: ${subjectId}`);

    const response = await fetch(
      `${this.baseURL}/subjects/${subjectId}/students`,
      {
        headers: this.getHeaders(token, null),
      }
    );

    const result = await this.handleResponse(response);
    console.log(`📡 Subject students response:`, result);

    return result;
  }

  // Assign a student to a subject
  async assignStudentToSubject(token, subjectId, studentId) {
    if (!subjectId || !studentId) {
      throw new Error("Subject ID and Student ID are required");
    }

    console.log(`📡 Assigning student ${studentId} to subject ${subjectId}`);

    const response = await fetch(
      `${this.baseURL}/subjects/${subjectId}/students`,
      {
        method: "POST",
        headers: this.getHeaders(token),
        body: JSON.stringify({ studentId }),
      }
    );

    const result = await this.handleResponse(response);
    console.log(`📡 Assignment result:`, result);

    return result;
  }

  // Remove a student from a subject
  async removeStudentFromSubject(token, subjectId, studentId) {
    if (!subjectId || !studentId) {
      throw new Error("Subject ID and Student ID are required");
    }

    console.log(`📡 Removing student ${studentId} from subject ${subjectId}`);

    const response = await fetch(
      `${this.baseURL}/subjects/${subjectId}/students/${studentId}`,
      {
        method: "DELETE",
        headers: this.getHeaders(token, null),
      }
    );

    const result = await this.handleResponse(response);
    console.log(`📡 Removal result:`, result);

    return result;
  }

  // Create a new subject
  async createSubject(token, subjectData) {
    const { name, description, instructor } = subjectData;

    if (!name || name.trim().length < 3) {
      throw new Error("Subject name must be at least 3 characters long");
    }

    console.log(`📡 Creating subject:`, subjectData);

    const response = await fetch(`${this.baseURL}/subjects`, {
      method: "POST",
      headers: this.getHeaders(token),
      body: JSON.stringify({ name, description, instructor }),
    });

    const result = await this.handleResponse(response);
    console.log(`📡 Subject creation result:`, result);

    return result;
  }

  // Update a subject's name and description
  async updateSubject(token, subjectId, subjectData) {
    const { name, description } = subjectData;

    if (!subjectId) {
      throw new Error("Subject ID is required");
    }

    if (!name || name.trim().length < 3) {
      throw new Error("Subject name must be at least 3 characters long");
    }

    console.log(`📡 Updating subject ${subjectId}:`, subjectData);

    const response = await fetch(`${this.baseURL}/subjects/${subjectId}`, {
      method: "PUT",
      headers: this.getHeaders(token),
      body: JSON.stringify({ name, description }),
    });

    const result = await this.handleResponse(response);
    console.log(`📡 Subject update result:`, result);

    return result;
  }

  // Archive or unarchive a subject
  async archiveSubject(token, subjectId, archive = true) {
    if (!subjectId) {
      throw new Error("Subject ID is required");
    }

    console.log(
      `📡 ${archive ? "Archiving" : "Unarchiving"} subject ${subjectId}`
    );
    let response;
    try {
      response = await fetch(`${this.baseURL}/subjects/${subjectId}/archive`, {
        method: "PATCH",
        headers: this.getHeaders(token),
        body: JSON.stringify({ archive }),
      });
    } catch (networkErr) {
      console.warn(
        "PATCH archive failed, retrying with POST fallback:",
        networkErr
      );
      // Retry with POST fallback endpoint
      response = await fetch(`${this.baseURL}/subjects/${subjectId}/archive`, {
        method: "POST",
        headers: this.getHeaders(token),
        body: JSON.stringify({ archive }),
      });
    }

    try {
      const result = await this.handleResponse(response);
      console.log(
        `📡 Subject ${archive ? "archive" : "unarchive"} result:`,
        result
      );
      return result;
    } catch (err) {
      console.error("Archive/unarchive request failed:", err);
      throw err;
    }
  }

  // Delete a subject (and its associated cyber quests by default)
  async deleteSubject(token, subjectId, options = {}) {
    if (!subjectId) {
      throw new Error("Subject ID is required");
    }

    const { cascadeCyberQuests = true } = options;

    console.log(
      `📡 Deleting subject ${subjectId} (cascadeCyberQuests=${cascadeCyberQuests})`
    );

    const url = new URL(`${this.baseURL}/subjects/${subjectId}`);
    url.searchParams.set("cascadeCyberQuests", cascadeCyberQuests);

    const response = await fetch(url.toString(), {
      method: "DELETE",
      headers: this.getHeaders(token, null),
    });

    const result = await this.handleResponse(response);
    console.log("📡 Subject deletion result:", result);
    return result;
  }

  // Get instructors for a specific subject
  async getSubjectInstructors(token, subjectId) {
    if (!subjectId) {
      throw new Error("Subject ID is required");
    }

    console.log(`📡 Fetching instructors for subject: ${subjectId}`);

    const response = await fetch(
      `${this.baseURL}/subjects/${subjectId}/instructors`,
      {
        headers: this.getHeaders(token, null),
      }
    );

    const result = await this.handleResponse(response);
    console.log(`📡 Subject instructors response:`, result);

    return result;
  }

  // Add instructor to a subject
  async addInstructorToSubject(token, subjectId, instructorId) {
    if (!subjectId || !instructorId) {
      throw new Error("Subject ID and Instructor ID are required");
    }

    console.log(`📡 Adding instructor ${instructorId} to subject ${subjectId}`);

    const response = await fetch(
      `${this.baseURL}/subjects/${subjectId}/instructors`,
      {
        method: "POST",
        headers: this.getHeaders(token),
        body: JSON.stringify({ instructorId }),
      }
    );

    const result = await this.handleResponse(response);
    console.log(`📡 Add instructor result:`, result);

    return result;
  }

  // Remove instructor from a subject
  async removeInstructorFromSubject(token, subjectId, instructorId) {
    if (!subjectId || !instructorId) {
      throw new Error("Subject ID and Instructor ID are required");
    }

    console.log(
      `📡 Removing instructor ${instructorId} from subject ${subjectId}`
    );

    const response = await fetch(
      `${this.baseURL}/subjects/${subjectId}/instructors/${instructorId}`,
      {
        method: "DELETE",
        headers: this.getHeaders(token, null),
      }
    );

    const result = await this.handleResponse(response);
    console.log(`📡 Remove instructor result:`, result);

    return result;
  }

  // Fallback: try to get students from sections endpoint
  async getSubjectStudentsFallback(token, subjectId) {
    if (!subjectId) {
      throw new Error("Subject ID is required");
    }

    console.log(`📡 Fallback: Fetching students for section: ${subjectId}`);

    const response = await fetch(
      `${this.baseURL}/sections/${subjectId}/students`,
      {
        headers: this.getHeaders(token, null),
      }
    );

    const result = await this.handleResponse(response);
    console.log(`📡 Fallback section students response:`, result);

    return result;
  }
}

// Create singleton instance
export const subjectsAPI = new SubjectsAPI();
export default subjectsAPI;
