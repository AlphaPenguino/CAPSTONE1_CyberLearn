import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Platform,
  Switch,
} from "react-native";
import React, { useState, useEffect, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { API_URL, constructProfileImageUrl } from "@/constants/api";
import { useAuthStore } from "@/store/authStore";
import COLORS from "@/constants/custom-colors"; // role/accent mapping (static)
import { useTheme } from "@/contexts/ThemeContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import BulkImport from "../admin/bulk-import";

export default function UsersScreen({ hideHeader = false }) {
  const { token, user } = useAuthStore();
  const { colors } = useTheme();
  const router = useRouter();
  // Decide readable foreground color (black/white) based on background color luminance
  const getReadableTextColor = (bg) => {
    if (!bg) return "#000";
    let hex = bg.trim();
    if (hex.startsWith("rgb")) {
      const parts = hex
        .replace(/rgba?\(/, "")
        .replace(/\)/, "")
        .split(",")
        .map((p) => parseFloat(p));
      const [r, g, b] = parts;
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return lum > 0.6 ? "#000" : "#FFF";
    }
    if (hex[0] === "#") hex = hex.slice(1);
    if (hex.length === 3)
      hex = hex
        .split("")
        .map((c) => c + c)
        .join("");
    if (hex.length !== 6) return "#000";
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum > 0.6 ? "#000" : "#FFF";
  };
  const [users, setUsers] = useState([]);
  // Full-screen loading only for initial load or explicit heavy operations
  const [loading, setLoading] = useState(true);
  // Lightweight fetching flag so we can show a subtle indicator without unmounting the UI (prevents search box blur on web)
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newUser, setNewUser] = useState({
    username: "",
    fullName: "",
    email: "",
    password: "",
    section: "",
    role: "student", // Default role
  });
  const [sendAccountNotification, setSendAccountNotification] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [imageErrors, setImageErrors] = useState({});
  const [roleFilter, setRoleFilter] = useState("all"); // all | student | instructor | admin
  // NEW archived filter: active (default), archived, all
  const [archivedFilter, setArchivedFilter] = useState("active");
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  // Student analytics modal state
  const [analyticsModalVisible, setAnalyticsModalVisible] = useState(false);
  const [studentAnalytics, setStudentAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [profileModalLoading, setProfileModalLoading] = useState(false);
  const [profileModalError, setProfileModalError] = useState(null);
  const [selectedProfileData, setSelectedProfileData] = useState(null);
  const [profileDataCache, setProfileDataCache] = useState({});
  const [sectionsCatalog, setSectionsCatalog] = useState(null);
  const [backupModalVisible, setBackupModalVisible] = useState(false);
  const [bulkImportModalVisible, setBulkImportModalVisible] = useState(false);
  const [backupInProgress, setBackupInProgress] = useState(false);
  // Pagination state (server-side)
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const PAGE_LIMIT = 10; // limit to 10 users per page
  // NOTE: We request descending createdAt so newly created users show on page 1.

  // Theme-aware styles (must be defined before any early returns that use them)
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  // Function to handle image URLs for different platforms
  const getCompatibleImageUrl = (url) => {
    if (!url) return null;

    // First construct the full URL from filename if needed
    const fullUrl = constructProfileImageUrl(url);

    // Convert DiceBear SVGs to PNGs on Android
    if (fullUrl && fullUrl.includes("dicebear") && fullUrl.includes("/svg")) {
      if (Platform.OS === "android") {
        return fullUrl.replace("/svg", "/png");
      }
    }
    return fullUrl;
  };

  // Fetch users on component mount -> now with explicit page 1
  useEffect(() => {
    // Initial load with full-screen loader
    fetchUsers(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch on search / role changes (reset to page 1)
  useEffect(() => {
    // Subsequent search / filter changes should NOT trigger full-screen loader (keeps input focus on web)
    fetchUsers(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, roleFilter, archivedFilter]);

  // Fetch users from API (server pagination + filtering)
  // Fetch users from API (optionally show full-screen loader). We avoid full-screen loader after initial load to keep search input focus.
  const fetchUsers = async (
    targetPage = page,
    showFullScreenLoader = users.length === 0
  ) => {
    try {
      if (showFullScreenLoader) {
        setLoading(true);
      }
      setFetching(true);
      const params = new URLSearchParams();
      params.set("page", targetPage.toString());
      params.set("limit", PAGE_LIMIT.toString());
      params.set("sort", "createdAt");
      params.set("direction", "desc"); // newest first
      if (searchQuery) params.set("search", searchQuery);
      if (roleFilter !== "all") params.set("role", roleFilter);
      // archived filter handling
      if (archivedFilter === "archived") params.set("archived", "true");
      else if (archivedFilter === "active") params.set("archived", "false");
      const url = `${API_URL}/users?${params.toString()}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch users");
      }
      const data = await response.json();
      if (data.success && data.users) {
        setUsers(data.users);
        setPage(data.pagination?.currentPage || targetPage);
        setTotalPages(data.pagination?.totalPages || 1);
        setImageErrors({});
        setError(null);
      } else {
        throw new Error(data.message || "Failed to get users");
      }
    } catch (err) {
      console.error("Error fetching users:", err);
      setError(err.message);
    } finally {
      setFetching(false);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const triggerBackup = async (scope, label) => {
    try {
      setBackupInProgress(true);
      setBackupModalVisible(false);

      const response = await fetch(
        `${API_URL}/admin/backups/export?scope=${encodeURIComponent(scope)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to export backup");
      }

      if (Platform.OS === "web") {
        const blob = await response.blob();
        const contentDisposition = response.headers.get("content-disposition") || "";
        const fileNameMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
        const filename =
          fileNameMatch?.[1] ||
          `cyberlearn-backup-${scope}-${new Date()
            .toISOString()
            .replace(/[:.]/g, "-")}.json`;

        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
      } else {
        // Native fallback: show success and summary (download flow can be added with FileSystem/Sharing later)
        const payload = await response.json();
        const collectionsCount = Object.keys(payload?.counts || {}).length;
        showAlert(
          "Backup Ready",
          `${label} backup exported successfully (${collectionsCount} collections).`
        );
      }

      if (Platform.OS === "web") {
        showAlert("Backup Ready", `${label} backup downloaded successfully.`);
      }
    } catch (err) {
      showAlert("Backup Failed", err.message || "Failed to export backup");
    } finally {
      setBackupInProgress(false);
    }
  };

  const pickAndParseBackupJson = async () => {
    if (Platform.OS === "web") {
      return await new Promise((resolve, reject) => {
        try {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = "application/json,.json";
          input.onchange = async (event) => {
            try {
              const file = event.target.files?.[0];
              if (!file) {
                resolve(null);
                return;
              }
              const text = await file.text();
              resolve(JSON.parse(text));
            } catch (error) {
              reject(error);
            }
          };
          input.click();
        } catch (error) {
          reject(error);
        }
      });
    }

    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/json", "text/json"],
      multiple: false,
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.[0]?.uri) {
      return null;
    }

    const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    return JSON.parse(fileContent);
  };

  const triggerBackupImport = async () => {
    try {
      setBackupInProgress(true);
      setBackupModalVisible(false);

      const parsedBackup = await pickAndParseBackupJson();
      if (!parsedBackup) {
        return;
      }

      const response = await fetch(`${API_URL}/admin/backups/import`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ backup: parsedBackup }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Failed to import backup");
      }

      const totals = payload.totals || {};
      showAlert(
        "Backup Import Completed",
        `Inserted: ${totals.inserted || 0}\nIgnored Existing: ${totals.skippedExisting || 0}\nIgnored Duplicate in File: ${totals.skippedDuplicateInFile || 0}\nInvalid: ${totals.invalid || 0}\nFailed: ${totals.failed || 0}`
      );

      fetchUsers(1, false);
    } catch (err) {
      showAlert("Backup Import Failed", err.message || "Failed to import backup");
    } finally {
      setBackupInProgress(false);
    }
  };

  // Add new user
  const handleAddUser = async () => {
    // Validate input
    if (!newUser.username || !newUser.fullName || !newUser.email) {
      Alert.alert("Validation Error", "Please fill all required fields");
      return;
    }

    if (!sendAccountNotification && !newUser.password) {
      Alert.alert("Validation Error", "Please provide a password");
      return;
    }

    if (newUser.role === "student" && !String(newUser.section || "").trim()) {
      Alert.alert("Validation Error", "Please provide section for students");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        ...newUser,
        section:
          newUser.role === "student"
            ? String(newUser.section || "").trim()
            : "no_section",
        sendAccountNotification,
      };

      if (sendAccountNotification) {
        payload.password = "";
      }

      const response = await fetch(`${API_URL}/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create user");
      }

      // Clear form and close modal
      setNewUser({
        username: "",
        fullName: "",
        email: "",
        password: "",
        section: "",
        role: "student",
      });
      setSendAccountNotification(false);
      setModalVisible(false);

      // Refresh user list
      fetchUsers(1); // ensure new user appears at top
      const data = await response.json();
      Alert.alert("Success", data.message || "User created successfully");
    } catch (err) {
      showAlert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete user
  const handleDeleteUser = async (userId, displayName) => {
    showAlert(
      "Confirm Delete",
      `Are you sure you want to delete ${displayName}? This action cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              const response = await fetch(`${API_URL}/users/${userId}`, {
                method: "DELETE",
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });

              if (!response.ok) {
                throw new Error("Failed to delete user");
              }

              const data = await response.json();
              if (data.archived && !data.hardDeleted) {
                setUsers(
                  users.map((u) =>
                    u._id === userId ? { ...u, isArchived: true } : u
                  )
                );
                showAlert("Archived", "User archived successfully");
              } else {
                setUsers(users.filter((user) => user._id !== userId));
                showAlert("Success", "User deleted permanently");
              }
            } catch (err) {
              showAlert("Error", err.message);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // Archive / Unarchive toggle
  const handleArchiveToggle = async (userItem) => {
    const action = userItem.isArchived ? "unarchive" : "archive";
    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}/users/${userItem._id}/${action}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!response.ok) throw new Error(`Failed to ${action} user`);
      await response.json();
      setUsers(
        users.map((u) =>
          u._id === userItem._id
            ? { ...u, isArchived: !userItem.isArchived }
            : u
        )
      );
      showAlert(
        "Success",
        `User ${action === "archive" ? "archived" : "restored"} successfully`
      );
    } catch (err) {
      showAlert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle password change
  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      showAlert("Error", "Please fill in all password fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      showAlert("Error", "Passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      showAlert("Error", "Password should be at least 8 characters long");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/users/${selectedUser._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          password: newPassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to change password");
      }

      showAlert("Success", "Password changed successfully");
      setPasswordModalVisible(false);
      setNewPassword("");
      setConfirmPassword("");
      setSelectedUser(null);
    } catch (err) {
      showAlert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle opening password change modal
  const openPasswordModal = (user) => {
    setSelectedUser(user);
    setPasswordModalVisible(true);
  };

  // Fetch student analytics
  const fetchStudentAnalytics = async (userId) => {
    try {
      setAnalyticsLoading(true);
      const response = await fetch(
        `${API_URL}/admin/analytics/student-analytics/${userId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        setStudentAnalytics(result.data);
        setAnalyticsModalVisible(true);
      } else {
        const errorData = await response.json();
        Alert.alert("Error", errorData.message || "Failed to fetch analytics");
      }
    } catch (error) {
      console.error("Error fetching student analytics:", error);
      Alert.alert("Error", "Failed to fetch student analytics");
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Handle opening student analytics modal
  const openAnalyticsModal = (user) => {
    if (user.privilege === "student") {
      fetchStudentAnalytics(user._id);
    } else {
      Alert.alert("Info", "Analytics are only available for students");
    }
  };

  const getNormalizedRole = (account) =>
    (account?.privilege || account?.role || "student").toLowerCase();

  const getSubjectCode = (subject) =>
    subject?.subjectCode || subject?.sectionCode || "N/A";

  const fetchSectionsCatalog = async () => {
    if (Array.isArray(sectionsCatalog)) {
      return sectionsCatalog;
    }

    try {
      const response = await fetch(
        `${API_URL}/sections?page=1&limit=500&sort=createdAt&direction=desc`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        setSectionsCatalog([]);
        return [];
      }

      const payload = await response.json();
      const sections = Array.isArray(payload?.sections) ? payload.sections : [];
      setSectionsCatalog(sections);
      return sections;
    } catch (err) {
      console.warn("Unable to fetch sections for profile modal:", err);
      setSectionsCatalog([]);
      return [];
    }
  };

  const openUserProfileModal = async (userItem) => {
    const baseRole = getNormalizedRole(userItem);
    const fallbackProfile = {
      basic: {
        _id: String(userItem?._id || ""),
        username: userItem?.username || "N/A",
        fullName: userItem?.fullName || userItem?.username || "N/A",
        email: userItem?.email || "N/A",
        section: userItem?.section || userItem?.student?.section || "",
        profileImage: userItem?.profileImage || userItem?.profilePicture || null,
        role: baseRole,
      },
      student:
        baseRole === "student"
          ? {
              level: userItem?.gamification?.level || 1,
              totalXP: userItem?.gamification?.totalXP || 0,
              totalGamesPlayed: userItem?.analytics?.totalGamesPlayed || 0,
              cyberQuestGamesPlayed:
                userItem?.analytics?.gamesByType?.cyberQuest || 0,
              progress: {
                unlockedModules: 0,
                completedModules: 0,
              },
              enrolledSubjects: [],
            }
          : null,
      instructor:
        baseRole === "instructor"
          ? {
              handledSubjects: [],
              availableSubjects: [],
            }
          : null,
    };

    setProfileModalVisible(true);
    setProfileModalError(null);
    setSelectedProfileData(fallbackProfile);

    if (profileDataCache[userItem._id]) {
      setSelectedProfileData(profileDataCache[userItem._id]);
      return;
    }

    try {
      setProfileModalLoading(true);

      const userResponse = await fetch(`${API_URL}/users/${userItem._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      let fetchedUser = userItem;
      if (userResponse.ok) {
        const payload = await userResponse.json();
        if (payload?.success && payload?.user) {
          fetchedUser = payload.user;
        }
      }

      const role = getNormalizedRole(fetchedUser);
      const userId = String(fetchedUser?._id || userItem._id);
      const allSections = await fetchSectionsCatalog();

      const enrolledSubjects = allSections.filter((section) => {
        const studentIds = Array.isArray(section?.students)
          ? section.students.map((studentId) => String(studentId))
          : [];
        const isInStudentsArray = studentIds.includes(userId);

        const sectionCodes = Array.isArray(fetchedUser?.sections)
          ? fetchedUser.sections
          : [];
        const matchesSectionCode =
          String(fetchedUser?.section || "") === String(section?.sectionCode || "") ||
          sectionCodes.includes(section?.sectionCode);

        return isInStudentsArray || matchesSectionCode;
      });

      const handledSubjects = allSections.filter((section) => {
        const primaryInstructor = String(
          section?.instructor?._id || section?.instructor || ""
        );
        const additionalInstructors = Array.isArray(section?.instructors)
          ? section.instructors.map((inst) => String(inst?._id || inst))
          : [];
        const createdBy = String(section?.createdBy?._id || section?.createdBy || "");

        return (
          primaryInstructor === userId ||
          additionalInstructors.includes(userId) ||
          createdBy === userId
        );
      });

      const availableSubjects = allSections.filter((section) => {
        const isHandled = handledSubjects.some(
          (handled) => String(handled?._id) === String(section?._id)
        );
        return !isHandled && section?.archived !== true && section?.isActive !== false;
      });

      let studentProgress = null;
      if (role === "student") {
        try {
          const progressResponse = await fetch(
            `${API_URL}/progress/debug/${encodeURIComponent(userId)}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (progressResponse.ok) {
            studentProgress = await progressResponse.json();
          }
        } catch (progressErr) {
          console.warn("Unable to fetch student progress:", progressErr);
        }
      }

      const compiledProfile = {
        basic: {
          _id: userId,
          username: fetchedUser?.username || "N/A",
          fullName: fetchedUser?.fullName || fetchedUser?.username || "N/A",
          email: fetchedUser?.email || "N/A",
          section: fetchedUser?.section || fetchedUser?.student?.section || "",
          profileImage: fetchedUser?.profileImage || fetchedUser?.profilePicture || null,
          role,
        },
        student:
          role === "student"
            ? {
                level: fetchedUser?.gamification?.level || 1,
                totalXP: fetchedUser?.gamification?.totalXP || 0,
                totalGamesPlayed: fetchedUser?.analytics?.totalGamesPlayed || 0,
                cyberQuestGamesPlayed:
                  fetchedUser?.analytics?.gamesByType?.cyberQuest || 0,
                progress: {
                  unlockedModules:
                    studentProgress?.globalProgress?.unlockedModules || 0,
                  completedModules:
                    studentProgress?.globalProgress?.completedModules || 0,
                },
                enrolledSubjects,
              }
            : null,
        instructor:
          role === "instructor"
            ? {
                handledSubjects,
                availableSubjects,
              }
            : null,
      };

      setSelectedProfileData(compiledProfile);
      setProfileDataCache((prev) => ({ ...prev, [userItem._id]: compiledProfile }));
    } catch (err) {
      // Keep showing fallback data while surfacing non-blocking fetch issues.
      setProfileModalError(err.message || "Some profile details could not be loaded");
    } finally {
      setProfileModalLoading(false);
    }
  };

  // Mark image as having error
  const handleImageError = (userId) => {
    setImageErrors((prev) => ({
      ...prev,
      [userId]: true,
    }));
  };

  // Server already returns filtered page of users
  const filteredUsers = users;

  // Get role-specific properties
  const getRoleColor = (role) => {
    switch (role?.toLowerCase()) {
      case "instructor":
        return "#FF5722";
      case "admin":
        return "#673AB7";
      default:
        return COLORS.primary;
    }
  };

  const getRoleIcon = (role) => {
    switch (role?.toLowerCase()) {
      case "admin":
        return "shield-crown-outline";
      case "instructor":
        return "school-outline";
      default:
        return "account-outline";
    }
  };

  // Scroll handling
  const lastScrollY = useRef(0);
  // (Legacy scroll-hide filters removed)
  // New state for Filters Modal (to reduce inline space usage)
  const [filtersModalVisible, setFiltersModalVisible] = useState(false);

  const handleScroll = (event) => {
    // Retain last scroll for potential future UX (currently unused)
    lastScrollY.current = event.nativeEvent.contentOffset.y;
  };

  // Render item for FlatList
  const renderItem = ({ item }) => {
    const userImage = item.profileImage || item.profilePicture;
    const hasImageError = imageErrors[item._id];
    const role = item.role || item.privilege || "student";
    const roleColor = getRoleColor(role);
    const archived = item.isArchived;

    return (
      <View style={styles.userCard}>
        <TouchableOpacity
          style={styles.userInfoPressable}
          onPress={() => openUserProfileModal(item)}
          activeOpacity={0.84}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          <View style={styles.userInfo}>
            {userImage && !hasImageError ? (
              <Image
                source={{ uri: getCompatibleImageUrl(userImage) }}
                style={[styles.avatar, { borderColor: roleColor }]}
                onError={() => handleImageError(item._id)}
              />
            ) : (
              <View style={[styles.avatarFallback, { borderColor: roleColor }]}> 
                <MaterialCommunityIcons
                  name={getRoleIcon(role)}
                  size={28}
                  color={roleColor}
                />
              </View>
            )}

            <View style={styles.userDetails}>
              <Text
                style={[
                  styles.username,
                  archived && {
                    textDecorationLine: "line-through",
                    opacity: 0.6,
                  },
                ]}
              >
                {item.fullName || item.username} {archived ? "(Archived)" : ""}
              </Text>
              <Text style={styles.email}>{item.email}</Text>
              <View style={[styles.roleBadge, { backgroundColor: roleColor }]}> 
                <MaterialCommunityIcons
                  name={getRoleIcon(role)}
                  size={14}
                  color="#FFF"
                  style={styles.roleIcon}
                />
                <Text style={styles.roleText}>{role}</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {user?.privilege === "admin" ? (
          <View style={styles.userActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => openPasswordModal(item)}
            >
              <MaterialCommunityIcons
                name="key-outline"
                size={20}
                color={COLORS.warning || "#FF9800"}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleArchiveToggle(item)}
            >
              <MaterialCommunityIcons
                name={item.isArchived ? "backup-restore" : "archive-outline"}
                size={20}
                color={
                  item.isArchived
                    ? COLORS.success || "#4CAF50"
                    : COLORS.info || "#2196F3"
                }
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() =>
                handleDeleteUser(item._id, item.fullName || item.username)
              }
            >
              <MaterialCommunityIcons
                name="trash-can-outline"
                size={20}
                color={COLORS.error || "#F44336"}
              />
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    );
  };

  // Loading state
  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.centered}>
        <MaterialCommunityIcons
          name="alert-circle"
          size={50}
          color={COLORS.error || "#F44336"}
        />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchUsers}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <LinearGradient colors={["#caf1c8", "#5fd2cd"]} style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.pageWrapper}>
          {!hideHeader && (
            <View style={styles.header}>
              <Text style={styles.title}>Manage Users</Text>
              <View style={styles.headerButtons}>
                {user?.privilege === "admin" && (
                  <TouchableOpacity
                    style={styles.bulkUploadButton}
                    onPress={() => setBulkImportModalVisible(true)}
                  >
                    <MaterialCommunityIcons
                      name="upload"
                      size={20}
                      color="#FFF"
                    />
                    <Text style={styles.bulkUploadButtonText}>Bulk Upload</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => setModalVisible(true)}
                  activeOpacity={0.78}
                >
                  <MaterialCommunityIcons
                    name="account-plus"
                    size={24}
                    color="#FFF"
                  />
                  <Text style={styles.addButtonText}>Add User</Text>
                </TouchableOpacity>
                {user?.privilege === "admin" && (
                  <TouchableOpacity
                    style={styles.backupButton}
                    onPress={() => setBackupModalVisible(true)}
                    disabled={backupInProgress}
                    activeOpacity={0.78}
                  >
                    <MaterialCommunityIcons
                      name="database-export"
                      size={20}
                      color="#FFF"
                    />
                    <Text style={styles.backupButtonText}>
                      {backupInProgress ? "Backing up..." : "Backup"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Compact top bar with Search + Filters trigger */}
          <View style={styles.topBar}>
            <View style={styles.searchBarCompact}>
              <MaterialCommunityIcons
                name="magnify"
                size={20}
                color={colors.textSecondary}
              />
              <TextInput
                style={styles.searchInputCompact}
                placeholder="Search users..."
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <MaterialCommunityIcons
                    name="close"
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              ) : null}
              {fetching && !loading && (
                <ActivityIndicator
                  size="small"
                  color={colors.textSecondary}
                  style={{ marginLeft: 6 }}
                />
              )}
            </View>
            <TouchableOpacity
              style={styles.filtersButton}
              onPress={() => setFiltersModalVisible(true)}
            >
              <MaterialCommunityIcons
                name="filter-variant"
                size={22}
                color={colors.primaryContrast || "#FFF"}
              />
              <Text style={styles.filtersButtonText}>Filters</Text>
              {(roleFilter !== "all" || archivedFilter !== "active") && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>•</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Inline Actions (for embedded in Admin Dashboard) */}
          {hideHeader && (
            <View style={styles.inlineActions}>
              {user?.privilege === "admin" && (
                <TouchableOpacity
                  style={styles.bulkUploadButton}
                  onPress={() => setBulkImportModalVisible(true)}
                >
                  <MaterialCommunityIcons
                    name="upload"
                    size={20}
                    color="#FFF"
                  />
                  <Text style={styles.bulkUploadButtonText}>Bulk Upload</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setModalVisible(true)}
                  activeOpacity={0.78}
              >
                <MaterialCommunityIcons
                  name="account-plus"
                  size={24}
                  color="#FFF"
                />
                <Text style={styles.addButtonText}>Add User</Text>
              </TouchableOpacity>
              {user?.privilege === "admin" && (
                <TouchableOpacity
                  style={styles.backupButton}
                  onPress={() => setBackupModalVisible(true)}
                  disabled={backupInProgress}
                  activeOpacity={0.78}
                >
                  <MaterialCommunityIcons
                    name="database-export"
                    size={20}
                    color="#FFF"
                  />
                  <Text style={styles.backupButtonText}>
                    {backupInProgress ? "Backing up..." : "Backup"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* User List */}
          <FlatList
            data={filteredUsers}
            renderItem={renderItem}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContainer}
            refreshing={refreshing}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            onRefresh={() => {
              setRefreshing(true);
              fetchUsers(page);
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons
                  name="account-search"
                  size={60}
                  color={colors.textSecondary}
                />
                <Text style={styles.emptyText}>
                  {searchQuery
                    ? "No users match your search"
                    : "No users found"}
                </Text>
              </View>
            }
          />

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <View style={styles.paginationContainer}>
              <TouchableOpacity
                style={[
                  styles.pageButton,
                  page === 1 && styles.pageButtonDisabled,
                ]}
                disabled={page === 1}
                onPress={() => fetchUsers(page - 1)}
              >
                <Text
                  style={[
                    styles.pageButtonText,
                    page === 1 && styles.pageButtonTextDisabled,
                  ]}
                >
                  Prev
                </Text>
              </TouchableOpacity>
              <View style={styles.pageNumbersWrapper}>
                {Array.from({ length: totalPages }).map((_, i) => {
                  const pageNum = i + 1;
                  const showAll = totalPages <= 7;
                  const isEdge = pageNum === 1 || pageNum === totalPages;
                  const isNear = Math.abs(pageNum - page) <= 1;
                  if (!showAll && !isEdge && !isNear) {
                    if (pageNum === 2 || pageNum === totalPages - 1) {
                      return (
                        <Text key={pageNum} style={styles.ellipsis}>
                          ...
                        </Text>
                      );
                    }
                    return null;
                  }
                  const selected = pageNum === page;
                  return (
                    <TouchableOpacity
                      key={pageNum}
                      style={[
                        styles.pageNumber,
                        selected && styles.pageNumberSelected,
                      ]}
                      onPress={() => fetchUsers(pageNum)}
                    >
                      <Text
                        style={[
                          styles.pageNumberText,
                          selected && styles.pageNumberTextSelected,
                        ]}
                      >
                        {pageNum}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TouchableOpacity
                style={[
                  styles.pageButton,
                  page === totalPages && styles.pageButtonDisabled,
                ]}
                disabled={page === totalPages}
                onPress={() => fetchUsers(page + 1)}
              >
                <Text
                  style={[
                    styles.pageButtonText,
                    page === totalPages && styles.pageButtonTextDisabled,
                  ]}
                >
                  Next
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Add User Modal */}
          <Modal
            animationType="slide"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => {
              setModalVisible(false);
              setSendAccountNotification(false);
            }}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Add New User</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setModalVisible(false);
                      setSendAccountNotification(false);
                    }}
                  >
                    <MaterialCommunityIcons
                      name="close"
                      size={24}
                      color={COLORS.text}
                    />
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="email-address"
                  value={newUser.email}
                  onChangeText={(text) =>
                    setNewUser({ ...newUser, email: text })
                  }
                />
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  placeholderTextColor={colors.textSecondary}
                  value={newUser.fullName}
                  onChangeText={(text) =>
                    setNewUser({ ...newUser, fullName: text })
                  }
                />
                <TextInput
                  style={styles.input}
                  placeholder="Username"
                  placeholderTextColor={colors.textSecondary}
                  value={newUser.username}
                  onChangeText={(text) =>
                    setNewUser({ ...newUser, username: text })
                  }
                />
                {newUser.role === "student" && (
                  <TextInput
                    style={styles.input}
                    placeholder="Section"
                    placeholderTextColor={colors.textSecondary}
                    value={newUser.section}
                    onChangeText={(text) =>
                      setNewUser({ ...newUser, section: text })
                    }
                  />
                )}
                <View style={styles.notificationToggleRow}>
                  <View style={styles.notificationToggleTextWrap}>
                    <Text style={styles.notificationToggleTitle}>
                      Send notification to email.
                    </Text>
                    <Text style={styles.notificationToggleHint}>
                      When enabled, CyberLearn sends credentials to the user email.
                    </Text>
                  </View>
                  <Switch
                    value={sendAccountNotification}
                    onValueChange={setSendAccountNotification}
                  />
                </View>

                {!sendAccountNotification && (
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor={colors.textSecondary}
                    secureTextEntry
                    value={newUser.password}
                    onChangeText={(text) =>
                      setNewUser({ ...newUser, password: text })
                    }
                  />
                )}
                <Text style={styles.roleLabel}>Role:</Text>
                <View style={styles.roleContainer}>
                  {["student", "instructor", "admin"].map((role) => (
                    <TouchableOpacity
                      key={role}
                      style={[
                        styles.roleOption,
                        newUser.role === role && styles.roleOptionSelected,
                        { borderColor: getRoleColor(role) },
                      ]}
                      onPress={() =>
                        setNewUser({
                          ...newUser,
                          role,
                          section: role === "student" ? newUser.section : "",
                        })
                      }
                    >
                      <MaterialCommunityIcons
                        name={getRoleIcon(role)}
                        size={22}
                        color={
                          newUser.role === role ? "#FFF" : getRoleColor(role)
                        }
                      />
                      <Text
                        style={[
                          styles.roleOptionText,
                          newUser.role === role &&
                            styles.roleOptionTextSelected,
                        ]}
                      >
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleAddUser}
                >
                  <Text style={styles.submitButtonText}>Create User</Text>
                  <MaterialCommunityIcons
                    name="account-plus"
                    size={20}
                    color="#FFF"
                  />
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* Backup Options Modal */}
          <Modal
            animationType="fade"
            transparent={true}
            visible={backupModalVisible}
            onRequestClose={() => setBackupModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { maxWidth: 560 }]}> 
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Backup Options</Text>
                  <TouchableOpacity onPress={() => setBackupModalVisible(false)}>
                    <MaterialCommunityIcons
                      name="close"
                      size={24}
                      color={colors.text}
                    />
                  </TouchableOpacity>
                </View>

                <Text style={styles.backupHintText}>
                  Choose what data to include in this backup export.
                </Text>

                <TouchableOpacity
                  style={styles.backupOptionButton}
                  onPress={() => triggerBackup("all", "Full database")}
                  disabled={backupInProgress}
                >
                  <MaterialCommunityIcons
                    name="database"
                    size={20}
                    color={colors.primary}
                  />
                  <View style={styles.backupOptionTextWrap}>
                    <Text style={styles.backupOptionTitle}>Full Database</Text>
                    <Text style={styles.backupOptionDescription}>
                      Backup all collections and records in the database.
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.backupOptionButton}
                  onPress={() => triggerBackup("users", "Users and related data")}
                  disabled={backupInProgress}
                >
                  <MaterialCommunityIcons
                    name="account-group"
                    size={20}
                    color={colors.primary}
                  />
                  <View style={styles.backupOptionTextWrap}>
                    <Text style={styles.backupOptionTitle}>Users and Their Data</Text>
                    <Text style={styles.backupOptionDescription}>
                      Backup users, progress, levels, and audit logs.
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.backupOptionButton}
                  onPress={() => triggerBackup("subjects", "Subjects and CyberQuests")}
                  disabled={backupInProgress}
                >
                  <MaterialCommunityIcons
                    name="book-open-page-variant"
                    size={20}
                    color={colors.primary}
                  />
                  <View style={styles.backupOptionTextWrap}>
                    <Text style={styles.backupOptionTitle}>Subjects and CyberQuests</Text>
                    <Text style={styles.backupOptionDescription}>
                      Backup subject records and cyber quest content.
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.backupImportButton}
                  onPress={triggerBackupImport}
                  disabled={backupInProgress}
                >
                  <MaterialCommunityIcons
                    name="database-import"
                    size={20}
                    color="#FFF"
                  />
                  <Text style={styles.backupImportButtonText}>
                    {backupInProgress
                      ? "Processing Import..."
                      : "Import Backup (Merge Only)"}
                  </Text>
                </TouchableOpacity>

                <Text style={styles.backupImportHint}>
                  Existing data is preserved. Matching records are ignored; only new records are added.
                </Text>

                <TouchableOpacity
                  style={styles.clearFiltersButton}
                  onPress={() => setBackupModalVisible(false)}
                  disabled={backupInProgress}
                >
                  <Text style={styles.clearFiltersText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* Bulk Upload Modal */}
          <Modal
            animationType="fade"
            transparent={true}
            visible={bulkImportModalVisible}
            onRequestClose={() => setBulkImportModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.bulkImportModalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Bulk User Import</Text>
                  <TouchableOpacity onPress={() => setBulkImportModalVisible(false)}>
                    <MaterialCommunityIcons
                      name="close"
                      size={24}
                      color={colors.text}
                    />
                  </TouchableOpacity>
                </View>
                <View style={styles.bulkImportModalBody}>
                  <BulkImport
                    embedded={true}
                    onClose={() => setBulkImportModalVisible(false)}
                  />
                </View>
              </View>
            </View>
          </Modal>
          {/* Filters Modal */}
          <Modal
            animationType="fade"
            transparent={true}
            visible={filtersModalVisible}
            onRequestClose={() => setFiltersModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { maxWidth: 560 }]}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Filters</Text>
                  <TouchableOpacity
                    onPress={() => setFiltersModalVisible(false)}
                  >
                    <MaterialCommunityIcons
                      name="close"
                      size={24}
                      color={colors.text}
                    />
                  </TouchableOpacity>
                </View>
                <View style={styles.filtersSection}>
                  <Text style={styles.filtersLabel}>Role</Text>
                  <View style={styles.filtersRowWrap}>
                    {[
                      {
                        key: "all",
                        label: "All",
                        icon: "account-group-outline",
                        color: colors.textSecondary,
                      },
                      {
                        key: "student",
                        label: "Students",
                        icon: getRoleIcon("student"),
                        color: getRoleColor("student"),
                      },
                      {
                        key: "instructor",
                        label: "Instructors",
                        icon: getRoleIcon("instructor"),
                        color: getRoleColor("instructor"),
                      },
                      {
                        key: "admin",
                        label: "Admins",
                        icon: getRoleIcon("admin"),
                        color: getRoleColor("admin"),
                      },
                    ].map((f) => {
                      const selected = roleFilter === f.key;
                      return (
                        <TouchableOpacity
                          key={f.key}
                          onPress={() => setRoleFilter(f.key)}
                          style={[
                            styles.modalFilterChip,
                            selected && {
                              backgroundColor: f.color,
                              borderColor: f.color,
                            },
                          ]}
                        >
                          <MaterialCommunityIcons
                            name={f.icon}
                            size={16}
                            color={
                              selected ? getReadableTextColor(f.color) : f.color
                            }
                            style={{ marginRight: 6 }}
                          />
                          <Text
                            style={[
                              styles.modalFilterChipText,
                              selected && {
                                color: getReadableTextColor(f.color),
                              },
                            ]}
                          >
                            {f.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
                <View style={styles.filtersSection}>
                  <Text style={styles.filtersLabel}>Status</Text>
                  <View style={styles.filtersRowWrap}>
                    {[
                      {
                        key: "active",
                        label: "Active",
                        icon: "account-check-outline",
                        color: COLORS.success || "#4CAF50",
                      },
                      {
                        key: "archived",
                        label: "Archived",
                        icon: "archive-outline",
                        color: COLORS.info || "#2196F3",
                      },
                      {
                        key: "all",
                        label: "All Status",
                        icon: "swap-horizontal",
                        color: colors.textSecondary,
                      },
                    ].map((f) => {
                      const selected = archivedFilter === f.key;
                      return (
                        <TouchableOpacity
                          key={f.key}
                          onPress={() => setArchivedFilter(f.key)}
                          style={[
                            styles.modalFilterChip,
                            selected && {
                              backgroundColor: f.color,
                              borderColor: f.color,
                            },
                          ]}
                        >
                          <MaterialCommunityIcons
                            name={f.icon}
                            size={16}
                            color={
                              selected ? getReadableTextColor(f.color) : f.color
                            }
                            style={{ marginRight: 6 }}
                          />
                          <Text
                            style={[
                              styles.modalFilterChipText,
                              selected && {
                                color: getReadableTextColor(f.color),
                              },
                            ]}
                          >
                            {f.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
                <View style={styles.filtersFooter}>
                  <TouchableOpacity
                    style={styles.clearFiltersButton}
                    onPress={() => {
                      setRoleFilter("all");
                      setArchivedFilter("active");
                    }}
                  >
                    <MaterialCommunityIcons
                      name="backup-restore"
                      size={18}
                      color={colors.primary}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.clearFiltersText}>Reset</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.applyFiltersButton}
                    onPress={() => setFiltersModalVisible(false)}
                  >
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={18}
                      color="#FFF"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.applyFiltersText}>Apply</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* User Profile Modal */}
          <Modal
            animationType="fade"
            transparent={true}
            visible={profileModalVisible}
            onRequestClose={() => {
              setProfileModalVisible(false);
              setProfileModalError(null);
            }}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.profileModalContent}>
                <View style={[styles.modalHeader, styles.profileModalHeader]}>
                  <Text style={[styles.modalTitle, styles.profileModalTitle]}>
                    User Profile
                  </Text>
                  <TouchableOpacity
                    style={styles.profileCloseButton}
                    onPress={() => {
                      setProfileModalVisible(false);
                      setProfileModalError(null);
                    }}
                  >
                    <MaterialCommunityIcons
                      name="close"
                      size={22}
                      color={colors.text}
                    />
                  </TouchableOpacity>
                </View>

                {profileModalLoading && !selectedProfileData ? (
                  <View style={styles.centeredMini}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Loading user profile...</Text>
                  </View>
                ) : selectedProfileData ? (
                  <ScrollView
                    style={styles.profileScrollArea}
                    contentContainerStyle={styles.profileScrollContent}
                    showsVerticalScrollIndicator={true}
                  >
                    {profileModalError ? (
                      <View style={styles.profileInlineWarning}>
                        <MaterialCommunityIcons
                          name="alert-circle-outline"
                          size={16}
                          color={colors.warning || "#FF9800"}
                        />
                        <Text style={styles.profileInlineWarningText}>
                          {profileModalError}
                        </Text>
                      </View>
                    ) : null}

                    <LinearGradient
                      colors={[
                        "rgba(95, 210, 205, 0.28)",
                        "rgba(202, 241, 200, 0.18)",
                      ]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.profileHero}
                    >
                      <View style={styles.profileHeroTop}>
                        <View style={styles.profileAvatarBadge}>
                          {selectedProfileData.basic.profileImage &&
                          !imageErrors[selectedProfileData.basic._id] ? (
                            <Image
                              source={{
                                uri: getCompatibleImageUrl(
                                  selectedProfileData.basic.profileImage
                                ),
                              }}
                              style={styles.profileAvatarImage}
                              onError={() =>
                                handleImageError(selectedProfileData.basic._id)
                              }
                            />
                          ) : (
                            <MaterialCommunityIcons
                              name="account-circle-outline"
                              size={40}
                              color={colors.primary}
                            />
                          )}
                        </View>
                        <View style={styles.profileHeroTextWrap}>
                          <Text style={styles.profileHeroName}>
                            {selectedProfileData.basic.fullName}
                          </Text>
                          <Text style={styles.profileHeroUsername}>
                            @{selectedProfileData.basic.username}
                          </Text>
                        </View>
                        <View style={styles.profileRoleBadgePill}>
                          <Text style={styles.profileRoleBadgeText}>
                            {selectedProfileData.basic.role}
                          </Text>
                        </View>
                      </View>
                    </LinearGradient>

                    <View style={styles.profileCard}>
                      <Text style={styles.profileCardTitle}>Account Details</Text>
                      <View style={styles.profileInfoRow}>
                        <Text style={styles.profileInfoLabel}>Username</Text>
                        <Text style={styles.profileInfoValue}>
                          {selectedProfileData.basic.username}
                        </Text>
                      </View>
                      <View style={styles.profileInfoDivider} />
                      <View style={styles.profileInfoRow}>
                        <Text style={styles.profileInfoLabel}>Name</Text>
                        <Text style={styles.profileInfoValue}>
                          {selectedProfileData.basic.fullName}
                        </Text>
                      </View>
                      <View style={styles.profileInfoDivider} />
                      <View style={styles.profileInfoRow}>
                        <Text style={styles.profileInfoLabel}>Email</Text>
                        <Text style={styles.profileInfoValue}>
                          {selectedProfileData.basic.email}
                        </Text>
                      </View>
                      <View style={styles.profileInfoDivider} />
                      <View style={styles.profileInfoRow}>
                        <Text style={styles.profileInfoLabel}>Role</Text>
                        <Text style={styles.profileInfoValue}>
                          {selectedProfileData.basic.role}
                        </Text>
                      </View>
                      {selectedProfileData.basic.role === "student" && (
                        <>
                          <View style={styles.profileInfoDivider} />
                          <View style={styles.profileInfoRow}>
                            <Text style={styles.profileInfoLabel}>Section</Text>
                            <Text style={styles.profileInfoValue}>
                              {selectedProfileData.basic.section || "N/A"}
                            </Text>
                          </View>
                        </>
                      )}
                    </View>

                    {selectedProfileData.student && (
                      <>
                        <View style={styles.profileCard}>
                          <Text style={styles.profileCardTitle}>
                            Student CyberQuest Progress
                          </Text>
                          <View style={styles.profileStatsWrap}>
                            <View style={styles.profileStatChip}>
                              <Text style={styles.profileStatLabel}>Level</Text>
                              <Text style={styles.profileStatValue}>
                                {selectedProfileData.student.level}
                              </Text>
                            </View>
                            <View style={styles.profileStatChip}>
                              <Text style={styles.profileStatLabel}>XP</Text>
                              <Text style={styles.profileStatValue}>
                                {selectedProfileData.student.totalXP}
                              </Text>
                            </View>
                            <View style={styles.profileStatChip}>
                              <Text style={styles.profileStatLabel}>All Games</Text>
                              <Text style={styles.profileStatValue}>
                                {selectedProfileData.student.totalGamesPlayed}
                              </Text>
                            </View>
                            <View style={styles.profileStatChip}>
                              <Text style={styles.profileStatLabel}>CyberQuest</Text>
                              <Text style={styles.profileStatValue}>
                                {selectedProfileData.student.cyberQuestGamesPlayed}
                              </Text>
                            </View>
                          </View>
                        </View>

                        <View style={styles.profileCard}>
                          <View style={styles.profileSectionHeaderRow}>
                            <Text style={styles.profileCardTitle}>Enrolled Subjects</Text>
                            <Text style={styles.profileSectionCount}>
                              {selectedProfileData.student.enrolledSubjects.length}
                            </Text>
                          </View>
                          {selectedProfileData.student.enrolledSubjects.length > 0 ? (
                            selectedProfileData.student.enrolledSubjects.map((subject) => (
                              <View
                                key={String(subject._id)}
                                style={styles.profileSubjectItem}
                              >
                                <View style={styles.profileSubjectRow}>
                                  <MaterialCommunityIcons
                                    name="book-open-page-variant"
                                    size={16}
                                    color={colors.primary}
                                  />
                                  <Text style={styles.profileSubjectName}>
                                    {subject.name}
                                  </Text>
                                </View>
                                <Text style={styles.profileSubjectMeta}>
                                  Code: {getSubjectCode(subject)}
                                </Text>
                              </View>
                            ))
                          ) : (
                            <Text style={styles.profileEmptyText}>
                              No enrolled subjects found.
                            </Text>
                          )}
                        </View>
                      </>
                    )}

                    {selectedProfileData.instructor && (
                      <>
                        <View style={styles.profileCard}>
                          <View style={styles.profileSectionHeaderRow}>
                            <Text style={styles.profileCardTitle}>Handled Subjects</Text>
                            <Text style={styles.profileSectionCount}>
                              {selectedProfileData.instructor.handledSubjects.length}
                            </Text>
                          </View>
                          {selectedProfileData.instructor.handledSubjects.length > 0 ? (
                            selectedProfileData.instructor.handledSubjects.map((subject) => (
                              <View
                                key={String(subject._id)}
                                style={styles.profileSubjectItem}
                              >
                                <View style={styles.profileSubjectRow}>
                                  <MaterialCommunityIcons
                                    name="school-outline"
                                    size={16}
                                    color={colors.primary}
                                  />
                                  <Text style={styles.profileSubjectName}>
                                    {subject.name}
                                  </Text>
                                </View>
                                <Text style={styles.profileSubjectMeta}>
                                  Code: {getSubjectCode(subject)}
                                </Text>
                              </View>
                            ))
                          ) : (
                            <Text style={styles.profileEmptyText}>
                              No handled subjects found.
                            </Text>
                          )}
                        </View>

                        <View style={styles.profileCard}>
                          <View style={styles.profileSectionHeaderRow}>
                            <Text style={styles.profileCardTitle}>Available Subjects</Text>
                            <Text style={styles.profileSectionCount}>
                              {selectedProfileData.instructor.availableSubjects.length}
                            </Text>
                          </View>
                          {selectedProfileData.instructor.availableSubjects.length > 0 ? (
                            selectedProfileData.instructor.availableSubjects.map((subject) => (
                              <View
                                key={String(subject._id)}
                                style={styles.profileSubjectItem}
                              >
                                <View style={styles.profileSubjectRow}>
                                  <MaterialCommunityIcons
                                    name="book-outline"
                                    size={16}
                                    color={colors.primary}
                                  />
                                  <Text style={styles.profileSubjectName}>
                                    {subject.name}
                                  </Text>
                                </View>
                                <Text style={styles.profileSubjectMeta}>
                                  Code: {getSubjectCode(subject)}
                                </Text>
                              </View>
                            ))
                          ) : (
                            <Text style={styles.profileEmptyText}>
                              No available subjects found.
                            </Text>
                          )}
                        </View>
                      </>
                    )}
                  </ScrollView>
                ) : (
                  <View style={styles.centeredMini}>
                    <Text style={styles.profileEmptyText}>No profile data available.</Text>
                  </View>
                )}
              </View>
            </View>
          </Modal>

          {/* Password Change Modal */}
          <Modal
            animationType="slide"
            transparent={true}
            visible={passwordModalVisible}
            onRequestClose={() => {
              setPasswordModalVisible(false);
              setNewPassword("");
              setConfirmPassword("");
              setSelectedUser(null);
            }}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    Change Password for{" "}
                    {selectedUser?.fullName || selectedUser?.username}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setPasswordModalVisible(false);
                      setNewPassword("");
                      setConfirmPassword("");
                      setSelectedUser(null);
                    }}
                  >
                    <MaterialCommunityIcons
                      name="close"
                      size={24}
                      color={COLORS.text}
                    />
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={styles.input}
                  placeholder="New Password"
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry
                  value={newPassword}
                  onChangeText={setNewPassword}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm New Password"
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />

                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleChangePassword}
                  disabled={loading}
                >
                  <Text style={styles.submitButtonText}>
                    {loading ? "Changing..." : "Change Password"}
                  </Text>
                  <MaterialCommunityIcons
                    name="key-outline"
                    size={20}
                    color="#FFF"
                  />
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* Student Analytics Modal */}
          <Modal
            animationType="slide"
            transparent={true}
            visible={analyticsModalVisible}
            onRequestClose={() => {
              setAnalyticsModalVisible(false);
              setStudentAnalytics(null);
            }}
          >
            <View style={styles.modalOverlay}>
              <View
                style={[
                  styles.modalContent,
                  { maxHeight: "90%", width: "95%" },
                ]}
              >
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    📊 Student Analytics: {studentAnalytics?.student?.username}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setAnalyticsModalVisible(false);
                      setStudentAnalytics(null);
                    }}
                  >
                    <MaterialCommunityIcons
                      name="close"
                      size={24}
                      color={colors.text}
                    />
                  </TouchableOpacity>
                </View>

                {analyticsLoading ? (
                  <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text
                      style={[
                        styles.loadingText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Loading analytics...
                    </Text>
                  </View>
                ) : studentAnalytics ? (
                  <View style={{ flex: 1 }}>
                    <View style={styles.scrollContainer}>
                      {/* Progress Summary */}
                      <View style={styles.analyticsCard}>
                        <Text style={styles.analyticsCardTitle}>
                          📈 Progress Summary
                        </Text>
                        <View style={styles.analyticsRow}>
                          <Text
                            style={[
                              styles.analyticsLabel,
                              { color: colors.text },
                            ]}
                          >
                            Current Level:{" "}
                            {studentAnalytics.progress.currentLevel}
                          </Text>
                          <Text
                            style={[
                              styles.analyticsValue,
                              { color: colors.primary },
                            ]}
                          >
                            {studentAnalytics.progress.totalXP} XP
                          </Text>
                        </View>
                        <View style={styles.analyticsRow}>
                          <Text
                            style={[
                              styles.analyticsLabel,
                              { color: colors.text },
                            ]}
                          >
                            Modules Completed:{" "}
                            {studentAnalytics.progress.completedModules}
                          </Text>
                          <Text
                            style={[
                              styles.analyticsLabel,
                              { color: colors.text },
                            ]}
                          >
                            Modules Unlocked:{" "}
                            {studentAnalytics.progress.unlockedModules}
                          </Text>
                        </View>
                      </View>

                      {/* Quiz Statistics */}
                      <View style={styles.analyticsCard}>
                        <Text style={styles.analyticsCardTitle}>
                          🎯 Quiz Performance
                        </Text>
                        <View style={styles.analyticsRow}>
                          <Text
                            style={[
                              styles.analyticsLabel,
                              { color: colors.text },
                            ]}
                          >
                            Total Quizzes:{" "}
                            {studentAnalytics.analytics.totalQuizzesCompleted}
                          </Text>
                          <Text
                            style={[
                              styles.analyticsValue,
                              { color: colors.success || "#4CAF50" },
                            ]}
                          >
                            Avg: {studentAnalytics.analytics.averageScore}%
                          </Text>
                        </View>
                        <View style={styles.analyticsRow}>
                          <Text
                            style={[
                              styles.analyticsLabel,
                              { color: colors.text },
                            ]}
                          >
                            Total Time:{" "}
                            {Math.round(
                              (studentAnalytics.analytics.totalTimeSpent || 0) /
                                60
                            )}{" "}
                            minutes
                          </Text>
                        </View>
                      </View>

                      {/* Subject Breakdown */}
                      <View style={styles.analyticsCard}>
                        <Text style={styles.analyticsCardTitle}>
                          📚 Subject Performance
                        </Text>
                        {Object.entries(
                          studentAnalytics.analytics.subjectBreakdown
                        ).map(([subject, data]) => (
                          <View key={subject} style={styles.analyticsRow}>
                            <Text
                              style={[
                                styles.analyticsLabel,
                                { color: colors.text, flex: 2 },
                              ]}
                            >
                              {subject}: {data.count} quizzes
                            </Text>
                            <Text
                              style={[
                                styles.analyticsValue,
                                { color: colors.primary },
                              ]}
                            >
                              {data.averageScore}%
                            </Text>
                          </View>
                        ))}
                      </View>

                      {/* Recent Activity */}
                      <View style={styles.analyticsCard}>
                        <Text style={styles.analyticsCardTitle}>
                          📝 Recent Quiz Activity
                        </Text>
                        {studentAnalytics.analytics.recentActivity
                          .slice(0, 5)
                          .map((quiz, index) => (
                            <View key={index} style={styles.activityItem}>
                              <Text
                                style={[
                                  styles.activityTitle,
                                  { color: colors.text },
                                ]}
                              >
                                {quiz.quizTitle}
                              </Text>
                              <Text
                                style={[
                                  styles.activityModule,
                                  { color: colors.textSecondary },
                                ]}
                              >
                                {quiz.moduleTitle} • {quiz.subject}
                              </Text>
                              <View style={styles.activityMeta}>
                                <Text
                                  style={[
                                    styles.activityScore,
                                    {
                                      color:
                                        quiz.percentage >= 70
                                          ? colors.success || "#4CAF50"
                                          : colors.warning || "#FF9800",
                                    },
                                  ]}
                                >
                                  {quiz.percentage}%
                                </Text>
                                <Text
                                  style={[
                                    styles.activityDate,
                                    { color: colors.textSecondary },
                                  ]}
                                >
                                  {new Date(
                                    quiz.completedAt
                                  ).toLocaleDateString()}
                                </Text>
                              </View>
                            </View>
                          ))}
                      </View>
                    </View>
                  </View>
                ) : (
                  <Text
                    style={[styles.errorText, { color: colors.textSecondary }]}
                  >
                    No analytics data available
                  </Text>
                )}
              </View>
            </View>
          </Modal>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

// Dynamic styles factory (theme-aware)
const createStyles = (colors) => {
  const isSmallWeb =
    typeof window !== "undefined" && window.innerWidth < 600;
  const horizontalInset = Platform.OS === "android" ? 12 : isSmallWeb ? 12 : 0;

  return StyleSheet.create({
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      marginTop: 5, // Reduced from 10 to position higher
      marginBottom: 6, // Reduced from 10
      marginHorizontal:
        typeof window !== "undefined" && window.innerWidth < 600 ? 8 : 0,
      paddingHorizontal: 12,
      paddingVertical: 6, // Reduced from 8 for more compact height
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
      // Add position relative for possible absolute positioning of dropdown results
      position: "relative",
      zIndex: 10,
    },
    searchInput: {
      flex: 1,
      marginLeft: 6,
      color: colors.text,
      fontSize: 15,
      height: Platform.OS === "ios" ? 30 : 34, // Further reduced height
    },
    // (Removed legacy inline filter chip styles after modal refactor)
    // New compact top bar styles
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: Platform.OS === "android" ? 12 : isSmallWeb ? 8 : 0,
      marginTop: 8,
      marginBottom: 10,
    },
    searchBarCompact: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchInputCompact: {
      flex: 1,
      marginLeft: 6,
      color: colors.text,
      fontSize: 15,
      height: Platform.OS === "ios" ? 30 : 34,
    },
    filtersButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primary,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 10,
      position: "relative",
    },
    filtersButtonText: {
      color: "#FFF",
      fontWeight: "600",
      marginLeft: 6,
      fontSize: 15,
    },
    filterBadge: {
      position: "absolute",
      top: -4,
      right: -4,
      backgroundColor: colors.accent || "#FF9800",
      width: 18,
      height: 18,
      borderRadius: 9,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: colors.card,
    },
    filterBadgeText: { color: "#FFF", fontSize: 12, fontWeight: "bold" },
    // Modal filters
    filtersSection: { marginBottom: 20 },
    filtersLabel: {
      fontSize: 16,
      fontWeight: "700",
      marginBottom: 10,
      color: colors.text,
    },
    filtersRowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    modalFilterChip: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: colors.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalFilterChipText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
    },
    filtersFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 10,
    },
    clearFiltersButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
      paddingHorizontal: 14,
      backgroundColor: colors.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    clearFiltersText: {
      color: colors.primary,
      fontWeight: "600",
      fontSize: 14,
    },
    applyFiltersButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
      paddingHorizontal: 18,
      backgroundColor: colors.primary,
      borderRadius: 8,
    },
    applyFiltersText: { color: "#FFF", fontWeight: "700", fontSize: 14 },
    container: { flex: 1, backgroundColor: colors.background },
    safeArea: { flex: 1 },
    pageWrapper: {
      flex: 1,
      width: "100%",
      maxWidth: 1200,
      alignSelf: "center",
      // Keep edge spacing on Android and small web viewports.
      paddingHorizontal: horizontalInset,
    },
    centered: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.background,
      padding: 20,
    },
    loadingText: { marginTop: 10, fontSize: 16, color: colors.text },
    errorText: {
      marginTop: 10,
      color: colors.error || COLORS.error || "#F44336",
      fontSize: 16,
      textAlign: "center",
    },
    retryButton: {
      marginTop: 20,
      backgroundColor: colors.primary,
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 5,
    },
    retryButtonText: { color: "#FFFFFF", fontWeight: "bold" },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 20,
      paddingHorizontal: horizontalInset,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.card,
    },
    title: { fontSize: 24, fontWeight: "bold", color: colors.text },
    headerButtons: { flexDirection: "row", alignItems: "center", gap: 12 },
    addButton: {
      flexDirection: "row",
      backgroundColor: colors.primary,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 10,
      alignItems: "center",
      minHeight: 44,
      flexShrink: 1,
      flex: 1,
    },
    addButtonText: { color: "#FFFFFF", fontWeight: "bold", marginLeft: 4 },
    bulkUploadButton: {
      flexDirection: "row",
      backgroundColor: colors.accent || colors.secondary || colors.primary,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 10,
      alignItems: "center",
      minHeight: 44,
      flexShrink: 1,
      flex: 1,
    },
    bulkUploadButtonText: {
      color: "#FFFFFF",
      fontWeight: "600",
      marginLeft: 6,
      fontSize: 15,
    },
    backupButton: {
      flexDirection: "row",
      backgroundColor: colors.success || "#4CAF50",
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 10,
      alignItems: "center",
      minHeight: 44,
      flexShrink: 1,
    },
    backupButtonText: {
      color: "#FFFFFF",
      fontWeight: "600",
      marginLeft: 6,
      fontSize: 15,
    },
    backupImportButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 10,
      backgroundColor: colors.primary,
      marginTop: 6,
      marginBottom: 6,
    },
    backupImportButtonText: {
      color: "#FFF",
      fontWeight: "700",
      marginLeft: 8,
      fontSize: 14,
    },
    backupImportHint: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 10,
      lineHeight: 17,
    },

    listContainer: {
      paddingVertical: 16,
      paddingHorizontal: horizontalInset,
    },
    inlineActions: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      paddingHorizontal: horizontalInset,
      marginBottom: 12,
      width: "100%",
    },

    filterRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 8,
    },
    filterChip: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      borderWidth: 1.5,
      backgroundColor: colors.card,
      marginBottom: 8,
      minWidth: 0,
      elevation: 1,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
    },

    userCard: {
      flexDirection: "row",
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      alignItems: "center",
      justifyContent: "space-between",
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
    },
    userInfoPressable: {
      flex: 1,
      borderRadius: 10,
    },
    userInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.background,
      borderWidth: 2,
      borderColor: colors.primary,
    },
    avatarFallback: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.background,
      borderWidth: 2,
      borderColor: colors.primary,
      justifyContent: "center",
      alignItems: "center",
    },
    userDetails: { marginLeft: 14, flex: 1 },
    username: {
      fontSize: 17,
      fontWeight: "bold",
      color: colors.text,
      marginBottom: 2,
    },
    email: { fontSize: 14, color: colors.textSecondary, marginBottom: 6 },
    roleBadge: {
      flexDirection: "row",
      alignSelf: "flex-start",
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 12,
      backgroundColor: colors.primary,
      alignItems: "center",
    },
    roleIcon: { marginRight: 4 },
    roleText: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "600",
      textTransform: "capitalize",
    },
    userActions: { flexDirection: "row", alignItems: "center", gap: 8 },
    actionButton: {
      padding: 8,
      borderRadius: 6,
      backgroundColor: colors.background,
    },
    deleteButton: {
      padding: 8,
      borderRadius: 6,
      backgroundColor: colors.background,
    },
    emptyContainer: {
      alignItems: "center",
      justifyContent: "center",
      padding: 40,
      backgroundColor: colors.card,
      borderRadius: 12,
      marginTop: 20,
    },
    emptyText: {
      marginTop: 16,
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: "center",
    },
    modalOverlay: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(0,0,0,0.5)",
      padding: Platform.OS === "web" ? 20 : 8,
    },
    modalContent: {
      backgroundColor: colors.card,
      width: "100%",
      maxWidth: 500,
      borderRadius: 16,
      padding: 24,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 10,
    },
    profileModalContent: {
      backgroundColor: colors.card,
      width: Platform.OS === "web" ? "88%" : "96%",
      maxWidth: Platform.OS === "web" ? 760 : 560,
      height: Platform.OS === "web" ? "85%" : "90%",
      minHeight: Platform.OS === "web" ? 460 : 380,
      maxHeight: Platform.OS === "web" ? "85%" : "92%",
      borderRadius: 20,
      padding: Platform.OS === "web" ? 20 : 14,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 10,
    },
    bulkImportModalContent: {
      backgroundColor: colors.card,
      width: "100%",
      maxWidth: Platform.OS === "web" ? 1200 : 760,
      height: Platform.OS === "web" ? "90%" : "94%",
      minHeight: Platform.OS === "web" ? 520 : 360,
      maxHeight: Platform.OS === "web" ? "90%" : "96%",
      borderRadius: Platform.OS === "web" ? 16 : 12,
      padding: Platform.OS === "web" ? 18 : 12,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 10,
    },
    bulkImportModalBody: {
      flex: 1,
      minHeight: Platform.OS === "web" ? 420 : 320,
      maxHeight: "100%",
      overflow: "hidden",
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: { fontSize: 22, fontWeight: "bold", color: colors.text },
    profileModalHeader: {
      marginBottom: 14,
      paddingBottom: 10,
    },
    profileModalTitle: {
      fontSize: Platform.OS === "web" ? 24 : 21,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: 0.2,
    },
    profileCloseButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    profileScrollArea: {
      flex: 1,
      minHeight: 0,
      width: "100%",
    },
    profileScrollContent: {
      paddingBottom: 10,
      flexGrow: 1,
    },
    profileHero: {
      borderRadius: 16,
      padding: Platform.OS === "web" ? 14 : 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    profileHeroTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    profileAvatarBadge: {
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    profileAvatarImage: {
      width: "100%",
      height: "100%",
      borderRadius: 28,
    },
    profileHeroTextWrap: {
      flex: 1,
    },
    profileHeroName: {
      fontSize: Platform.OS === "web" ? 20 : 18,
      fontWeight: "800",
      color: colors.text,
      lineHeight: 26,
    },
    profileHeroUsername: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: "600",
      marginTop: 2,
    },
    profileRoleBadgePill: {
      backgroundColor: colors.primary,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    profileRoleBadgeText: {
      color: colors.primaryContrast || "#fff",
      fontSize: 11,
      fontWeight: "800",
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    profileCard: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 2,
      elevation: 1,
    },
    profileCardTitle: {
      fontSize: 17,
      fontWeight: "800",
      color: colors.text,
      marginBottom: 10,
    },
    profileInfoRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 10,
      paddingVertical: 6,
    },
    profileInfoLabel: {
      flex: 1,
      fontSize: 13,
      fontWeight: "700",
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.3,
    },
    profileInfoValue: {
      flex: 2,
      fontSize: 14,
      color: colors.text,
      fontWeight: "700",
      textAlign: "right",
    },
    profileInfoDivider: {
      height: 1,
      backgroundColor: colors.border,
      opacity: 0.7,
    },
    profileStatsWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    profileStatChip: {
      width: Platform.OS === "web" ? "31.5%" : "48%",
      minWidth: 120,
      backgroundColor: colors.card,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 10,
      paddingHorizontal: 10,
    },
    profileStatLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.3,
      marginBottom: 4,
    },
    profileStatValue: {
      fontSize: 17,
      fontWeight: "800",
      color: colors.text,
    },
    profileSectionHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    profileSectionCount: {
      minWidth: 26,
      textAlign: "center",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      fontSize: 12,
      fontWeight: "800",
      color: colors.primary,
      overflow: "hidden",
    },
    profileSubjectItem: {
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 10,
      paddingHorizontal: 12,
      marginBottom: 8,
    },
    profileSubjectRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 3,
    },
    profileSubjectName: {
      fontSize: 14,
      fontWeight: "800",
      color: colors.text,
      flex: 1,
    },
    profileSubjectMeta: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: "600",
    },
    profileEmptyText: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
      textAlign: "center",
      fontWeight: "600",
    },
    centeredMini: {
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 30,
      paddingHorizontal: 16,
    },
    profileInlineWarning: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: "rgba(255, 152, 0, 0.12)",
      borderWidth: 1,
      borderColor: "rgba(255, 152, 0, 0.35)",
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
      marginBottom: 10,
    },
    profileInlineWarningText: {
      flex: 1,
      fontSize: 12,
      fontWeight: "600",
      color: colors.text,
      lineHeight: 18,
    },
    backupHintText: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 14,
    },
    backupOptionButton: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      marginBottom: 10,
    },
    backupOptionTextWrap: {
      flex: 1,
    },
    backupOptionTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 2,
    },
    backupOptionDescription: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    input: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: 14,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.text,
      fontSize: 16,
    },
    roleLabel: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 10,
      marginTop: 8,
    },
    roleContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 24,
    },
    roleOption: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 5,
      alignItems: "center",
      borderWidth: 2,
      borderColor: colors.border,
      marginHorizontal: 4,
      borderRadius: 8,
      flexDirection: "row",
      justifyContent: "center",
    },
    roleOptionSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    roleOptionText: { color: colors.text, marginLeft: 6, fontWeight: "500" },
    roleOptionTextSelected: { color: "#FFFFFF", fontWeight: "bold" },
    notificationToggleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      marginBottom: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    notificationToggleTextWrap: {
      flex: 1,
      paddingRight: 6,
    },
    notificationToggleTitle: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "700",
      marginBottom: 2,
    },
    notificationToggleHint: {
      color: colors.textSecondary,
      fontSize: 12,
      lineHeight: 17,
      fontWeight: "600",
    },
    submitButton: {
      backgroundColor: colors.primary,
      paddingVertical: 14,
      borderRadius: 8,
      alignItems: "center",
      marginTop: 8,
      flexDirection: "row",
      justifyContent: "center",
    },
    submitButtonText: {
      color: "#FFFFFF",
      fontWeight: "bold",
      fontSize: 16,
      marginRight: 8,
    },
    paginationContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
      paddingHorizontal: 8,
      gap: 8,
      flexWrap: "wrap",
    },
    pageButton: {
      backgroundColor: colors.primary,
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 6,
    },
    pageButtonDisabled: {
      backgroundColor: colors.primary,
      opacity: 0.65,
    },
    pageButtonText: { color: "#FFF", fontWeight: "600" },
    pageButtonTextDisabled: { color: "#E2F7F1" },
    pageNumbersWrapper: { flexDirection: "row", alignItems: "center" },
    pageNumber: {
      paddingVertical: 6,
      paddingHorizontal: 10,
      marginHorizontal: 4,
      borderRadius: 6,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pageNumberSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    pageNumberText: { color: colors.text, fontWeight: "500" },
    pageNumberTextSelected: { color: "#FFF", fontWeight: "700" },
    ellipsis: { marginHorizontal: 6, color: colors.textSecondary },
    // Analytics Modal Styles
    analyticsCard: {
      backgroundColor: colors.surface,
      padding: 15,
      borderRadius: 8,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    analyticsCardTitle: {
      fontSize: 16,
      fontWeight: "bold",
      marginBottom: 10,
      color: colors.text,
    },
    analyticsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 5,
    },
    analyticsLabel: {
      fontSize: 14,
      flex: 1,
      color: colors.text,
    },
    analyticsValue: {
      fontSize: 14,
      fontWeight: "bold",
      color: colors.primary,
    },
    activityItem: {
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    activityTitle: {
      fontSize: 14,
      fontWeight: "bold",
      marginBottom: 2,
      color: colors.text,
    },
    activityModule: {
      fontSize: 12,
      marginBottom: 4,
      color: colors.textSecondary,
    },
    activityMeta: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    activityScore: {
      fontSize: 14,
      fontWeight: "bold",
    },
    activityDate: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    scrollContainer: {
      flex: 1,
      paddingVertical: 10,
    },
  });
};

const showAlert = (title, message, buttons = [{ text: "OK" }]) => {
  if (Platform.OS === "web") {
    // For web, use the browser's built-in alert or a custom web dialog
    if (buttons.length <= 1) {
      // Simple alert
      window.alert(`${title}\n${message}`);
    } else {
      // Confirmation dialog with OK/Cancel
      const confirmed = window.confirm(`${title}\n${message}`);
      if (confirmed) {
        // Find the non-cancel button and trigger its onPress
        const confirmButton = buttons.find(
          (button) => button.style === "destructive" || button.text === "OK"
        );
        confirmButton?.onPress?.();
      } else {
        // Find the cancel button and trigger its onPress
        const cancelButton = buttons.find(
          (button) => button.style === "cancel"
        );
        cancelButton?.onPress?.();
      }
    }
  } else {
    // For native platforms, use React Native's Alert
    Alert.alert(title, message, buttons);
  }
};
