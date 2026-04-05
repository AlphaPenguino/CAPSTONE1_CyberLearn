import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Modal,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuthStore } from "../../store/authStore";
import { SafeScreen } from "../../components/SafeScreen";
import { API_URL } from "../../constants/api";

export default function LogsScreen() {
  const { colors } = useTheme();
  const { token } = useAuthStore(); // user not needed
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filters, setFilters] = useState({
    userId: "",
    userSearch: "",
  });
  const [users, setUsers] = useState([]);
  const [, setLoadingUsers] = useState(false); // future enhancement spinner placeholder
  const [summary, setSummary] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [loadingSubjectDetails, setLoadingSubjectDetails] = useState(false);

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    try {
      setLoadingUsers(true);
      const response = await fetch(`${API_URL}/admin/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUsers(data.data.users || []);
        }
      }
    } catch (_err) {
      console.error("Error fetching users:", _err);
    } finally {
      setLoadingUsers(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const fetchSubjectName = useCallback(
    async (subjectId) => {
      if (!token || !subjectId) return null;
      try {
        const response = await fetch(
          `${API_URL}/instructor/subjects/${subjectId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            return data.data.subjectName || data.data.name;
          }
        }
      } catch (_err) {
        console.error("Error fetching subject:", _err);
      }
      return null;
    },
    [token]
  );

  const fetchSubjectDetails = useCallback(
    async (subjectId) => {
      if (!token || !subjectId) return null;
      try {
        setLoadingSubjectDetails(true);
        const response = await fetch(
          `${API_URL}/instructor/subjects/${subjectId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            return data.data;
          }
        }
      } catch (_err) {
        console.error("Error fetching subject details:", _err);
        Alert.alert("Error", "Failed to load subject details");
      } finally {
        setLoadingSubjectDetails(false);
      }
      return null;
    },
    [token]
  );

  const fetchLogs = useCallback(
    async (reset = false) => {
      if (!token) return;
      try {
        if (reset) {
          setLoading(true);
          setPage(1);
        }
        const params = new URLSearchParams({
          page: reset ? "1" : page.toString(),
          limit: "20",
          ...filters,
        });
        const response = await fetch(`${API_URL}/admin/audit-logs?${params}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (!response.ok) {
          if (response.status === 404 || response.status === 204) {
            if (reset) {
              setLogs([]);
              setSummary({ totalLogs: 0 });
              setHasMore(false);
            }
            return;
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        if (data.success) {
          const logsData = data.data.logs || [];
          
          // Enrich logs with subject names if resource is "subject"
          const enrichedLogsData = await Promise.all(
            logsData.map(async (log) => {
              if (log.resource === "subject" && log.resourceId) {
                const subjectName = await fetchSubjectName(log.resourceId);
                return { ...log, subjectName };
              }
              return log;
            })
          );
          
          if (reset) {
            setLogs(enrichedLogsData);
          } else {
            // Prevent duplicate logs by filtering out any that already exist
            setLogs((prev) => {
              const existingIds = new Set(prev.map((log) => log._id));
              const newLogs = enrichedLogsData.filter(
                (log) => !existingIds.has(log._id)
              );
              return [...prev, ...newLogs];
            });
          }
          setSummary(data.data.summary);
          setHasMore(
            data.data.pagination ? data.data.pagination.hasNextPage : false
          );
          if (!reset) {
            setPage((prev) => prev + 1);
          }
        } else if (reset) {
          setLogs([]);
          setSummary({ totalLogs: 0 });
          setHasMore(false);
        }
      } catch (_err) {
        console.error("Error fetching logs:", _err);
        if (reset) {
          setLogs([]);
          setSummary({ totalLogs: 0 });
          setHasMore(false);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token, page, filters, fetchSubjectName]
  );

  useEffect(() => {
    fetchLogs(true);
    // omit page; reset flow sets it
  }, [filters, fetchLogs]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLogs(true);
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchLogs(false);
    }
  };

  const exportLogs = async () => {
    if (!token) return;

    try {
      const params = new URLSearchParams(filters);

      const response = await fetch(
        `${API_URL}/admin/audit-logs/export?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);

        Alert.alert("Success", "Audit logs exported successfully");
      } else {
        Alert.alert("Error", "Failed to export logs");
      }
    } catch (error) {
      console.error("Error exporting logs:", error);
      Alert.alert("Error", "Failed to export logs");
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusColor = (success) => {
    return success ? colors.success || "#10B981" : colors.error || "#EF4444";
  };

  // Convert details object into a readable multiline string: key: value per line.
  const formatDetails = (details) => {
    if (!details) return "";
    if (typeof details !== "object") return String(details);
    try {
      return Object.entries(details)
        .map(([key, value]) => {
          if (value === null || value === undefined) return `${key}: -`;
          if (typeof value === "object") {
            // Shallow expand simple objects/arrays; fallback to JSON for complex nesting
            const isPlain =
              Array.isArray(value) ||
              Object.getPrototypeOf(value) === Object.prototype;
            if (isPlain) {
              const inner = Array.isArray(value)
                ? value
                    .map((v) =>
                      typeof v === "object" ? JSON.stringify(v) : String(v)
                    )
                    .join(", ")
                : Object.entries(value)
                    .map(
                      ([k, v]) =>
                        `${k}=${
                          typeof v === "object" ? JSON.stringify(v) : String(v)
                        }`
                    )
                    .join(", ");
              return `${key}: ${inner}`;
            }
            return `${key}: ${JSON.stringify(value)}`;
          }
          return `${key}: ${value}`;
        })
        .join("\n");
    } catch (_err) {
      return Object.keys(details)
        .map((k) => `${k}: [unavailable]`)
        .join("\n");
    }
  };

  const renderLogItem = ({ item }) => (
    <View
      style={[
        styles.logItem,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.logHeader}>
        <View style={styles.logUser}>
          <Ionicons
            name="person"
            size={16}
            color={colors.primary}
            style={styles.userIcon}
          />
          <Text style={[styles.username, { color: colors.text }]}>
            {item.username}
          </Text>
          <Text style={[styles.userRole, { color: colors.textSecondary }]}>
            ({item.userRole})
          </Text>
        </View>
        <View style={styles.logMeta}>
          <View
            style={[
              styles.statusIndicator,
              { backgroundColor: getStatusColor(item.success) },
            ]}
          />
          <Text style={[styles.timestamp, { color: colors.textSecondary }]}>
            {formatTimestamp(item.timestamp)}
          </Text>
        </View>
      </View>

      <Text style={[styles.action, { color: colors.text }]}>{item.action}</Text>

      <View style={styles.logDetails}>
        <Text style={[styles.resource, { color: colors.primary }]}>
          {item.resource ? item.resource.toUpperCase() : "SYSTEM"}
        </Text>
      </View>

      {item.resource === "subject" && item.subjectName && (
        <TouchableOpacity
          style={styles.subjectContainer}
          onPress={async () => {
            if (item.resourceId) {
              const details = await fetchSubjectDetails(item.resourceId);
              if (details) {
                setSelectedSubject(details);
                setShowSubjectModal(true);
              }
            }
          }}
          activeOpacity={0.7}
        >
          <Ionicons
            name="folder-outline"
            size={14}
            color={colors.primary}
            style={styles.subjectIcon}
          />
          <Text style={[styles.subjectName, { color: colors.text }]}>
            Subject: <Text style={{ fontWeight: "600" }}>{item.subjectName}</Text>
          </Text>
          <Ionicons
            name="chevron-forward"
            size={14}
            color={colors.primary}
            style={styles.chevronIcon}
          />
        </TouchableOpacity>
      )}

      {item.details && Object.keys(item.details).length > 0 && (
        <Text style={[styles.details, { color: colors.textSecondary }]}>
          {formatDetails(item.details)}
        </Text>
      )}
    </View>
  );

  const renderSubjectModal = () => (
    <Modal
      visible={showSubjectModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowSubjectModal(false)}
    >
      <SafeScreen
        style={[
          styles.modalContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => setShowSubjectModal(false)}
            style={styles.closeButton}
          >
            <Ionicons
              name="close"
              size={24}
              color={colors.text}
            />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            Subject Details
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {loadingSubjectDetails ? (
          <View style={styles.modalLoading}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Loading subject details...
            </Text>
          </View>
        ) : selectedSubject ? (
          <ScrollView
            style={styles.modalContent}
            showsVerticalScrollIndicator={true}
          >
            {/* Subject Name */}
            <View
              style={[
                styles.detailSection,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={styles.detailHeader}>
                <Ionicons
                  name="book-outline"
                  size={20}
                  color={colors.primary}
                  style={styles.detailIcon}
                />
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                  Subject Name
                </Text>
              </View>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {selectedSubject.name || selectedSubject.subjectName || "N/A"}
              </Text>
            </View>

            {/* Subject Code */}
            {selectedSubject.subjectCode && (
              <View
                style={[
                  styles.detailSection,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <View style={styles.detailHeader}>
                  <Ionicons
                    name="barcode-outline"
                    size={20}
                    color={colors.primary}
                    style={styles.detailIcon}
                  />
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                    Subject Code
                  </Text>
                </View>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {selectedSubject.subjectCode}
                </Text>
              </View>
            )}

            {/* Description */}
            {selectedSubject.description && (
              <View
                style={[
                  styles.detailSection,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <View style={styles.detailHeader}>
                  <Ionicons
                    name="document-text-outline"
                    size={20}
                    color={colors.primary}
                    style={styles.detailIcon}
                  />
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                    Description
                  </Text>
                </View>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {selectedSubject.description || "No description provided"}
                </Text>
              </View>
            )}

            {/* Status */}
            <View
              style={[
                styles.detailSection,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={styles.detailHeader}>
                <Ionicons
                  name={selectedSubject.isActive ? "checkmark-circle-outline" : "close-circle-outline"}
                  size={20}
                  color={selectedSubject.isActive ? "#10B981" : "#EF4444"}
                  style={styles.detailIcon}
                />
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                  Status
                </Text>
              </View>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {selectedSubject.isActive ? "Active" : "Inactive"}
              </Text>
            </View>

            {/* Student Count */}
            {selectedSubject.studentCount !== undefined && (
              <View
                style={[
                  styles.detailSection,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <View style={styles.detailHeader}>
                  <Ionicons
                    name="people-outline"
                    size={20}
                    color={colors.primary}
                    style={styles.detailIcon}
                  />
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                    Students Enrolled
                  </Text>
                </View>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {selectedSubject.studentCount || 0}
                </Text>
              </View>
            )}

            {/* Primary Instructor */}
            {selectedSubject.instructor && (
              <View
                style={[
                  styles.detailSection,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <View style={styles.detailHeader}>
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color={colors.primary}
                    style={styles.detailIcon}
                  />
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                    Primary Instructor
                  </Text>
                </View>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {selectedSubject.instructor.username || selectedSubject.instructor.fullName || "N/A"}
                </Text>
                {selectedSubject.instructor.email && (
                  <Text style={[styles.detailSubValue, { color: colors.textSecondary }]}>
                    {selectedSubject.instructor.email}
                  </Text>
                )}
              </View>
            )}

            {/* Additional Instructors */}
            {selectedSubject.instructors && selectedSubject.instructors.length > 0 && (
              <View
                style={[
                  styles.detailSection,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <View style={styles.detailHeader}>
                  <Ionicons
                    name="people-sharp"
                    size={20}
                    color={colors.primary}
                    style={styles.detailIcon}
                  />
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                    Additional Instructors
                  </Text>
                </View>
                {selectedSubject.instructors.map((inst, idx) => (
                  <View key={idx} style={styles.listItem}>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      • {inst.username || inst.fullName || "N/A"}
                    </Text>
                    {inst.email && (
                      <Text style={[styles.detailSubValue, { color: colors.textSecondary }]}>
                        {inst.email}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Created At */}
            {selectedSubject.createdAt && (
              <View
                style={[
                  styles.detailSection,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <View style={styles.detailHeader}>
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color={colors.primary}
                    style={styles.detailIcon}
                  />
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                    Created
                  </Text>
                </View>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {new Date(selectedSubject.createdAt).toLocaleString()}
                </Text>
              </View>
            )}

            {/* Created By */}
            {selectedSubject.createdBy && (
              <View
                style={[
                  styles.detailSection,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <View style={styles.detailHeader}>
                  <Ionicons
                    name="create-outline"
                    size={20}
                    color={colors.primary}
                    style={styles.detailIcon}
                  />
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                    Created By
                  </Text>
                </View>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {selectedSubject.createdBy.username || selectedSubject.createdBy.fullName || "N/A"}
                </Text>
              </View>
            )}

            {/* Archived Status */}
            {selectedSubject.archived && (
              <View
                style={[
                  styles.detailSection,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <View style={styles.detailHeader}>
                  <Ionicons
                    name="archive-outline"
                    size={20}
                    color="#F59E0B"
                    style={styles.detailIcon}
                  />
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                    Archived
                  </Text>
                </View>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  Yes - {new Date(selectedSubject.archivedAt).toLocaleString()}
                </Text>
              </View>
            )}

            {/* Section Code */}
            {selectedSubject.sectionCode && (
              <View
                style={[
                  styles.detailSection,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <View style={styles.detailHeader}>
                  <Ionicons
                    name="code-outline"
                    size={20}
                    color={colors.primary}
                    style={styles.detailIcon}
                  />
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                    Section Code
                  </Text>
                </View>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {selectedSubject.sectionCode}
                </Text>
              </View>
            )}

            {/* Last Updated */}
            {selectedSubject.updatedAt && (
              <View
                style={[
                  styles.detailSection,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <View style={styles.detailHeader}>
                  <Ionicons
                    name="refresh-outline"
                    size={20}
                    color={colors.primary}
                    style={styles.detailIcon}
                  />
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                    Last Updated
                  </Text>
                </View>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {new Date(selectedSubject.updatedAt).toLocaleString()}
                </Text>
              </View>
            )}
          </ScrollView>
        ) : (
          <View style={styles.modalLoading}>
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              No subject details available
            </Text>
          </View>
        )}
      </SafeScreen>
    </Modal>
  );

  if (loading && logs.length === 0) {
    return (
      <SafeScreen
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading audit logs...
          </Text>
        </View>
      </SafeScreen>
    );
  }

  return (
    <>
      <LinearGradient colors={["#caf1c8", "#5fd2cd"]} style={styles.container}>
        <SafeScreen style={styles.safeScreen}>
          <View style={styles.pageWrapper}>
          {/* Header */}
          <View
            style={[
              styles.header,
              {
                backgroundColor: colors.surface,
                borderBottomColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.title, { color: colors.text }]}>
              Audit Logs
            </Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  {
                    backgroundColor: showFilters
                      ? colors.primary
                      : colors.surface,
                  },
                ]}
                onPress={() => setShowFilters(!showFilters)}
              >
                <Ionicons
                  name="filter"
                  size={20}
                  color={showFilters ? colors.background : colors.primary}
                />
              </TouchableOpacity>

              {Platform.OS === "web" && (
                <TouchableOpacity
                  style={[
                    styles.exportButton,
                    { backgroundColor: colors.primary },
                  ]}
                  onPress={exportLogs}
                >
                  <Ionicons
                    name="download"
                    size={20}
                    color={colors.background}
                  />
                  <Text
                    style={[styles.exportText, { color: colors.background }]}
                  >
                    Export
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Summary */}
          {summary && (
            <View
              style={[
                styles.summary,
                {
                  backgroundColor: colors.surface,
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.summaryText, { color: colors.text }]}>
                Total Logs: {summary.totalLogs}
              </Text>
              {summary.topUsers && summary.topUsers.length > 0 && (
                <Text
                  style={[styles.summaryText, { color: colors.textSecondary }]}
                >
                  Most Active: {summary.topUsers[0]._id} (
                  {summary.topUsers[0].count} actions)
                </Text>
              )}
            </View>
          )}

          {/* Filters */}
          {showFilters && (
            <View
              style={[
                styles.filtersContainer,
                {
                  backgroundColor: colors.surface,
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <TextInput
                style={[
                  styles.searchInput,
                  {
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Search by username..."
                placeholderTextColor={colors.textSecondary}
                value={filters.userSearch}
                onChangeText={(text) =>
                  setFilters((prev) => ({ ...prev, userSearch: text }))
                }
              />

              <View style={styles.filterRow}>
                <View style={styles.filterGroup}>
                  <Text style={[styles.filterLabel, { color: colors.text }]}>
                    Specific User
                  </Text>
                  {Platform.OS === "web" ? (
                    <select
                      value={filters.userId}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          userId: e.target.value,
                        }))
                      }
                      style={[
                        styles.filterSelect,
                        {
                          backgroundColor: colors.surface,
                          color: colors.text,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <option value="">All Users</option>
                      {users.map((user) => (
                        <option key={user._id} value={user._id}>
                          {user.username} ({user.fullName})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <View
                      style={[
                        styles.filterPicker,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[styles.filterValue, { color: colors.text }]}
                      >
                        {filters.userId
                          ? users.find((u) => u._id === filters.userId)
                              ?.username || "Select User"
                          : "All Users"}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* Logs List */}
          <FlatList
            data={logs}
            renderItem={renderLogItem}
            keyExtractor={(item) => item._id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            onEndReached={loadMore}
            onEndReachedThreshold={0.1}
            ListFooterComponent={
              loading && logs.length > 0 ? (
                <ActivityIndicator
                  size="small"
                  color={colors.primary}
                  style={styles.loadMore}
                />
              ) : null
            }
            ListEmptyComponent={
              !loading ? (
                <View style={styles.emptyContainer}>
                  <Ionicons
                    name="document-text-outline"
                    size={64}
                    color={colors.textSecondary}
                  />
                  <Text
                    style={[styles.emptyText, { color: colors.textSecondary }]}
                  >
                    No audit logs found
                  </Text>
                  <Text
                    style={[
                      styles.emptySubtext,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {Object.values(filters).some((f) => f !== "")
                      ? "Try adjusting your user filters to see more results"
                      : "No audit logs have been recorded yet"}
                  </Text>
                </View>
              ) : null
            }
          />
        </View>
      </SafeScreen>
    </LinearGradient>
    {renderSubjectModal()}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pageWrapper: {
    flex: 1,
    width: "100%",
    maxWidth: 1200,
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  filterButton: {
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 6,
    gap: 4,
  },
  exportText: {
    fontWeight: "600",
  },
  summary: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: "500",
  },
  filtersContainer: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  searchInput: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    fontSize: 16,
  },
  filterRow: {
    flexDirection: Platform.OS === "web" ? "row" : "column",
    gap: 12,
  },
  filterGroup: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
  },
  filterSelect: {
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    fontSize: 14,
  },
  filterPicker: {
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
  },
  filterValue: {
    fontSize: 14,
  },
  logItem: {
    marginVertical: 8,
    marginHorizontal:
      typeof window !== "undefined" && window.innerWidth < 600 ? 8 : 0,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  logHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  logUser: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  userIcon: {
    marginRight: 6,
  },
  username: {
    fontWeight: "600",
    marginRight: 4,
  },
  userRole: {
    fontSize: 12,
  },
  logMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timestamp: {
    fontSize: 12,
  },
  action: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  logDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  resource: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  subjectContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 4,
  },
  subjectIcon: {
    marginRight: 6,
  },
  chevronIcon: {
    marginLeft: 6,
  },
  subjectName: {
    fontSize: 13,
    flex: 1,
  },
  ipAddress: {
    fontSize: 12,
  },
  details: {
    fontSize: 12,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  loadMore: {
    padding: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
    fontStyle: "italic",
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  modalLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  detailSection: {
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  detailIcon: {
    marginRight: 8,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 28,
  },
  detailSubValue: {
    fontSize: 12,
    marginLeft: 28,
    marginTop: 4,
  },
  listItem: {
    marginVertical: 4,
  },
});
