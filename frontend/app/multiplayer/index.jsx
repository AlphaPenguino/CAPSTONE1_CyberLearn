import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import COLORS from "@/constants/custom-colors";

export default function MultiplayerIndex() {
  const router = useRouter();

  const multiplayerGames = [
    {
      id: "quiz-showdown",
      title: "Quiz Showdown",
      subtitle: "Competitive Team Quiz Battle",
      description:
        "2 teams compete to buzz in and answer questions correctly. Fast-paced buzzer gameplay!",
      icon: "bell-ring",
      color: "#2acde6",
      players: "2-8 Players",
      route: "/(tabs)/quiz-showdown",
      status: "available",
    },
    {
      id: "knowledge-relay",
      title: "Knowledge Relay",
      subtitle: "Team-based Sequential Quiz",
      description:
        "Teams take turns answering questions in sequence. Teamwork and communication required!",
      icon: "relay",
      color: "#10b981",
      players: "2-4 Teams",
      route: "/multiplayer/knowledge-relay",
      status: "available",
    },
    {
      id: "digital-defenders",
      title: "Digital Defenders",
      subtitle: "Cooperative Tower Defense",
      description:
        "Work together to defend against cyber threats using knowledge and strategy!",
      icon: "shield-account",
      color: "#1a5344",
      players: "2-4 Players",
      route: "/(tabs)/digital-defenders",
      status: "available",
    },
  ];

  const handleGamePress = (game) => {
    if (game.status === "available") {
      router.push(game.route);
    } else {
      // Could show a "coming soon" message
      console.log(`${game.title} is coming soon!`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={["#caf1c8", "#5fd2cd"]} style={styles.gradient}>
        <ScrollView style={styles.scrollView}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <MaterialCommunityIcons
                name="account-group"
                size={40}
                color="#2acde6"
              />
              <Text style={styles.title}>Multiplayer Games</Text>
              <Text style={styles.subtitle}>
                Team up and compete with friends!
              </Text>
            </View>
          </View>

          {/* Games List */}
          <View style={styles.gamesContainer}>
            {multiplayerGames.map((game) => (
              <TouchableOpacity
                key={game.id}
                style={[
                  styles.gameCard,
                  game.status === "coming-soon" && styles.gameCardDisabled,
                ]}
                onPress={() => handleGamePress(game)}
                disabled={game.status === "coming-soon"}
              >
                <LinearGradient
                  colors={
                    game.status === "available"
                      ? [`${game.color}20`, `${game.color}10`]
                      : ["rgba(100,100,100,0.1)", "rgba(50,50,50,0.1)"]
                  }
                  style={styles.gameCardGradient}
                >
                  <View style={styles.gameIconContainer}>
                    <View
                      style={[
                        styles.gameIcon,
                        {
                          backgroundColor:
                            game.status === "available" ? game.color : "#666",
                        },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={game.icon}
                        size={32}
                        color="#4a7c59"
                      />
                    </View>
                    {game.status === "coming-soon" && (
                      <View style={styles.comingSoonBadge}>
                        <Text style={styles.comingSoonText}>Coming Soon</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.gameInfo}>
                    <Text
                      style={[
                        styles.gameTitle,
                        game.status === "coming-soon" && styles.disabledText,
                      ]}
                    >
                      {game.title}
                    </Text>
                    <Text
                      style={[
                        styles.gameSubtitle,
                        game.status === "coming-soon" && styles.disabledText,
                      ]}
                    >
                      {game.subtitle}
                    </Text>
                    <Text
                      style={[
                        styles.gameDescription,
                        game.status === "coming-soon" && styles.disabledText,
                      ]}
                    >
                      {game.description}
                    </Text>

                    <View style={styles.gameMetaContainer}>
                      <View style={styles.playersContainer}>
                        <MaterialCommunityIcons
                          name="account-multiple"
                          size={16}
                          color={
                            game.status === "available" ? game.color : "#666"
                          }
                        />
                        <Text
                          style={[
                            styles.playersText,
                            {
                              color:
                                game.status === "available"
                                  ? game.color
                                  : "#666",
                            },
                          ]}
                        >
                          {game.players}
                        </Text>
                      </View>

                      {game.status === "available" && (
                        <View style={styles.playButtonContainer}>
                          <MaterialCommunityIcons
                            name="play"
                            size={16}
                            color={game.color}
                          />
                          <Text
                            style={[styles.playText, { color: game.color }]}
                          >
                            Play Now
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>

          {/* Instructions */}
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsTitle}>
              How to Play Multiplayer
            </Text>
            <View style={styles.instructionItem}>
              <MaterialCommunityIcons
                name="numeric-1-circle"
                size={24}
                color="#2acde6"
              />
              <Text style={styles.instructionText}>
                Choose a game and create or join a room
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <MaterialCommunityIcons
                name="numeric-2-circle"
                size={24}
                color="#2acde6"
              />
              <Text style={styles.instructionText}>
                Select your team and wait for other players
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <MaterialCommunityIcons
                name="numeric-3-circle"
                size={24}
                color="#2acde6"
              />
              <Text style={styles.instructionText}>
                Compete, collaborate, and have fun learning!
              </Text>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  gradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  titleContainer: {
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#ffffff",
    marginTop: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: "center",
  },
  gamesContainer: {
    paddingHorizontal: 20,
    gap: 16,
  },
  gameCard: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  gameCardDisabled: {
    opacity: 0.6,
  },
  gameCardGradient: {
    padding: 20,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  gameIconContainer: {
    position: "relative",
    marginRight: 16,
  },
  gameIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  comingSoonBadge: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#ef4444",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  comingSoonText: {
    color: "#4a7c59",
    fontSize: 10,
    fontWeight: "bold",
  },
  gameInfo: {
    flex: 1,
  },
  gameTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#4a7c59",
    marginBottom: 4,
  },
  gameSubtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  gameDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  disabledText: {
    color: "#666",
  },
  gameMetaContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  playersContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  playersText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  playButtonContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  playText: {
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 4,
  },
  instructionsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 30,
    marginTop: 20,
  },
  instructionsTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#4a7c59",
    marginBottom: 20,
    textAlign: "center",
  },
  instructionItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  instructionText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginLeft: 12,
    flex: 1,
  },
});
