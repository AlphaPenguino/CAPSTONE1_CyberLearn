import express from "express"
import cors from "cors"
import "dotenv/config"
import { createServer } from "http"
import { Server } from "socket.io"
import job from "./lib/cron.js"

// API routes
import authRoutes from "./routes/authRoutes.js"
import quizRoutes from "./routes/quizRoutes.js"
import moduleRoutes from "./routes/moduleRoutes.js"
import progressRoutes from "./routes/progressRoutes.js"
import { connectDB } from "./lib/db.js"

const app = express()
const PORT = process.env.PORT || 3000

// Create HTTP server and Socket.IO instance
const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
})

job.start()

app.use(express.json({ limit: "50mb" }))
app.use(express.urlencoded({ extended: true, limit: "50mb" }))
app.use(cors())

// Existing API routes
app.use("/api/auth", authRoutes)
app.use("/api/quiz", quizRoutes)
app.use("/api/modules", moduleRoutes)
app.use("/api/progress", progressRoutes)

// Game state for Socket.IO
const games = new Map()
const players = new Map()

// Sample questions for the relay race
const sampleQuestions = [
  {
    id: 1,
    question: "What is 15 + 27?",
    options: ["42", "41", "43", "40"],
    correct: 0,
    difficulty: "easy",
  },
  {
    id: 2,
    question: "What is the capital of Japan?",
    options: ["Seoul", "Tokyo", "Beijing", "Bangkok"],
    correct: 1,
    difficulty: "medium",
  },
  {
    id: 3,
    question: "What is 8 × 7?",
    options: ["54", "56", "58", "52"],
    correct: 1,
    difficulty: "easy",
  },
  {
    id: 4,
    question: "Which planet is closest to the Sun?",
    options: ["Venus", "Earth", "Mercury", "Mars"],
    correct: 2,
    difficulty: "medium",
  },
  {
    id: 5,
    question: "What is 144 ÷ 12?",
    options: ["11", "12", "13", "14"],
    correct: 1,
    difficulty: "easy",
  },
]

class RelayGame {
  constructor(gameId, creatorId, creatorName) {
    this.id = gameId
    this.creator = {
      id: creatorId,
      name: creatorName,
    }
    this.teams = new Map()
    this.questions = [...sampleQuestions]
    this.currentQuestionIndex = 0
    this.status = "waiting" // waiting, active, finished
    this.maxTeams = 4
    this.questionsPerTeam = 5
  }

  // Add method to check if player is creator
  isCreator(playerId) {
    return this.creator.id === playerId
  }

  // Update getGameState method to include creator info
  getGameState() {
    return {
      id: this.id,
      creator: this.creator,
      status: this.status,
      teams: Array.from(this.teams.entries()).map(([name, team]) => ({
        name,
        members: team.members,
        currentPlayerIndex: team.currentPlayerIndex,
        questionsCompleted: team.questionsCompleted,
        helpUsed: team.helpUsed,
        maxHelp: team.maxHelp,
        isFinished: team.isFinished,
      })),
      totalQuestions: this.questionsPerTeam,
    }
  }

  addTeam(teamName) {
    if (this.teams.size >= this.maxTeams) {
      return { success: false, message: "Game is full" }
    }

    const team = {
      name: teamName,
      members: [],
      currentPlayerIndex: 0,
      questionsCompleted: 0,
      helpUsed: 0,
      maxHelp: 2,
      completedQuestions: [],
      isFinished: false,
    }

    this.teams.set(teamName, team)
    return { success: true, team }
  }

  addPlayerToTeam(playerId, playerName, teamName) {
    const team = this.teams.get(teamName)
    if (!team) {
      return { success: false, message: "Team not found" }
    }

    if (team.members.length >= 5) {
      return { success: false, message: "Team is full" }
    }

    const player = {
      id: playerId,
      name: playerName,
      teamName,
      questionsAnswered: 0,
      isActive: false,
    }

    team.members.push(player)

    // Set first player as active
    if (team.members.length === 1) {
      player.isActive = true
    }

    return { success: true, player }
  }

  getCurrentQuestion(teamName) {
    const team = this.teams.get(teamName)
    if (!team || team.questionsCompleted >= this.questionsPerTeam) {
      return null
    }

    return this.questions[team.questionsCompleted]
  }

  answerQuestion(teamName, playerId, answerIndex) {
    const team = this.teams.get(teamName)
    if (!team) {
      return { success: false, message: "Team not found" }
    }

    const currentPlayer = team.members[team.currentPlayerIndex]
    if (!currentPlayer || currentPlayer.id !== playerId) {
      return { success: false, message: "Not your turn" }
    }

    const question = this.getCurrentQuestion(teamName)
    if (!question) {
      return { success: false, message: "No more questions" }
    }

    const isCorrect = answerIndex === question.correct

    if (isCorrect) {
      // Correct answer - pass to next player
      currentPlayer.questionsAnswered++
      team.questionsCompleted++
      team.completedQuestions.push({
        questionId: question.id,
        playerId: currentPlayer.id,
        playerName: currentPlayer.name,
        correct: true,
      })

      // Move to next player
      currentPlayer.isActive = false
      team.currentPlayerIndex = (team.currentPlayerIndex + 1) % team.members.length

      if (team.currentPlayerIndex < team.members.length) {
        team.members[team.currentPlayerIndex].isActive = true
      }

      // Check if team finished
      if (team.questionsCompleted >= this.questionsPerTeam) {
        team.isFinished = true
        this.checkGameEnd()
      }

      return {
        success: true,
        correct: true,
        message: "Correct! Passing to next player.",
        nextPlayer: team.members[team.currentPlayerIndex]?.name,
        teamProgress: team.questionsCompleted,
        totalQuestions: this.questionsPerTeam,
      }
    } else {
      return {
        success: true,
        correct: false,
        message: "Incorrect answer. Try again or ask for help!",
        correctAnswer: question.options[question.correct],
      }
    }
  }

