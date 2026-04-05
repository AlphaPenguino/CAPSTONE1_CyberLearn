import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Platform,
  Dimensions,
} from "react-native";
import React, { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import COLORS from "@/constants/custom-colors";
import { useAuthStore } from "@/store/authStore";
import { useTheme } from "../../contexts/ThemeContext";
import { API_URL } from "@/constants/api";

const { width } = Dimensions.get("window");
const isWeb = Platform.OS === "web";
// Adjusted card width calculation for potential game grid usage
const cardWidth = isWeb ? Math.min(420, width * 0.48) : width * 0.85;
// Ensure the content is centered and has a max width on web/desktop
const contentMaxWidth = isWeb ? Math.min(1400, width * 0.95) : "100%";

const FeaturedGame = ({ onPress }) => {
  return (
    <View style={styles.featuredContainer}>
      <TouchableOpacity
        onPress={onPress}
        style={styles.featuredTouchable}
        activeOpacity={0.9}
      >
        <View style={styles.featuredContent}>
          <View style={styles.featuredTextContainer}>
            <Text style={styles.featuredLabel}>FEATURED</Text>
            <Text style={styles.featuredTitle}>Quick Play</Text>
            <Text style={styles.featuredDescription}>
              Solo practice with randomized questions from all levels!
            </Text>
            <View style={styles.featuredButton}>
              <Text style={styles.featuredButtonText}>PLAY SOLO</Text>
              <Ionicons
                name="play"
                size={16}
                color="#FFFFFF"
                style={{ marginLeft: 8 }}
              />
            </View>
          </View>

          {/* Adjusted image container position and size */}
          <View style={styles.featuredImageContainer}>
            <Image
              source={require("../../assets/images/robot1.png")}
              style={styles.featuredImage}
              resizeMode="contain"
            />
          </View>
        </View>
        {/* Removed fading gradient overlay to keep robot asset fully vivid */}
      </TouchableOpacity>
    </View>
  );
};

const MultiplayerCard = ({
  title,
  description,
  icon,
  color,
  players,
  mode,
  delay,
  onPress,
  colors,
}) => {
  return (
    <View style={styles.multiplayerCardContainer}>
      <TouchableOpacity
        onPress={onPress}
        style={[styles.multiplayerCard, { backgroundColor: colors.card }]}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[color + "20", color + "10", "transparent"]}
          style={styles.multiplayerGradient}
        >
          <View style={styles.multiplayerContent}>
            <View
              style={[
                styles.multiplayerIconContainer,
                { backgroundColor: color },
              ]}
            >
              <Image
                source={icon}
                style={styles.multiplayerIconImage}
                resizeMode="contain"
              />
            </View>

            <View style={styles.multiplayerTextContainer}>
              <Text style={[styles.multiplayerTitle, { color: colors.text }]}>
                {title}
              </Text>
              <Text
                style={[
                  styles.multiplayerDescription,
                  { color: colors.textSecondary },
                ]}
              >
                {description}
              </Text>

              <View style={styles.multiplayerInfo}>
                <View style={styles.infoItem}>
                  <MaterialCommunityIcons
                    name="account-group"
                    size={14}
                    color={colors.textSecondary}
                  />
                  <Text
                    style={[styles.infoText, { color: colors.textSecondary }]}
                  >
                    {players}
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <MaterialCommunityIcons
                    name="clock-outline"
                    size={14}
                    color={colors.textSecondary}
                  />
                  <Text
                    style={[styles.infoText, { color: colors.textSecondary }]}
                  >
                    {mode}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.multiplayerArrow}>
              <MaterialCommunityIcons
                name="chevron-right"
                size={24}
                color={color}
              />
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

const LeaderboardCard = ({ title, onViewAll, colors }) => {
  return (
    <TouchableOpacity
      onPress={onViewAll}
      style={[styles.leaderboardCard, { backgroundColor: colors.card }]}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={["#FFD700" + "20", "#FFD700" + "10", "transparent"]}
        style={styles.leaderboardGradient}
      >
        <View style={styles.leaderboardContent}>
          <View
            style={[
              styles.leaderboardIconContainer,
              { backgroundColor: "#FFD700" },
            ]}
          >
            <MaterialCommunityIcons name="trophy" size={28} color="#FFFFFF" />
          </View>

          <View style={styles.leaderboardTextContainer}>
            <Text style={[styles.leaderboardTitle, { color: colors.text }]}>
              🏆 Leaderboards
            </Text>
            <Text
              style={[
                styles.leaderboardDescription,
                { color: colors.textSecondary },
              ]}
            >
              View top performers and rankings for each Subject in Cyberquest
            </Text>

            <View style={styles.leaderboardInfo}>
              <View style={styles.infoItem}>
                <MaterialCommunityIcons
                  name="account-group"
                  size={14}
                  color={colors.textSecondary}
                />
                <Text
                  style={[styles.infoText, { color: colors.textSecondary }]}
                >
                  Global Rankings
                </Text>
              </View>
              <View style={styles.infoItem}>
                <MaterialCommunityIcons
                  name="star-outline"
                  size={14}
                  color={colors.textSecondary}
                />
                <Text
                  style={[styles.infoText, { color: colors.textSecondary }]}
                >
                  Live Scores
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.leaderboardArrow}>
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color="#FFD700"
            />
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

export default function GameArcade() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  // Pull isDarkMode so we can adapt the points badge for proper contrast in light mode
  const { colors, isDarkMode } = useTheme();

  // State for user's leaderboard points
  const [userLeaderboardData, setUserLeaderboardData] = useState(null);

  // Check if user is instructor or admin
  const isInstructor =
    user?.privilege === "instructor" || user?.privilege === "admin";

  // Fetch user's leaderboard data to get their current combined score
  useEffect(() => {
    const fetchUserLeaderboardData = async () => {
      if (!token || isInstructor) return; // Don't fetch for instructors

      try {
        const response = await fetch(`${API_URL}/users/leaderboard`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data.rankings) {
            // Find current user in rankings
            const currentUserData = data.data.rankings.find(
              (ranking) =>
                ranking.username === user?.username || ranking._id === user?._id
            );
            setUserLeaderboardData(currentUserData);
          }
        }
      } catch (error) {
        console.error("Error fetching user leaderboard data:", error);
      }
    };

    fetchUserLeaderboardData();
  }, [token, user, isInstructor]);

  const multiplayerModes = [
    {
      id: "knowledge-relay",
      title: "🏃‍♂️ Knowledge Relay Race",
      description: "Team vs Team (5v5) - First to 20 correct answers wins!",
      icon: require("../../assets/images/happy1.png"),
      color: "#10B981",
      players: "5v5 Teams",
      mode: "Turn-based",
    },
    {
      id: "quiz-showdown",
      title: "⚡ Quiz Showdown",
      description: "Buzzer battle - race to answer first!",
      icon: require("../../assets/images/happy2.png"),
      color: "#F59E0B",
      players: "3v3 / 4v4",
      mode: "Real-time",
    },
    {
      id: "digital-defenders",
      title: "🛡️ Digital Defenders",
      description: "Co-op dungeon crawler - defend against digital threats!",
      icon: require("../../assets/images/shield.png"),
      color: "#8B5CF6",
      players: "2-4 Co-op",
      mode: "Turn-based RPG",
    },
  ];

  const handleGameSelect = (gameId) => {
    if (gameId === "multiplayer") {
      router.push("/multiplayer");
    } else if (gameId === "quickplay") {
      router.push("/arcade/quick-play");
    } else if (multiplayerModes.find((mode) => mode.id === gameId)) {
      router.push(`/multiplayer/${gameId}`);
    } else {
      // Navigate to the specific game
      router.push(`/arcade/${gameId}`);
    }
  };

  return (
    <LinearGradient colors={["#caf1c8", "#5fd2cd"]} style={styles.container}>
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        {/* Added wrapper for web to center content */}
        <View style={styles.contentWrapper}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={isWeb ? styles.webScrollContent : null}
          >
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.text }]}>Arcade</Text>
              {!isInstructor && (
                <View
                  style={[
                    styles.userPoints,
                    {
                      // In dark mode keep navy card background; in light mode use a subtle gold tint for contrast
                      backgroundColor: isDarkMode
                        ? COLORS.cardBackground
                        : "rgba(255,215,0,0.18)",
                      borderWidth: 1,
                      borderColor: isDarkMode
                        ? "rgba(255,215,0,0.25)"
                        : COLORS.primary,
                      shadowColor: isDarkMode ? "#000" : "#FFD700",
                      shadowOpacity: isDarkMode ? 0.3 : 0.25,
                      shadowRadius: 4,
                      shadowOffset: { width: 0, height: 2 },
                      ...(Platform.OS === "android" && {
                        elevation: 3,
                      }),
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="star"
                    size={16}
                    color="#FFD700"
                  />
                  <Text style={[styles.pointsText, { color: colors.text }]}>
                    {userLeaderboardData?.combinedScore || 0} XP
                  </Text>
                </View>
              )}
            </View>

            <FeaturedGame onPress={() => handleGameSelect("quickplay")} />

            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Multiplayer Modes
            </Text>

            <View style={styles.multiplayerGrid}>
              {multiplayerModes.map((mode, index) => (
                <MultiplayerCard
                  key={mode.id}
                  title={mode.title}
                  description={mode.description}
                  icon={mode.icon}
                  color={mode.color}
                  players={mode.players}
                  mode={mode.mode}
                  delay={400 + index * 100}
                  onPress={() => handleGameSelect(mode.id)}
                  colors={colors}
                />
              ))}
            </View>

            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Leaderboards
            </Text>

            <View style={styles.leaderboardsGrid}>
              <LeaderboardCard
                title="🏆 Leaderboards"
                onViewAll={() => router.push("/(tabs)/leaderboards")}
                colors={colors}
              />
            </View>

            <View style={styles.comingSoonContainer}>
              <Text
                style={[styles.comingSoonText, { color: colors.textSecondary }]}
              >
                {/* more games coming soon!*/}
              </Text>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  safeArea: {
    flex: 1,
  },
  // New wrapper to center content on web
  contentWrapper: {
    flex: 1,
    alignItems: isWeb ? "center" : "stretch",
    width: "100%",
  },
  // Added for web to ensure content doesn't stretch
  webScrollContent: {
    maxWidth: contentMaxWidth,
    width: "100%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    width: "100%",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  userPoints: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  pointsText: {
    color: COLORS.textPrimary,
    fontWeight: "600",
    marginLeft: 6,
  },
  // Adjusted featured container for better proportions
  featuredContainer: {
    height: isWeb ? 300 : 220,
    margin: 20,
    marginTop: 10,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#FFF",
    backgroundColor: "#c0fafb", // Lighter blue for better visibility
    width: isWeb ? "auto" : undefined,
  },
  featuredTouchable: {
    flex: 1,
    position: "relative",
  },
  featuredContent: {
    flex: 1,
    flexDirection: "row",
    padding: 20,
  },
  featuredTextContainer: {
    flex: 1,
    justifyContent: "center",
    zIndex: 2,
    // Adjusted width for web to prevent overflow
    maxWidth: isWeb ? "60%" : undefined,
  },
  featuredLabel: {
    color: COLORS.textPrimary,
    fontWeight: "bold",
    fontSize: 12,
    marginBottom: 8,
  },
  featuredTitle: {
    color: COLORS.textPrimary,
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  featuredDescription: {
    color: COLORS.textDark,
    marginBottom: 16,
    fontSize: 14,
    // Limit description to half of the card width for earlier wrapping
    width: "50%",
  },
  featuredButton: {
    backgroundColor: "#64d883",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 99,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
  },
  featuredButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 14,
  },
  // Fixed image position and size to prevent cropping
  featuredImageContainer: {
    position: "absolute",
    right: isWeb ? 20 : -20,
    bottom: isWeb ? -20 : -20,
    width: isWeb ? 240 : 180,
    height: isWeb ? 260 : 180,
    justifyContent: "center",
    alignItems: "center",
  },
  featuredImage: {
    width: "100%",
    height: "100%",
  },
  sectionTitle: {
    fontSize: isWeb ? 26 : 22,
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 16,
    marginHorizontal: 20,
    width: "100%",
  },
  // Improved grid layout for web
  gamesGrid: {
    flexDirection: isWeb ? "row" : "column",
    flexWrap: isWeb ? "wrap" : "nowrap",
    justifyContent: isWeb ? "space-around" : "center",
    alignItems: "center",
    paddingHorizontal: isWeb ? 10 : 20,
    width: "100%",
  },
  // Adjusted card container dimensions
  gameCardContainer: {
    width: isWeb ? cardWidth : "100%",
    height: 200, // Increase from 170 to 200 for more space
    margin: isWeb ? 10 : 0,
    marginBottom: 20,
    maxWidth: isWeb ? "45%" : "100%",
  },
  gameCard: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: COLORS.cardBackground, // Optional: ensure background for visibility
  },
  cardBackground: {
    position: "absolute",
    width: "100%",
    height: "100%",
    opacity: 0.6,
  },
  blurOverlay: {
    flex: 1,
  },
  cardGradient: {
    flex: 1,
    padding: 20,
  },
  cardContent: {
    flex: 1,
    justifyContent: "space-between",
    minHeight: 120, // Add this line to ensure enough space
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  gameTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  gameDescription: {
    fontSize: 14,
    color: COLORS.textDark,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  playButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "rgba(8, 8, 8, 0.2)",
    borderRadius: 16,
  },
  playText: {
    color: "#FFFFFF",
    fontWeight: "600",
    marginRight: 4,
    fontSize: 12,
  },
  comingSoonContainer: {
    marginVertical: 30,
    alignItems: "center",
    width: "100%",
  },
  comingSoonText: {
    fontSize: 16,
    fontWeight: "500",
    fontStyle: "italic",
  },
  // Multiplayer card styles
  multiplayerGrid: {
    paddingHorizontal: 20,
    marginBottom: 10,
    width: "100%",
    flexDirection: isWeb ? "row" : "column",
    flexWrap: isWeb ? "wrap" : "nowrap",
    justifyContent: isWeb ? "space-between" : "flex-start",
    gap: isWeb ? 16 : 0,
  },
  multiplayerCardContainer: {
    width: isWeb ? "49%" : "100%",
    marginBottom: 16,
  },
  multiplayerCard: {
    borderRadius: 18,
    overflow: "hidden",
  },
  multiplayerGradient: {
    padding: isWeb ? 20 : 16,
  },
  multiplayerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  multiplayerIconContainer: {
    width: isWeb ? 60 : 50,
    height: isWeb ? 60 : 50,
    borderRadius: isWeb ? 30 : 25,
    justifyContent: "center",
    alignItems: "center",
    marginRight: isWeb ? 20 : 16,
  },
  multiplayerIconImage: {
    width: "100%",
    height: "100%",
  },
  multiplayerTextContainer: {
    flex: 1,
  },
  multiplayerTitle: {
    fontSize: isWeb ? 20 : 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  multiplayerDescription: {
    fontSize: isWeb ? 16 : 14,
    marginBottom: 8,
  },
  multiplayerInfo: {
    flexDirection: "row",
    gap: isWeb ? 20 : 16,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  infoText: {
    fontSize: isWeb ? 13 : 12,
    fontWeight: "500",
  },
  multiplayerArrow: {
    marginLeft: isWeb ? 16 : 12,
  },
  // Leaderboard styles
  leaderboardsGrid: {
    paddingHorizontal: 20,
    marginBottom: 10,
    width: "100%",
  },
  leaderboardCard: {
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 16,
  },
  leaderboardGradient: {
    padding: isWeb ? 20 : 16,
  },
  leaderboardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  leaderboardIconContainer: {
    width: isWeb ? 60 : 50,
    height: isWeb ? 60 : 50,
    borderRadius: isWeb ? 30 : 25,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  leaderboardTextContainer: {
    flex: 1,
  },
  leaderboardTitle: {
    fontSize: isWeb ? 20 : 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  leaderboardDescription: {
    fontSize: isWeb ? 16 : 14,
    marginBottom: 8,
  },
  leaderboardInfo: {
    flexDirection: "row",
    gap: 16,
  },
  leaderboardArrow: {
    marginLeft: 12,
  },
});
