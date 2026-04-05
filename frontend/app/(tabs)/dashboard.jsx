import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Animated,
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Platform,
  Modal,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BarChart, PieChart, LineChart } from "react-native-chart-kit";
import { useAuthStore } from "../../store/authStore";
import { useTheme } from "../../contexts/ThemeContext";
import { API_URL } from "../../constants/api";
import COLORS from "../../constants/custom-colors";
import UsersScreen from "./users";
import LogsScreen from "./logs";

const DAY_MS = 86400000;

const startOfDay = (date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const endOfDay = (date) => {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
};

const formatRangeLabel = (startDate, endDate, period) => {
  if (period === "monthly") {
    return `${startDate.toLocaleString("en-US", {
      month: "short",
      year: "numeric",
    })} - ${endDate.toLocaleString("en-US", {
      month: "short",
      year: "numeric",
    })}`;
  }
  return `${startDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })} - ${endDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })}`;
};

const getCalendarWindow = (period, page) => {
  const today = startOfDay(new Date());

  if (period === "daily") {
    const endDate = new Date(today);
    endDate.setDate(today.getDate() - page * 7);
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 6);
    return {
      startDate,
      endDate,
      label: formatRangeLabel(startDate, endDate, period),
    };
  }

  if (period === "weekly") {
    const endDate = new Date(today);
    endDate.setDate(today.getDate() - page * 28);
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 27);
    return {
      startDate,
      endDate,
      label: formatRangeLabel(startDate, endDate, period),
    };
  }

  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const endMonth = new Date(
    currentMonthStart.getFullYear(),
    currentMonthStart.getMonth() - page,
    1
  );
  const startDate = new Date(endMonth.getFullYear(), endMonth.getMonth() - 5, 1);
  const endDate = new Date(endMonth.getFullYear(), endMonth.getMonth() + 1, 0);

  // Keep current month window aligned with current day to avoid future dates.
  const boundedEndDate =
    page === 0 && endDate > today ? new Date(today) : endDate;

  return {
    startDate,
    endDate: boundedEndDate,
    label: formatRangeLabel(startDate, boundedEndDate, period),
  };
};

