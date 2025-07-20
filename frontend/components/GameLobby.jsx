"use client"

import { useState } from "react"
import { ScrollView, View, Text, TouchableOpacity, Alert, TextInput, StyleSheet } from "react-native"

export default function GameLobby({ socket, gameData, playerData, isCreator, creatorPlayerName, onGameStart }) {
  const [playerName, setPlayerName] = useState("")
  const [gameId, setGameId] = useState("")
  const [teamName, setTeamName] = useState("")
  const [isJoined, setIsJoined] = useState(false)

  const createGame = () => {
    if (!playerName.trim()) {
      Alert.alert("Error", "Please enter your name")
      return
    }
    socket.emit("create-game", { playerName })
  }

  const joinGame = () => {
    if (!playerName.trim() || !teamName.trim() || !gameId.trim()) {
      Alert.alert("Error", "Please fill in all fields")
      return
    }
    socket.emit("join-game", { gameId: gameId.toUpperCase(), playerName, teamName })
    setIsJoined(true)
  }

  const joinTeamAsCreator = (selectedTeamName) => {
    if (!creatorPlayerName.trim() || !selectedTeamName.trim()) {
      Alert.alert("Error", "Please select a team")
      return
    }
    socket.emit("join-game", {
      gameId: gameData.id,
      playerName: creatorPlayerName,
      teamName: selectedTeamName,
    })
    setIsJoined(true)
  }

  const startGame = () => {
    if (gameData && gameData.id) {
      socket.emit("start-game", { gameId: gameData.id })
    }
  }

  const getTeamColors = (index) => {
    const colors = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b"]
    return colors[index % colors.length]
  }

  if (gameData && gameData.status === "active") {
    onGameStart()
    return null
  }

  // Show team selection for creator who hasn't joined yet
  if (gameData && isCreator && !playerData) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Knowledge Race: Relay Mode</Text>
          <Text style={styles.subtitle}>Choose your team to play!</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.gameInfo}>
            <Text style={styles.gameId}>Game ID: {gameData.id}</Text>
            <Text style={styles.creatorInfo}>You created this game as: {creatorPlayerName}</Text>
          </View>

          <Text style={styles.sectionTitle}>Join a Team to Play</Text>

          {gameData.teams.length > 0 ? (
            <>
              <Text style={styles.instructionText}>Select an existing team:</Text>
              {gameData.teams.map((team, index) => (
                <TouchableOpacity
                  key={team.name}
                  style={[styles.teamSelectButton, { borderColor: getTeamColors(index) }]}
                  onPress={() => joinTeamAsCreator(team.name)}
                >
                  <Text style={[styles.teamSelectText, { color: getTeamColors(index) }]}>
                    Join {team.name} ({team.members.length}/5 members)
                  </Text>
                </TouchableOpacity>
              ))}
              <Text style={styles.orText}>OR</Text>
            </>
          ) : null}

          <Text style={styles.instructionText}>Create a new team:</Text>
          <TextInput
            style={styles.input}
            placeholder="New Team Name"
            value={teamName}
            onChangeText={setTeamName}
            maxLength={15}
          />
          <TouchableOpacity style={styles.createTeamButton} onPress={() => joinTeamAsCreator(teamName)}>
            <Text style={styles.buttonText}>Create & Join Team</Text>
          </TouchableOpacity>

          <View style={styles.creatorNoteContainer}>
            <Text style={styles.creatorNoteText}>
              💡 As the creator, you can start the game once you join a team and there are at least 2 teams with
              players.
            </Text>
          </View>
        </View>
      </ScrollView>
    )
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Knowledge Race: Relay Mode</Text>
        <Text style={styles.subtitle}>Team up and pass the baton!</Text>
      </View>

      {!gameData ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Join or Create Game</Text>

          <TextInput
            style={styles.input}
            placeholder="Enter Nickname"
            value={playerName}
            onChangeText={setPlayerName}
            maxLength={20}
          />

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.createButton} onPress={createGame}>
              <Text style={styles.buttonText}>Create Game</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.orText}>OR</Text>

          <TextInput
            style={styles.input}
            placeholder="Game ID"
            value={gameId}
            onChangeText={setGameId}
            maxLength={6}
            autoCapitalize="characters"
          />

          <TextInput
            style={styles.input}
            placeholder="Team Name"
            value={teamName}
            onChangeText={setTeamName}
            maxLength={15}
          />

          <TouchableOpacity style={styles.joinButton} onPress={joinGame}>
            <Text style={styles.buttonText}>Join Game</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.section}>
          <View style={styles.gameInfo}>
            <Text style={styles.gameId}>Game ID: {gameData.id}</Text>
            <Text style={styles.gameStatus}>Status: {gameData.status}</Text>
            <Text style={styles.creatorInfo}>
              Created by: {gameData.creator?.name || "Unknown"}
              {isCreator && " (You)"}
            </Text>
          </View>

          <Text style={styles.sectionTitle}>Teams ({gameData.teams.length}/4)</Text>

          {gameData.teams.map((team, index) => (
            <View key={team.name} style={[styles.teamCard, { borderLeftColor: getTeamColors(index) }]}>
              <Text style={[styles.teamName, { color: getTeamColors(index) }]}>{team.name}</Text>
              <Text style={styles.teamInfo}>
                Members: {team.members.length}/5 | Help: {team.helpUsed}/{team.maxHelp}
              </Text>
              <View style={styles.membersList}>
                {team.members.map((member) => (
                  <View key={member.id} style={styles.memberItem}>
                    <Text style={[styles.memberName, member.isActive && styles.activeMember]}>
                      {member.name}
                      {member.id === gameData.creator?.id && " 👑"}
                      {member.isActive ? " (Active)" : ""}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))}

          <View style={styles.gameRules}>
            <Text style={styles.rulesTitle}>Game Rules:</Text>
            <Text style={styles.ruleText}>• Teams race to complete 5 questions</Text>
            <Text style={styles.ruleText}>• Each member must answer at least 1 question</Text>
            <Text style={styles.ruleText}>• 2 help requests per team allowed</Text>
            <Text style={styles.ruleText}>• First team to finish wins!</Text>
            {isCreator && <Text style={styles.creatorNote}>💡 As the creator, only you can start the game</Text>}
          </View>

          {gameData.teams.length >= 2 && isCreator && playerData && (
            <TouchableOpacity style={styles.startButton} onPress={startGame}>
              <Text style={styles.buttonText}>Start Game</Text>
            </TouchableOpacity>
          )}

          {gameData.teams.length >= 2 && !isCreator && (
            <View style={styles.waitingMessage}>
              <Text style={styles.waitingText}>Waiting for {gameData.creator?.name} to start the game...</Text>
            </View>
          )}

          {gameData.teams.length < 2 && (
            <View style={styles.waitingMessage}>
              <Text style={styles.waitingText}>Need at least 2 teams to start the game</Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    backgroundColor: "#2563eb",
    padding: 20,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: "#bfdbfe",
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#1f2937",
  },
  input: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 20,
  },
  createButton: {
    backgroundColor: "#10b981",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  joinButton: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  startButton: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  orText: {
    textAlign: "center",
    fontSize: 16,
    color: "#6b7280",
    marginVertical: 15,
  },
  gameInfo: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  gameId: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
  },
  gameStatus: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 5,
  },
  creatorInfo: {
    fontSize: 14,
    color: "#059669",
    marginTop: 5,
    fontWeight: "bold",
  },
  teamCard: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  teamName: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  teamInfo: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 10,
  },
  membersList: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  memberItem: {
    marginRight: 10,
    marginBottom: 5,
  },
  memberName: {
    fontSize: 14,
    color: "#374151",
  },
  activeMember: {
    fontWeight: "bold",
    color: "#059669",
  },
  gameRules: {
    backgroundColor: "#fef3c7",
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
  },
  rulesTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#92400e",
    marginBottom: 10,
  },
  ruleText: {
    fontSize: 14,
    color: "#92400e",
    marginBottom: 5,
  },
  creatorNote: {
    fontSize: 12,
    color: "#059669",
    marginTop: 10,
    fontStyle: "italic",
  },
  waitingMessage: {
    backgroundColor: "#fef3c7",
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    alignItems: "center",
  },
  waitingText: {
    fontSize: 16,
    color: "#92400e",
    textAlign: "center",
  },
  teamSelectButton: {
    backgroundColor: "#f9fafb",
    borderWidth: 2,
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    alignItems: "center",
  },
  teamSelectText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  createTeamButton: {
    backgroundColor: "#10b981",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 20,
  },
  instructionText: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 10,
  },
  creatorNoteContainer: {
    backgroundColor: "#eff6ff",
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#3b82f6",
  },
  creatorNoteText: {
    fontSize: 12,
    color: "#1d4ed8",
    lineHeight: 18,
  },
})