  requestHelp(teamName, playerId) {
    const team = this.teams.get(teamName)
    if (!team) {
      return { success: false, message: "Team not found" }
    }

    if (team.helpUsed >= team.maxHelp) {
      return { success: false, message: "No help remaining" }
    }

    const currentPlayer = team.members[team.currentPlayerIndex]
    if (!currentPlayer || currentPlayer.id !== playerId) {
      return { success: false, message: "Not your turn" }
    }

    team.helpUsed++
    return {
      success: true,
      helpRemaining: team.maxHelp - team.helpUsed,
      message: "Help request sent to team members!",
    }
  }

  checkGameEnd() {
    const finishedTeams = Array.from(this.teams.values()).filter((team) => team.isFinished)
    if (finishedTeams.length > 0) {
      this.status = "finished"
      return finishedTeams[0] // Winner
    }
    return null
  }
}

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("User connected:", socket.id)

  socket.on("create-game", (data) => {
    const { playerName } = data
    const gameId = Math.random().toString(36).substring(2, 8).toUpperCase()
    const game = new RelayGame(gameId, socket.id, playerName)
    games.set(gameId, game)

    // Don't store creator in players map yet - they need to join a team first
    socket.emit("game-created", {
      gameId,
      game: game.getGameState(),
      isCreator: true,
      playerName, // Send back the player name so they can join a team
    })
  })

  socket.on("join-game", (data) => {
    const { gameId, playerName, teamName } = data
    const game = games.get(gameId)

    if (!game) {
      socket.emit("error", { message: "Game not found" })
      return
    }

    // Add team if it doesn't exist
    if (!game.teams.has(teamName)) {
      const teamResult = game.addTeam(teamName)
      if (!teamResult.success) {
        socket.emit("error", { message: teamResult.message })
        return
      }
    }

    // Add player to team
    const result = game.addPlayerToTeam(socket.id, playerName, teamName)
    if (!result.success) {
      socket.emit("error", { message: result.message })
      return
    }

    const isCreator = game.isCreator(socket.id)
    players.set(socket.id, { gameId, playerName, teamName, isCreator })
    socket.join(gameId)
    socket.join(`${gameId}-${teamName}`)

    io.to(gameId).emit("game-updated", game.getGameState())
    socket.emit("joined-game", {
      player: result.player,
      game: game.getGameState(),
      isCreator,
    })
  })

  socket.on("start-game", (data) => {
    const { gameId } = data
    const game = games.get(gameId)
    const player = players.get(socket.id)

    if (!game) {
      socket.emit("error", { message: "Game not found" })
      return
    }

    // Only creator can start the game
    if (!game.isCreator(socket.id)) {
      socket.emit("error", { message: "Only the game creator can start the game" })
      return
    }

    game.status = "active"
    io.to(gameId).emit("game-started", game.getGameState())

    // Send first question to each team
    game.teams.forEach((team, teamName) => {
      const question = game.getCurrentQuestion(teamName)
      if (question) {
        io.to(`${gameId}-${teamName}`).emit("new-question", {
          question,
          currentPlayer: team.members[team.currentPlayerIndex],
        })
      }
    })
  })

  socket.on("answer-question", (data) => {
    const { gameId, answerIndex } = data
    const player = players.get(socket.id)

    if (!player || player.gameId !== gameId) {
      socket.emit("error", { message: "Invalid game session" })
      return
    }

    const game = games.get(gameId)
    if (!game) {
      socket.emit("error", { message: "Game not found" })
      return
    }

    const result = game.answerQuestion(player.teamName, socket.id, answerIndex)

    if (result.success) {
      io.to(`${gameId}-${player.teamName}`).emit("answer-result", result)
      io.to(gameId).emit("game-updated", game.getGameState())

      if (result.correct && !game.teams.get(player.teamName).isFinished) {
        // Send next question
        const nextQuestion = game.getCurrentQuestion(player.teamName)
        if (nextQuestion) {
          io.to(`${gameId}-${player.teamName}`).emit("new-question", {
            question: nextQuestion,
            currentPlayer: game.teams.get(player.teamName).members[game.teams.get(player.teamName).currentPlayerIndex],
          })
        }
      }

      // Check for game end
      if (game.status === "finished") {
        const winner = Array.from(game.teams.values()).find((team) => team.isFinished)
        io.to(gameId).emit("game-finished", {
          winner: winner.name,
          finalState: game.getGameState(),
        })
      }
    } else {
      socket.emit("error", { message: result.message })
    }
  })

  socket.on("request-help", (data) => {
    const { gameId } = data
    const player = players.get(socket.id)

    if (!player || player.gameId !== gameId) {
      socket.emit("error", { message: "Invalid game session" })
      return
    }

    const game = games.get(gameId)
    if (!game) {
      socket.emit("error", { message: "Game not found" })
      return
    }

    const result = game.requestHelp(player.teamName, socket.id)

    if (result.success) {
      io.to(`${gameId}-${player.teamName}`).emit("help-requested", {
        requester: player.playerName,
        helpRemaining: result.helpRemaining,
        currentQuestion: game.getCurrentQuestion(player.teamName),
      })
    } else {
      socket.emit("error", { message: result.message })
    }
  })

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id)
    players.delete(socket.id)
  })
})

// Use server.listen instead of app.listen to support Socket.IO
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
  connectDB()
})