export default function Dashboard() {
  const { user, token } = useAuthStore();
  const { colors } = useTheme();
  const { width: viewportWidth } = useWindowDimensions();
  const isAndroid = Platform.OS === "android";

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalStudents: 0,
    totalInstructors: 0,
    totalModules: 0,
    totalQuizzes: 0,
    activeSessions: 0,
  });
  const [topPerformer, setTopPerformer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [section, setSection] = useState("overview"); // overview | users | logs
  const [usageLabels, setUsageLabels] = useState([]); // display labels (daily / aggregated)
  const [usageData, setUsageData] = useState([]); // numeric data aligned to labels

  // New analytics state
  const [analyticsPeriod, setAnalyticsPeriod] = useState("daily"); // daily | weekly | monthly
  const [completionStats, setCompletionStats] = useState({
    labels: [],
    students: [],
    instructors: [],
    admins: [],
    total: [],
  });
  const [activeUsersStats, setActiveUsersStats] = useState({
    labels: [],
    students: [],
    instructors: [],
    admins: [],
  });

  // Interactive tooltip state
  const [tooltipData, setTooltipData] = useState(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [selectedUsagePoint, setSelectedUsagePoint] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [visibleActiveRoleSeries, setVisibleActiveRoleSeries] = useState({
    students: true,
    instructors: true,
    admins: true,
  });
  const [calendarPage, setCalendarPage] = useState(0);
  const hasLoadedDashboardRef = useRef(false);

  const chartFadeAnim = useRef(new Animated.Value(1)).current;

  const calendarWindow = useMemo(
    () => getCalendarWindow(analyticsPeriod, calendarPage),
    [analyticsPeriod, calendarPage]
  );
  const calendarLabel = calendarWindow.label;
  const isLatestCalendarWindow = calendarPage === 0;

  useEffect(() => {
    chartFadeAnim.setValue(0.45);
    Animated.timing(chartFadeAnim, {
      toValue: 1,
      duration: 320,
      useNativeDriver: true,
    }).start();
  }, [chartFadeAnim, analyticsPeriod, calendarPage, usageData, activeUsersStats]);

  const fetchAnalyticsData = useCallback(async () => {
    try {
      const today = startOfDay(new Date());
      const { startDate, endDate } = calendarWindow;
      const daysWindow =
        Math.floor((today - startOfDay(startDate)) / DAY_MS) + 1;

      const [completionResponse, activeUsersResponse] = await Promise.all([
        // Fetch completion statistics
        fetch(
          `${API_URL}/admin/analytics/completion-stats?period=${analyticsPeriod}&days=${daysWindow}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        ).catch(() => null),
        // Fetch active users by role
        fetch(
          `${API_URL}/admin/analytics/active-users?period=${analyticsPeriod}&days=${daysWindow}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        ).catch(() => null),
      ]);

      // Build timeline for the selected calendar window.
      const dateKeys = []; // raw day keys (YYYY-MM-DD)
      for (
        let d = startOfDay(startDate);
        d <= endOfDay(endDate);
        d = new Date(d.getTime() + DAY_MS)
      ) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        dateKeys.push(`${yyyy}-${mm}-${dd}`);
      }

      let labelDisplay = [];
      let labelKeys = [];
      if (analyticsPeriod === "daily") {
        labelKeys = dateKeys;
        labelDisplay = dateKeys.map((k) => {
          const [, m, d] = k.split("-");
          return `${parseInt(m, 10)}/${parseInt(d, 10)}`;
        });
      } else if (analyticsPeriod === "weekly") {
        // Group consecutive 7-day blocks -> label as Week 1, Week 2, ...
        const weeks = [];
        let weekIndex = 1;
        for (let start = 0; start < dateKeys.length; start += 7) {
          const slice = dateKeys.slice(start, start + 7);
          if (slice.length === 0) continue;
          weeks.push({
            key: slice[0] + "|" + slice[slice.length - 1],
            days: slice,
            label: `Week ${weekIndex++}`,
          });
        }
        labelKeys = weeks.map((w) => w.days[0]);
        labelDisplay = weeks.map((w) => w.label);
      } else if (analyticsPeriod === "monthly") {
        // Build months in the active six-month calendar window.
        const monthsSeq = [];
        for (
          let m = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
          m <= new Date(endDate.getFullYear(), endDate.getMonth(), 1);
          m = new Date(m.getFullYear(), m.getMonth() + 1, 1)
        ) {
          const mKey = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(
            2,
            "0"
          )}`;
          monthsSeq.push(mKey);
        }
        labelKeys = monthsSeq;
        labelDisplay = monthsSeq.map((mKey) => {
          const [y, mth] = mKey.split("-");
          return `${parseInt(mth, 10)}/${y.slice(2)}`; // M/YY
        });
      }

      // Process completion statistics
      if (completionResponse && completionResponse.ok) {
        try {
          const completionJson = await completionResponse.json();
          if (completionJson.success && completionJson.data) {
            const series = Array.isArray(completionJson.data)
              ? completionJson.data
              : completionJson.completions || [];

            // Create maps for each role
            const studentsMap = new Map();
            const instructorsMap = new Map();
            const adminsMap = new Map();
            const totalMap = new Map();

            series.forEach((pt) => {
              const date = pt.date || pt.day || pt._id;
              studentsMap.set(date, pt.students ?? 0);
              instructorsMap.set(date, pt.instructors ?? 0);
              adminsMap.set(date, pt.admins ?? 0);
              totalMap.set(
                date,
                pt.total ??
                  (pt.students || 0) + (pt.instructors || 0) + (pt.admins || 0)
              );
            });

            let studentsSeries = [];
            let instructorsSeries = [];
            let adminsSeries = [];
            let totalSeries = [];

            if (analyticsPeriod === "daily") {
              studentsSeries = dateKeys.map((k) => studentsMap.get(k) || 0);
              instructorsSeries = dateKeys.map(
                (k) => instructorsMap.get(k) || 0
              );
              adminsSeries = dateKeys.map((k) => adminsMap.get(k) || 0);
              totalSeries = dateKeys.map((k) => totalMap.get(k) || 0);
            } else if (analyticsPeriod === "weekly") {
              // Sum per 7-day block
              for (let start = 0; start < dateKeys.length; start += 7) {
                const slice = dateKeys.slice(start, start + 7);
                studentsSeries.push(
                  slice.reduce((acc, d) => acc + (studentsMap.get(d) || 0), 0)
                );
                instructorsSeries.push(
                  slice.reduce(
                    (acc, d) => acc + (instructorsMap.get(d) || 0),
                    0
                  )
                );
                adminsSeries.push(
                  slice.reduce((acc, d) => acc + (adminsMap.get(d) || 0), 0)
                );
                totalSeries.push(
                  slice.reduce((acc, d) => acc + (totalMap.get(d) || 0), 0)
                );
              }
            } else if (analyticsPeriod === "monthly") {
              // Aggregate by month
              const monthTotals = (map) => {
                const totals = new Map();
                dateKeys.forEach((k) => {
                  const mKey = k.slice(0, 7);
                  totals.set(mKey, (totals.get(mKey) || 0) + (map.get(k) || 0));
                });
                return labelKeys.map((m) => totals.get(m) || 0);
              };
              studentsSeries = monthTotals(studentsMap);
              instructorsSeries = monthTotals(instructorsMap);
              adminsSeries = monthTotals(adminsMap);
              totalSeries = monthTotals(totalMap);
            }

            setCompletionStats({
              labels: labelDisplay,
              students: studentsSeries,
              instructors: instructorsSeries,
              admins: adminsSeries,
              total: totalSeries,
            });
          }
        } catch {
          setCompletionStats({
            labels: labelDisplay,
            students: new Array(labelDisplay.length).fill(0),
            instructors: new Array(labelDisplay.length).fill(0),
            admins: new Array(labelDisplay.length).fill(0),
            total: new Array(labelDisplay.length).fill(0),
          });
        }
      } else {
        setCompletionStats({
          labels: labelDisplay,
          students: new Array(labelDisplay.length).fill(0),
          instructors: new Array(labelDisplay.length).fill(0),
          admins: new Array(labelDisplay.length).fill(0),
          total: new Array(labelDisplay.length).fill(0),
        });
      }

      // Process active users by role
      if (activeUsersResponse && activeUsersResponse.ok) {
        try {
          const activeUsersJson = await activeUsersResponse.json();
          if (activeUsersJson.success && activeUsersJson.data) {
            const series = Array.isArray(activeUsersJson.data)
              ? activeUsersJson.data
              : activeUsersJson.activeUsers || [];

            const studentsMap = new Map();
            const instructorsMap = new Map();
            const adminsMap = new Map();

            series.forEach((pt) => {
              const date = pt.date || pt.day || pt._id;
              studentsMap.set(date, pt.students ?? 0);
              instructorsMap.set(date, pt.instructors ?? 0);
              adminsMap.set(date, pt.admins ?? 0);
            });

            let studentsSeries = [];
            let instructorsSeries = [];
            let adminsSeries = [];
            if (analyticsPeriod === "daily") {
              studentsSeries = dateKeys.map((k) => studentsMap.get(k) || 0);
              instructorsSeries = dateKeys.map(
                (k) => instructorsMap.get(k) || 0
              );
              adminsSeries = dateKeys.map((k) => adminsMap.get(k) || 0);
            } else if (analyticsPeriod === "weekly") {
              for (let start = 0; start < dateKeys.length; start += 7) {
                const slice = dateKeys.slice(start, start + 7);
                studentsSeries.push(
                  slice.reduce((a, d) => a + (studentsMap.get(d) || 0), 0)
                );
                instructorsSeries.push(
                  slice.reduce((a, d) => a + (instructorsMap.get(d) || 0), 0)
                );
                adminsSeries.push(
                  slice.reduce((a, d) => a + (adminsMap.get(d) || 0), 0)
                );
              }
            } else if (analyticsPeriod === "monthly") {
              const monthTotals = (map) => {
                const totals = new Map();
                dateKeys.forEach((k) => {
                  const mKey = k.slice(0, 7);
                  totals.set(mKey, (totals.get(mKey) || 0) + (map.get(k) || 0));
                });
                return labelKeys.map((m) => totals.get(m) || 0);
              };
              studentsSeries = monthTotals(studentsMap);
              instructorsSeries = monthTotals(instructorsMap);
              adminsSeries = monthTotals(adminsMap);
            }
            setActiveUsersStats({
              labels: labelDisplay,
              students: studentsSeries,
              instructors: instructorsSeries,
              admins: adminsSeries,
            });
          }
        } catch {
          setActiveUsersStats({
            labels: labelDisplay,
            students: new Array(labelDisplay.length).fill(0),
            instructors: new Array(labelDisplay.length).fill(0),
            admins: new Array(labelDisplay.length).fill(0),
          });
        }
      } else {
        setActiveUsersStats({
          labels: labelDisplay,
          students: new Array(labelDisplay.length).fill(0),
          instructors: new Array(labelDisplay.length).fill(0),
          admins: new Array(labelDisplay.length).fill(0),
        });
      }
    } catch (error) {
      console.error("Error fetching analytics data:", error);
    }
  }, [token, analyticsPeriod, calendarWindow]);

  const fetchDashboardData = useCallback(async () => {
    const shouldShowInitialLoader = !hasLoadedDashboardRef.current;

    try {
      if (shouldShowInitialLoader) {
        setLoading(true);
      }
      const today = startOfDay(new Date());
      const { startDate, endDate } = calendarWindow;
      const usageDaysParam =
        Math.floor((today - startOfDay(startDate)) / DAY_MS) + 1;

      const [statsResponse, leaderboardResponse, usageResponse] =
        await Promise.all([
          fetch(`${API_URL}/admin/dashboard/stats`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/users/leaderboard?limit=1`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          // Fetch raw usage window (full YTD for monthly, else 90 days)
          fetch(
            `${API_URL}/admin/analytics/daily-usage?days=${usageDaysParam}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          ).catch(() => null),
        ]);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        if (statsData.success) {
          const data = statsData.data;
          setStats({
            totalUsers: data.users.total,
            totalStudents: data.users.students,
            totalInstructors: data.users.instructors,
            totalModules: data.modules.total,
            totalQuizzes: data.quizzes.total,
            activeSessions:
              data.recent?.newUsers || Math.floor(Math.random() * 50) + 10,
          });
        }
      }

      if (leaderboardResponse.ok) {
        const leaderboardData = await leaderboardResponse.json();
        if (
          leaderboardData.success &&
          leaderboardData.data.rankings.length > 0
        ) {
          setTopPerformer(leaderboardData.data.rankings[0]);
        }
      }

      // Build keys for the selected visible window.
      const labelKeys = [];
      for (
        let d = startOfDay(startDate);
        d <= endOfDay(endDate);
        d = new Date(d.getTime() + DAY_MS)
      ) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        labelKeys.push(`${yyyy}-${mm}-${dd}`);
      }

      // Parse usage if endpoint exists; otherwise default to zeros
      if (usageResponse && usageResponse.ok) {
        try {
          const usageJson = await usageResponse.json();
          // Expecting { success: true, data: [{ date: 'YYYY-MM-DD', students: number }, ...] }
          const series = Array.isArray(usageJson.data)
            ? usageJson.data
            : usageJson.usage || [];

          const map = new Map(
            series.map((pt) => [
              pt.date || pt.day || pt._id,
              pt.students ?? pt.count ?? pt.value ?? 0,
            ])
          );
          const windowKeys = labelKeys;
          const windowCounts = windowKeys.map((key) => map.get(key) || 0);

          if (analyticsPeriod === "daily") {
            setUsageLabels(
              windowKeys.map((k) => {
                const [, m, d] = k.split("-");
                return `${parseInt(m, 10)}/${parseInt(d, 10)}`;
              })
            );
            setUsageData(windowCounts);
          } else if (analyticsPeriod === "weekly") {
            const labels = [];
            const data = [];
            let weekIndex = 1;
            for (let i = 0; i < windowCounts.length; i += 7) {
              const slice = windowCounts.slice(i, i + 7);
              if (!slice.length) continue;
              data.push(slice.reduce((a, b) => a + b, 0));
              labels.push(`Week ${weekIndex++}`);
            }
            setUsageLabels(labels);
            setUsageData(data);
          } else if (analyticsPeriod === "monthly") {
            // Build month totals for the selected six-month calendar window.
            const monthTotals = new Map();
            windowKeys.forEach((k, idx) => {
              const mKey = k.slice(0, 7); // YYYY-MM
              monthTotals.set(
                mKey,
                (monthTotals.get(mKey) || 0) + (windowCounts[idx] || 0)
              );
            });
            const monthsSeq = [];
            for (
              let m = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
              m <= new Date(endDate.getFullYear(), endDate.getMonth(), 1);
              m = new Date(m.getFullYear(), m.getMonth() + 1, 1)
            ) {
              const mKey = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(
                2,
                "0"
              )}`;
              monthsSeq.push(mKey);
            }
            setUsageLabels(
              monthsSeq.map((mKey) => {
                const [y, mth] = mKey.split("-");
                return `${parseInt(mth, 10)}/${y.slice(2)}`;
              })
            );
            setUsageData(monthsSeq.map((mKey) => monthTotals.get(mKey) || 0));
          }
        } catch {
          const fallbackLen =
            analyticsPeriod === "daily"
              ? 7
              : analyticsPeriod === "weekly"
              ? 4
              : 6;
          setUsageLabels(new Array(fallbackLen).fill(""));
          setUsageData(new Array(fallbackLen).fill(0));
        }
      } else {
        const fallbackLen =
          analyticsPeriod === "daily"
            ? 7
            : analyticsPeriod === "weekly"
            ? 4
            : 6;
        setUsageLabels(new Array(fallbackLen).fill(""));
        setUsageData(new Array(fallbackLen).fill(0));
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      Alert.alert("Error", "Failed to load dashboard data");
    } finally {
      hasLoadedDashboardRef.current = true;
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, analyticsPeriod, calendarWindow]);

  const handlePeriodChange = useCallback(
    (newPeriod) => {
      setAnalyticsPeriod(newPeriod);
      setCalendarPage(0);
      setSelectedUsagePoint(null);
    },
    []
  );

  const handleCalendarPageChange = useCallback((direction) => {
    setCalendarPage((current) => {
      if (direction > 0) {
        return current + 1;
      }
      return Math.max(0, current - 1);
    });
    setSelectedUsagePoint(null);
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Separate useEffect for analytics data that depends on period
  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Check if user is admin to show different dashboard content
  const isAdmin = user?.privilege === "admin";

  // Handle chart data point click
  const handleDataPointClick = useCallback((data) => {
    if (data && data.dataset && data.dataset.data && data.index !== undefined) {
      setTooltipData(data);
      setShowTooltip(true);
    }
  }, []);

  // Close tooltip
  const closeTooltip = useCallback(() => {
    setShowTooltip(false);
    setTooltipData(null);
  }, []);

  const togglePieRole = useCallback((roleName) => {
    setSelectedRole((current) => (current === roleName ? null : roleName));
  }, []);

  const toggleActiveRoleSeries = useCallback((roleKey) => {
    setVisibleActiveRoleSeries((current) => {
      const next = { ...current, [roleKey]: !current[roleKey] };
      // Keep at least one role visible so chart always remains actionable.
      if (Object.values(next).every((isVisible) => !isVisible)) {
        return current;
      }
      return next;
    });
  }, []);

  const chartWidth = useMemo(() => {
    const available = viewportWidth - (Platform.OS === "web" ? 84 : 60);
    const max = Platform.OS === "web" ? 820 : viewportWidth - 12;
    return Math.max(260, Math.min(available, max));
  }, [viewportWidth]);

  const usageChartHeight = isAndroid ? 280 : 240;
  const activeUsersChartHeight = isAndroid ? 300 : 260;
  const contentChartHeight = isAndroid ? 250 : 220;
  const monthlyLabelSpacing = isAndroid ? 104 : 80;

  const pieChartSize = useMemo(
    () => Math.max(isAndroid ? 210 : 190, Math.min(chartWidth - 8, 320)),
    [chartWidth, isAndroid]
  );

  const pieChartCanvasWidth = useMemo(
    () => Math.max(pieChartSize, chartWidth - 16),
    [chartWidth, pieChartSize]
  );

  const chartConfig = {
    backgroundGradientFrom: colors.card,
    backgroundGradientTo: colors.card,
    color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.7,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
    labelColor: (opacity = 1) => `rgba(55, 65, 81, ${opacity})`,
    fillShadowGradientOpacity: 0.2,
    fillShadowGradientFromOpacity: 0.2,
    fillShadowGradientToOpacity: 0.02,
    propsForLabels: {
      fontSize: isAndroid ? 13 : 11,
      fontWeight: "700",
    },
    propsForDots: {
      r: "4",
      strokeWidth: "2",
      stroke: colors.primary,
    },
    propsForBackgroundLines: {
      stroke: colors.textSecondary + "26",
    },
  };

  const pieRoles = useMemo(
    () => [
      {
        key: "students",
        name: "Students",
        population: stats.totalStudents,
        color: "#6366F1",
        colorRgb: "99, 102, 241",
      },
      {
        key: "instructors",
        name: "Instructors",
        population: stats.totalInstructors,
        color: "#10B981",
        colorRgb: "16, 185, 129",
      },
      {
        key: "admins",
        name: "Admins",
        population:
          stats.totalUsers - stats.totalStudents - stats.totalInstructors,
        color: "#F59E0B",
        colorRgb: "245, 158, 11",
      },
    ],
    [stats.totalInstructors, stats.totalStudents, stats.totalUsers]
  );

  const userRoleData = useMemo(
    () =>
      pieRoles.map((role) => ({
        ...role,
        color:
          selectedRole && selectedRole !== role.name
            ? `rgba(${role.colorRgb}, 0.3)`
            : role.color,
        legendFontColor: colors.text,
        legendFontSize: 14,
      })),
    [colors.text, pieRoles, selectedRole]
  );

  const activeRoleSeries = useMemo(() => {
    const base = [
      {
        key: "students",
        label: "Students",
        colorHex: "#3B82F6",
        colorRgba: "rgba(59,130,246,",
        values: activeUsersStats.students,
      },
      {
        key: "instructors",
        label: "Instructors",
        colorHex: "#10B981",
        colorRgba: "rgba(16,185,129,",
        values: activeUsersStats.instructors,
      },
      {
        key: "admins",
        label: "Admins",
        colorHex: "#EF4444",
        colorRgba: "rgba(239,68,68,",
        values: activeUsersStats.admins,
      },
    ];

    return base.filter((series) => visibleActiveRoleSeries[series.key]);
  }, [activeUsersStats.admins, activeUsersStats.instructors, activeUsersStats.students, visibleActiveRoleSeries]);

  const handleActiveUsersDataPointClick = useCallback(
    (data) => {
      const pointIndex = data?.index;
      if (pointIndex === undefined || pointIndex === null) {
        return;
      }

      const clickedValue = Number(data?.value ?? 0);
      let selectedSeries = null;

      if (data?.dataset?.roleKey) {
        selectedSeries = activeRoleSeries.find(
          (series) => series.key === data.dataset.roleKey
        );
      }

      if (!selectedSeries && data?.dataset?.label) {
        selectedSeries = activeRoleSeries.find(
          (series) => series.label === data.dataset.label
        );
      }

      if (!selectedSeries && Number.isInteger(data?.datasetIndex)) {
        selectedSeries = activeRoleSeries[data.datasetIndex];
      }

      if (!selectedSeries) {
        const matchedByValue = activeRoleSeries.filter(
          (series) => (series.values[pointIndex] || 0) === clickedValue
        );
        if (matchedByValue.length === 1) {
          selectedSeries = matchedByValue[0];
        }
      }

      if (!selectedSeries) {
        selectedSeries = activeRoleSeries[0];
      }

      const dataValues = activeRoleSeries.map(
        (series) => series.values[pointIndex] || 0
      );
      const overlappingDatasets = activeRoleSeries
        .map((series) => series.label)
        .filter(
          (_, idx) => dataValues[idx] === clickedValue && dataValues[idx] !== 0
        );
      const periodLabel =
        analyticsPeriod === "daily"
          ? "Day"
          : analyticsPeriod === "weekly"
          ? "Week"
          : "Month";

      handleDataPointClick({
        x: activeUsersStats.labels[pointIndex],
        value: clickedValue,
        index: pointIndex,
        dataset: {
          label:
            overlappingDatasets.length > 1
              ? overlappingDatasets.join(", ")
              : selectedSeries?.label || "Users",
          data: selectedSeries?.values || [],
        },
        overlappingDatasets:
          overlappingDatasets.length > 1 ? overlappingDatasets : null,
        xLabel: periodLabel,
        yLabel: "Active Users",
      });
    },
    [activeRoleSeries, activeUsersStats.labels, analyticsPeriod, handleDataPointClick]
  );

  const contentData = {
    labels: ["Modules", "Quizzes", "Active Sessions"],
    datasets: [
      {
        data: [stats.totalModules, stats.totalQuizzes, stats.activeSessions],
      },
    ],
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading admin dashboard...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <LinearGradient colors={["#caf1c8", "#5fd2cd"]} style={styles.container}>
      {/* Make status bar transparent so header sits flush at the very top */}
      <StatusBar style="dark" translucent backgroundColor="transparent" />
      {/* Exclude top edge so there is no extra space above the header */}
      <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.surface }]}>
          <View style={styles.headerContent}>
            <MaterialCommunityIcons
              name="view-dashboard"
              size={28}
              color={colors.primary}
            />
            <View style={styles.headerText}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                {isAdmin ? "Admin Dashboard" : "Dashboard"}
              </Text>
              <Text
                style={[styles.headerSubtitle, { color: colors.textSecondary }]}
              >
                {isAdmin
                  ? "System Overview & Analytics"
                  : "Your Learning Dashboard"}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleRefresh} disabled={refreshing}>
            <MaterialCommunityIcons
              name={refreshing ? "loading" : "refresh"}
              size={24}
              color={colors.primary}
              style={{
                transform: [{ rotateZ: refreshing ? "45deg" : "0deg" }],
              }}
            />
          </TouchableOpacity>
        </View>

        {/* Internal Admin Sections */}
        {isAdmin && (
          <View
            style={[
              styles.sectionTabs,
              { borderBottomColor: colors.textSecondary + "20" },
            ]}
          >
            {[
              {
                key: "overview",
                label: "Overview",
                icon: "view-dashboard-outline",
              },
              {
                key: "users",
                label: "Manage Users",
                icon: "account-multiple-outline",
              },
              {
                key: "logs",
                label: "Audit Logs",
                icon: "file-document-outline",
              },
            ].map((t) => {
              const active = section === t.key;
              return (
                <TouchableOpacity
                  key={t.key}
                  onPress={() => setSection(t.key)}
                  style={[
                    styles.sectionTab,
                    active && { backgroundColor: colors.primary },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={t.icon}
                    size={16}
                    color={active ? "#FFF" : colors.primary}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.sectionTabText,
                      { color: active ? COLORS.navy : colors.text },
                    ]}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {section === "overview" || !isAdmin ? (
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
          >
            {/* Add a container to limit width on web */}
            <View style={styles.contentWrapper}>
              {/* Key Statistics Cards */}
              <View style={styles.statsContainer}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  📊 {isAdmin ? "System Statistics" : "Quick Stats"}
                </Text>
                <View style={styles.statsGrid}>
                  <View
                    style={[styles.statCard, { backgroundColor: colors.card }]}
                  >
                    <MaterialCommunityIcons
                      name="account-group"
                      size={24}
                      color="#6366F1"
                    />
                    <Text style={[styles.statValue, { color: colors.text }]}>
                      {isAdmin ? stats.totalStudents : "Welcome"}
                    </Text>
                    <Text
                      style={[
                        styles.statLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {isAdmin ? "Students" : "Students"}
                    </Text>
                  </View>

                  <View
                    style={[styles.statCard, { backgroundColor: colors.card }]}
                  >
                    <MaterialCommunityIcons
                      name={isAdmin ? "school" : "book-open-variant"}
                      size={24}
                      color="#10B981"
                    />
                    <Text style={[styles.statValue, { color: colors.text }]}>
                      {isAdmin
                        ? stats.totalInstructors
                        : stats.totalModules || 0}
                    </Text>
                    <Text
                      style={[
                        styles.statLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {isAdmin ? "Instructors" : "Modules"}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Top Performer - Admin Only */}
              {isAdmin && (
                <View style={styles.topPerformerContainer}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    🏆 Top Performing Student
                  </Text>
                  {topPerformer ? (
                    <View
                      style={[
                        styles.topPerformerCard,
                        { backgroundColor: colors.card },
                      ]}
                    >
                      <View style={styles.crownContainer}>
                        <MaterialCommunityIcons
                          name="crown"
                          size={32}
                          color="#FFD700"
                        />
                      </View>
                      <View style={styles.performerInfo}>
                        <Text
                          style={[styles.performerName, { color: colors.text }]}
                        >
                          {topPerformer.username}
                        </Text>
                        <Text
                          style={[styles.performerScore, { color: "#6366F1" }]}
                        >
                          {topPerformer.totalXP || 0} XP
                        </Text>
                        <Text
                          style={[
                            styles.performerLevel,
                            { color: colors.textSecondary },
                          ]}
                        >
                          Level {topPerformer.level || 1}
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <View
                      style={[
                        styles.emptyPerformerCard,
                        { backgroundColor: colors.card },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="trophy-broken"
                        size={32}
                        color={colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.emptyPerformerText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        No student activity yet
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* User Distribution Chart - Admin Only */}
              {isAdmin && stats.totalUsers > 0 && (
                <View style={styles.chartContainer}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    📈 User Distribution
                  </Text>
                  <View
                    style={[
                      styles.chartCard,
                      { backgroundColor: colors.card, alignItems: "center" },
                    ]}
                  >
                    <View style={styles.pieChartContainer}>
                      <PieChart
                        data={userRoleData}
                        width={pieChartCanvasWidth}
                        height={pieChartSize}
                        chartConfig={{
                          ...chartConfig,
                          color: (opacity = 1) => `rgba(0,0,0,${opacity})`,
                        }}
                        accessor="population"
                        backgroundColor="transparent"
                        paddingLeft={"0"}
                        center={[0, 0]}
                        absolute
                        hasLegend={false}
                        style={{ marginVertical: 4, borderRadius: 16 }}
                        onDataPointClick={(slice) => {
                          togglePieRole(slice.name);
                          handleDataPointClick({
                            x: slice.name,
                            value: slice.population,
                            index: slice.index,
                            dataset: {
                              label: slice.name,
                              data: userRoleData.map((item) => item.population),
                            },
                            xLabel: "Role",
                            yLabel: "Users",
                          });
                        }}
                      />
                    </View>
                    <Text
                      style={{
                        marginTop: 4,
                        fontSize: 12,
                        color: colors.textSecondary,
                      }}
                    >
                      Total Users: {stats.totalUsers}
                    </Text>
                    <View style={{ marginTop: 12, width: "100%" }}>
                      {userRoleData.map((d) => {
                        const pct = stats.totalUsers
                          ? ((d.population / stats.totalUsers) * 100).toFixed(1)
                          : "0.0";
                        const isSelected = selectedRole === d.name;
                        return (
                          <TouchableOpacity
                            key={d.name}
                            onPress={() => togglePieRole(d.name)}
                            activeOpacity={0.85}
                            accessibilityRole="button"
                            accessibilityLabel={`${d.name} role filter`}
                            accessibilityHint="Tap to highlight this pie chart role"
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              marginBottom: 6,
                              borderRadius: 10,
                              paddingHorizontal: 8,
                              paddingVertical: 6,
                              backgroundColor: isSelected
                                ? colors.primary + "22"
                                : "transparent",
                            }}
                          >
                            <View
                              style={{
                                width: 14,
                                height: 14,
                                borderRadius: 7,
                                backgroundColor: pieRoles.find((r) => r.name === d.name)
                                  ?.color,
                                marginRight: 8,
                              }}
                            />
                            <Text
                              style={{
                                flex: 1,
                                color: colors.text,
                                fontSize: 13,
                                fontWeight: "600",
                              }}
                            >
                              {d.name}
                            </Text>
                            <Text
                              style={{
                                color: colors.textSecondary,
                                fontSize: 12,
                              }}
                            >
                              {d.population} ({pct}%)
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    <View style={styles.interactionHintRow}>
                      <MaterialCommunityIcons
                        name="gesture-tap"
                        size={14}
                        color={colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.interactionHintText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Tap a slice or role row to highlight distribution.
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* System Usage Line Chart (Students per Day/Week/Month) - Admin Only */}
              {isAdmin && (
                <View style={styles.chartContainer}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    📊 System Usage
                  </Text>
                  <View
                    style={[styles.chartCard, { backgroundColor: colors.card }]}
                  >
                    <View style={styles.calendarControlsRow}>
                      <TouchableOpacity
                        style={styles.calendarButton}
                        onPress={() => handleCalendarPageChange(1)}
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityLabel="Previous date range"
                        accessibilityHint="Shows an older date window"
                      >
                        <MaterialCommunityIcons
                          name="chevron-left"
                          size={18}
                          color={colors.primary}
                        />
                      </TouchableOpacity>
                      <Text
                        style={[styles.calendarLabel, { color: colors.textSecondary }]}
                      >
                        {calendarLabel}
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.calendarButton,
                          isLatestCalendarWindow && styles.calendarButtonDisabled,
                        ]}
                        onPress={() => handleCalendarPageChange(-1)}
                        disabled={isLatestCalendarWindow}
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityLabel="Next date range"
                        accessibilityHint="Shows a newer date window"
                      >
                        <MaterialCommunityIcons
                          name="chevron-right"
                          size={18}
                          color={
                            isLatestCalendarWindow
                              ? colors.textSecondary
                              : colors.primary
                          }
                        />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.interactionHintRow}>
                      <MaterialCommunityIcons
                        name="gesture-tap"
                        size={14}
                        color={colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.interactionHintText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Use arrows to change range. Tap any point for details.
                      </Text>
                    </View>
                    <Animated.View
                      style={[
                        styles.animatedChart,
                        {
                          opacity: chartFadeAnim,
                          transform: [
                            {
                              translateY: chartFadeAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [10, 0],
                              }),
                            },
                          ],
                        },
                      ]}
                    >
                    {analyticsPeriod === "monthly" ? (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                      >
                        {(() => {
                          const dynamicWidth = Math.max(
                            chartWidth,
                            usageLabels.length * monthlyLabelSpacing
                          );
                          return (
                            <LineChart
                              data={{
                                labels: usageLabels.length ? usageLabels : [""],
                                datasets: [
                                  {
                                    data: usageData.length ? usageData : [0],
                                    color: (o = 1) => `rgba(16,185,129,${o})`,
                                    strokeWidth: 2,
                                  },
                                ],
                                legend: ["Students per Month"],
                              }}
                              width={dynamicWidth}
                              height={usageChartHeight}
                              yAxisInterval={1}
                              chartConfig={{
                                ...chartConfig,
                                color: (o = 1) => `rgba(16,185,129,${o})`,
                                labelColor: (o = 1) => `rgba(156,163,175,${o})`,
                                propsForBackgroundLines: {
                                  stroke: colors.textSecondary + "30",
                                },
                                propsForDots: {
                                  r: "3",
                                  strokeWidth: "2",
                                  stroke: "#10B981",
                                },
                              }}
                              bezier
                              style={{ marginVertical: 8, borderRadius: 16 }}
                              fromZero
                              segments={4}
                              verticalLabelRotation={
                                isAndroid && analyticsPeriod !== "daily" ? 18 : 0
                              }
                              onDataPointClick={(data) => {
                                const point = {
                                  label: usageLabels[data.index],
                                  value: usageData[data.index],
                                  series: "Students per Month",
                                };
                                setSelectedUsagePoint(point);
                                handleDataPointClick({
                                  x: usageLabels[data.index],
                                  value: usageData[data.index],
                                  index: data.index,
                                  dataset: {
                                    label: "Students per Month",
                                    data: usageData,
                                  },
                                  xLabel: "Month",
                                  yLabel: "Number of Students",
                                });
                              }}
                            />
                          );
                        })()}
                      </ScrollView>
                    ) : (
                      <LineChart
                        data={{
                          labels: usageLabels.length ? usageLabels : [""],
                          datasets: [
                            {
                              data: usageData.length ? usageData : [0],
                              color: (o = 1) => `rgba(16,185,129,${o})`,
                              strokeWidth: 2,
                            },
                          ],
                          legend: [
                            analyticsPeriod === "daily"
                              ? "Students per Day"
                              : "Students per Week",
                          ],
                        }}
                        width={chartWidth}
                        height={usageChartHeight}
                        yAxisInterval={1}
                        chartConfig={{
                          ...chartConfig,
                          color: (o = 1) => `rgba(16,185,129,${o})`,
                          labelColor: (o = 1) => `rgba(156,163,175,${o})`,
                          propsForBackgroundLines: {
                            stroke: colors.textSecondary + "30",
                          },
                          propsForDots: {
                            r: "3",
                            strokeWidth: "2",
                            stroke: "#10B981",
                          },
                        }}
                        bezier
                        style={{ marginVertical: 8, borderRadius: 16 }}
                        fromZero
                        segments={4}
                        verticalLabelRotation={
                          isAndroid && analyticsPeriod !== "daily" ? 18 : 0
                        }
                        onDataPointClick={(data) => {
                          const legendLabel =
                            analyticsPeriod === "daily"
                              ? "Students per Day"
                              : "Students per Week";
                          const periodLabel =
                            analyticsPeriod === "daily" ? "Day" : "Week";
                          setSelectedUsagePoint({
                            label: usageLabels[data.index],
                            value: usageData[data.index],
                            series: legendLabel,
                          });
                          handleDataPointClick({
                            x: usageLabels[data.index],
                            value: usageData[data.index],
                            index: data.index,
                            dataset: { label: legendLabel, data: usageData },
                            xLabel: periodLabel,
                            yLabel: "Number of Students",
                          });
                        }}
                      />
                    )}
                    </Animated.View>
                    {selectedUsagePoint && (
                      <View
                        style={[
                          styles.selectedPointChip,
                          { backgroundColor: colors.primary + "16" },
                        ]}
                      >
                        <Text
                          style={[
                            styles.selectedPointText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {selectedUsagePoint.series}: {selectedUsagePoint.label} = {selectedUsagePoint.value}
                        </Text>
                      </View>
                    )}
                    {usageData.reduce((a, b) => a + b, 0) === 0 && (
                      <Text
                        style={{ marginTop: 8, color: colors.textSecondary }}
                      >
                        No recent student usage. Showing empty chart.
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {/* Analytics Period Selector - Admin Only */}
              {isAdmin && (
                <View style={styles.periodSelectorContainer}>

                  <View style={styles.periodSelectorRow}>
                    {["daily", "weekly", "monthly"].map((period) => (
                      <TouchableOpacity
                        key={period}
                        style={[
                          styles.periodButton,
                          analyticsPeriod === period && {
                            backgroundColor: colors.primary,
                          },
                        ]}
                        onPress={() => handlePeriodChange(period)}
                        accessibilityRole="button"
                        accessibilityLabel={`${period} period`}
                        accessibilityHint="Switches chart grouping window"
                      >
                        <Text
                          style={[
                            styles.periodButtonText,
                            {
                              color:
                                analyticsPeriod === period
                                  ? "#FFFFFF"
                                  : colors.text,
                            },
                          ]}
                        >
                          {period.charAt(0).toUpperCase() + period.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={styles.interactionHintRow}>
                    <MaterialCommunityIcons
                      name="information-outline"
                      size={14}
                      color={colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.interactionHintText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Tap Daily, Weekly, or Monthly to change how points are grouped.
                    </Text>
                  </View>
                </View>
              )}

              {/* Quiz Completion Statistics - Admin Only */}
              {/* Quiz Completion Statistics by Role graph removed per request */}

              {/* Active Users by Role - Admin Only */}
              {isAdmin && (
                <View style={styles.chartContainer}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    👥 Active Users
                  </Text>
                  <View
                    style={[styles.chartCard, { backgroundColor: colors.card }]}
                  >
                    <View style={styles.calendarControlsRow}>
                      <TouchableOpacity
                        style={styles.calendarButton}
                        onPress={() => handleCalendarPageChange(1)}
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityLabel="Previous active users range"
                        accessibilityHint="Shows an older active users date window"
                      >
                        <MaterialCommunityIcons
                          name="chevron-left"
                          size={18}
                          color={colors.primary}
                        />
                      </TouchableOpacity>
                      <Text
                        style={[styles.calendarLabel, { color: colors.textSecondary }]}
                      >
                        {calendarLabel}
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.calendarButton,
                          isLatestCalendarWindow && styles.calendarButtonDisabled,
                        ]}
                        onPress={() => handleCalendarPageChange(-1)}
                        disabled={isLatestCalendarWindow}
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityLabel="Next active users range"
                        accessibilityHint="Shows a newer active users date window"
                      >
                        <MaterialCommunityIcons
                          name="chevron-right"
                          size={18}
                          color={
                            isLatestCalendarWindow
                              ? colors.textSecondary
                              : colors.primary
                          }
                        />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.interactionHintRow}>
                      <MaterialCommunityIcons
                        name="gesture-tap"
                        size={14}
                        color={colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.interactionHintText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Tap legend items to show or hide role lines.
                      </Text>
                    </View>
                    <Animated.View
                      style={[
                        styles.animatedChart,
                        {
                          opacity: chartFadeAnim,
                          transform: [
                            {
                              translateY: chartFadeAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [10, 0],
                              }),
                            },
                          ],
                        },
                      ]}
                    >
                    {analyticsPeriod === "monthly" ? (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                      >
                        {(() => {
                          const dynamicWidth = Math.max(
                            chartWidth,
                            activeUsersStats.labels.length * monthlyLabelSpacing
                          );
                          return (
                            <LineChart
                              data={{
                                labels: activeUsersStats.labels.length
                                  ? activeUsersStats.labels
                                  : [""],
                                datasets: [
                                  ...(activeRoleSeries.length
                                    ? activeRoleSeries
                                    : [
                                        {
                                          key: "students",
                                          label: "Students",
                                          values: [0],
                                          colorRgba: "rgba(59,130,246,",
                                        },
                                      ]
                                  ).map((series) => ({
                                    data: series.values.length
                                      ? series.values
                                      : [0],
                                    color: (o = 1) => `${series.colorRgba}${o})`,
                                    strokeWidth: 3,
                                    roleKey: series.key,
                                    label: series.label,
                                  })),
                                ],
                                legend: activeRoleSeries.map((d) => d.label),
                              }}
                              width={dynamicWidth}
                              height={activeUsersChartHeight}
                              yAxisInterval={1}
                              chartConfig={{
                                ...chartConfig,
                                labelColor: (o = 1) => `rgba(156,163,175,${o})`,
                                propsForBackgroundLines: {
                                  stroke: colors.textSecondary + "30",
                                },
                                propsForDots: { r: "3", strokeWidth: "2" },
                              }}
                              bezier
                              style={{ marginVertical: 8, borderRadius: 16 }}
                              fromZero
                              segments={4}
                              verticalLabelRotation={
                                isAndroid && analyticsPeriod !== "daily" ? 18 : 0
                              }
                              onDataPointClick={handleActiveUsersDataPointClick}
                            />
                          );
                        })()}
                      </ScrollView>
                    ) : (
                      <LineChart
                        data={{
                          labels: activeUsersStats.labels.length
                            ? activeUsersStats.labels
                            : [""],
                          datasets: [
                            ...(activeRoleSeries.length
                              ? activeRoleSeries
                              : [
                                  {
                                    key: "students",
                                    label: "Students",
                                    values: [0],
                                    colorRgba: "rgba(59,130,246,",
                                  },
                                ]
                            ).map((series) => ({
                              data: series.values.length ? series.values : [0],
                              color: (o = 1) => `${series.colorRgba}${o})`,
                              strokeWidth: 3,
                              roleKey: series.key,
                              label: series.label,
                            })),
                          ],
                          legend: activeRoleSeries.map((d) => d.label),
                        }}
                        width={chartWidth}
                        height={activeUsersChartHeight}
                        yAxisInterval={1}
                        chartConfig={{
                          ...chartConfig,
                          labelColor: (o = 1) => `rgba(156,163,175,${o})`,
                          propsForBackgroundLines: {
                            stroke: colors.textSecondary + "30",
                          },
                          propsForDots: { r: "3", strokeWidth: "2" },
                        }}
                        bezier
                        style={{ marginVertical: 8, borderRadius: 16 }}
                        fromZero
                        segments={4}
                        verticalLabelRotation={
                          isAndroid && analyticsPeriod !== "daily" ? 18 : 0
                        }
                        onDataPointClick={handleActiveUsersDataPointClick}
                      />
                    )}
                    </Animated.View>
                    <View style={styles.legendContainer}>
                      <TouchableOpacity
                        style={[
                          styles.legendItem,
                          !visibleActiveRoleSeries.students &&
                            styles.legendItemInactive,
                        ]}
                        onPress={() => toggleActiveRoleSeries("students")}
                        accessibilityRole="button"
                        accessibilityLabel="Toggle students line"
                      >
                        <View
                          style={[
                            styles.legendColor,
                            { backgroundColor: "#3B82F6" },
                          ]}
                        />
                        <Text
                          style={[styles.legendText, { color: colors.text }]}
                        >
                          Students
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.legendItem,
                          !visibleActiveRoleSeries.instructors &&
                            styles.legendItemInactive,
                        ]}
                        onPress={() => toggleActiveRoleSeries("instructors")}
                        accessibilityRole="button"
                        accessibilityLabel="Toggle instructors line"
                      >
                        <View
                          style={[
                            styles.legendColor,
                            { backgroundColor: "#10B981" },
                          ]}
                        />
                        <Text
                          style={[styles.legendText, { color: colors.text }]}
                        >
                          Instructors
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.legendItem,
                          !visibleActiveRoleSeries.admins &&
                            styles.legendItemInactive,
                        ]}
                        onPress={() => toggleActiveRoleSeries("admins")}
                        accessibilityRole="button"
                        accessibilityLabel="Toggle admins line"
                      >
                        <View
                          style={[
                            styles.legendColor,
                            { backgroundColor: "#EF4444" },
                          ]}
                        />
                        <Text
                          style={[styles.legendText, { color: colors.text }]}
                        >
                          Admins
                        </Text>
                      </TouchableOpacity>
                    </View>
                    {activeUsersStats.students.reduce((a, b) => a + b, 0) +
                      activeUsersStats.instructors.reduce((a, b) => a + b, 0) +
                      activeUsersStats.admins.reduce((a, b) => a + b, 0) ===
                      0 && (
                      <Text
                        style={{ marginTop: 8, color: colors.textSecondary }}
                      >
                        No active users in selected period.
                      </Text>
                    )}
                  </View>
                </View>
              )}
              {/* Content Statistics Chart */}
              {(stats.totalModules > 0 || stats.totalQuizzes > 0) && (
                <View style={styles.chartContainer}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    📚 Platform Content
                  </Text>
                  <View
                    style={[styles.chartCard, { backgroundColor: colors.card }]}
                  >
                    <BarChart
                      data={contentData}
                      width={chartWidth}
                      height={contentChartHeight}
                      yAxisLabel=""
                      chartConfig={chartConfig}
                      verticalLabelRotation={30}
                      showValuesOnTopOfBars={true}
                      fromZero
                      onDataPointClick={(data) => {
                        handleDataPointClick({
                          x: contentData.labels[data.index],
                          value: data.value,
                          index: data.index,
                          dataset: {
                            label: "Platform Content",
                            data: contentData.datasets[0].data,
                          },
                          xLabel: "Metric",
                          yLabel: "Count",
                        });
                      }}
                    />
                  </View>
                </View>
              )}
              {/* Bottom Padding */}
              <View style={styles.bottomPadding} />
            </View>
          </ScrollView>
        ) : isAdmin && section === "users" ? (
          <View style={{ flex: 1 }}>
            <UsersScreen hideHeader={true} />
          </View>
        ) : isAdmin && section === "logs" ? (
          <View style={{ flex: 1 }}>
            <LogsScreen />
          </View>
        ) : null}

        {/* Interactive Tooltip Modal */}
        <Modal
          visible={showTooltip}
          transparent={true}
          animationType="fade"
          onRequestClose={closeTooltip}
        >
          <TouchableOpacity
            style={styles.tooltipOverlay}
            activeOpacity={1}
            onPress={closeTooltip}
          >
            <View
              style={[
                styles.tooltipContainer,
                { backgroundColor: colors.card },
              ]}
            >
              <View style={styles.tooltipHeader}>
                <Text style={[styles.tooltipTitle, { color: colors.text }]}>
                  Data Point Details
                </Text>
                <TouchableOpacity onPress={closeTooltip}>
                  <MaterialCommunityIcons
                    name="close"
                    size={24}
                    color={colors.text}
                  />
                </TouchableOpacity>
              </View>
              {tooltipData && (
                <View style={styles.tooltipContent}>
                  <View style={styles.tooltipRow}>
                    <Text
                      style={[
                        styles.tooltipLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {tooltipData.xLabel || "Period"}:
                    </Text>
                    <Text style={[styles.tooltipValue, { color: colors.text }]}>
                      {tooltipData.x ?? "N/A"}
                    </Text>
                  </View>
                  <View style={styles.tooltipRow}>
                    <Text
                      style={[
                        styles.tooltipLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {tooltipData.yLabel || "Value"}:
                    </Text>
                    <Text style={[styles.tooltipValue, { color: colors.text }]}>
                      {tooltipData.value ?? "N/A"}
                    </Text>
                  </View>
                  {tooltipData.overlappingDatasets &&
                  tooltipData.overlappingDatasets.length > 1 ? (
                    <View style={styles.tooltipRow}>
                      <Text
                        style={[
                          styles.tooltipLabel,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Roles:
                      </Text>
                      <View style={{ flex: 1, alignItems: "flex-end" }}>
                        {tooltipData.overlappingDatasets.map((role, idx) => (
                          <Text
                            key={idx}
                            style={[
                              styles.tooltipValue,
                              {
                                color:
                                  role === "Students"
                                    ? "#3B82F6"
                                    : role === "Instructors"
                                    ? "#10B981"
                                    : "#EF4444",
                                fontSize: 14,
                                marginTop: idx > 0 ? 4 : 0,
                              },
                            ]}
                          >
                            • {role}
                          </Text>
                        ))}
                      </View>
                    </View>
                  ) : (
                    tooltipData.dataset &&
                    tooltipData.dataset.label && (
                      <View style={styles.tooltipRow}>
                        <Text
                          style={[
                            styles.tooltipLabel,
                            { color: colors.textSecondary },
                          ]}
                        >
                          Role:
                        </Text>
                        <Text
                          style={[
                            styles.tooltipValue,
                            {
                              color:
                                tooltipData.dataset.label === "Students"
                                  ? "#3B82F6"
                                  : tooltipData.dataset.label === "Instructors"
                                  ? "#10B981"
                                  : "#EF4444",
                            },
                          ]}
                        >
                          {tooltipData.dataset.label}
                        </Text>
                      </View>
                    )
                  )}
                </View>
              )}
            </View>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  pieChartContainer: {
    width: "100%",
    alignItems: "center",
    maxWidth: 300,
  },
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingTop: 0,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    paddingTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerText: {
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  sectionTabs: {
    // Reduced gap below header
    marginTop: 88,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    backgroundColor: "rgba(255, 255, 255, 0.02)",
  },
  sectionTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 4,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: "rgba(99, 102, 241, 0.2)",
    transition: "all 0.2s ease",
  },
  sectionTabText: {
    fontSize: 12,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
  },
  statsContainer: {
    padding: 24,
    paddingBottom: 16,
    width: "100%",
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    padding: 24,
    marginHorizontal: 6,
    borderRadius: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  statValue: {
    fontSize: 28,
    fontWeight: "bold",
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  topPerformerContainer: {
    padding: 24,
    paddingTop: 8,
  },
  topPerformerCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 24,
    borderRadius: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  crownContainer: {
    marginRight: 16,
  },
  performerInfo: {
    flex: 1,
  },
  performerName: {
    fontSize: 20,
    fontWeight: "bold",
  },
  performerScore: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 4,
  },
  performerLevel: {
    fontSize: 14,
    marginTop: 2,
  },
  emptyPerformerCard: {
    flexDirection: "row",
    justifyContent: "center",
    padding: 24,
    borderRadius: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  emptyPerformerText: {
    fontSize: 16,
    marginLeft: 12,
  },
  chartContainer: {
    padding: Platform.OS === "android" ? 16 : 24,
    paddingTop: 8,
    width: "100%",
  },
  chartCard: {
    borderRadius: 16,
    padding: Platform.OS === "android" ? 14 : 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    alignItems: "center",
    overflow: Platform.OS === "android" ? "visible" : "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    width: "100%",
    maxWidth: Platform.OS === "web" ? 800 : "100%",
    alignSelf: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  accessDenied: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  accessDeniedTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
  },
  accessDeniedText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  bottomPadding: {
    height: 20,
  },
  periodSelectorContainer: {
    padding: 24,
    paddingTop: 8,
  },
  periodSelectorRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginBottom: 16,
  },
  periodButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "rgba(99, 102, 241, 0.2)",
    backgroundColor: "transparent",
    minWidth: 90,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  calendarControlsRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  calendarButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.25)",
  },
  calendarButtonDisabled: {
    opacity: 0.45,
  },
  calendarLabel: {
    fontSize: Platform.OS === "android" ? 13 : 12,
    fontWeight: "600",
    textAlign: "center",
  },
  interactionHintRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
    marginBottom: 2,
  },
  interactionHintText: {
    flex: 1,
    fontSize: Platform.OS === "android" ? 12 : 11,
    lineHeight: Platform.OS === "android" ? 17 : 15,
    fontWeight: "500",
  },
  animatedChart: {
    width: "100%",
    alignItems: "center",
  },
  legendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    gap: 16,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendItemInactive: {
    opacity: 0.45,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: Platform.OS === "android" ? 13 : 12,
    fontWeight: "600",
  },
  contentWrapper: {
    width: "100%",
    maxWidth: Platform.OS === "web" ? 900 : "100%",
    alignSelf: "center",
  },
  selectedPointChip: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  selectedPointText: {
    fontSize: Platform.OS === "android" ? 13 : 12,
    fontWeight: "600",
  },
  tooltipOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  tooltipContainer: {
    borderRadius: 16,
    padding: 20,
    width: "85%",
    maxWidth: 400,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  tooltipHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(156, 163, 175, 0.2)",
  },
  tooltipTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  tooltipContent: {
    gap: 12,
  },
  tooltipRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  tooltipLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  tooltipValue: {
    fontSize: 16,
    fontWeight: "bold",
  },
});
