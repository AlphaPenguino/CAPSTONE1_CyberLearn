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
          if (reset) {
            setLogs(logsData);
          } else {
            // Prevent duplicate logs by filtering out any that already exist
            setLogs((prev) => {
              const existingIds = new Set(prev.map((log) => log._id));
              const newLogs = logsData.filter(
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
    [token, page, filters]
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

      {item.details && Object.keys(item.details).length > 0 && (
        <Text style={[styles.details, { color: colors.textSecondary }]}>
          {formatDetails(item.details)}
        </Text>
      )}
    </View>
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
});
