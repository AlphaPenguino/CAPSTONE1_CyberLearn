"use client"

import { useState, useEffect } from "react"
import { io } from "socket.io-client"
import GameLobby from "../../components/GameLobby"
import GamePlay from "../../components/GamePlay"
import GameResults from "../../components/GameResults"

const SOCKET_URL = "http://localhost:3000"

export default function App() {
  const [socket, setSocket] = useState(null)
  const [gameState, setGameState] = useState("lobby") // lobby, playing, results
  const [gameData, setGameData] = useState(null)
  const [playerData, setPlayerData] = useState(null)
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [isCreator, setIsCreator] = useState(false)
  const [creatorPlayerName, setCreatorPlayerName] = useState("")

  useEffect(() => {
    const newSocket = io(SOCKET_URL)
    setSocket(newSocket)

    newSocket.on("connect", () => {
      console.log("Connected to server")
    })

    newSocket.on("game-created", (data) => {
      setGameData(data.game)
      setIsCreator(data.isCreator || false)
      setCreatorPlayerName(data.playerName || "")
    })

    newSocket.on("joined-game", (data) => {
      setPlayerData(data.player)
      setGameData(data.game)
      setIsCreator(data.isCreator || false)
    })

    newSocket.on("game-updated", (data) => {
      setGameData(data)
    })

    newSocket.on("game-started", (data) => {
      setGameData(data)
      setGameState("playing")
    })

    newSocket.on("new-question", (data) => {
      setCurrentQuestion(data.question)
    })

    newSocket.on("answer-result", (data) => {
      console.log("Answer result:", data)
    })

    newSocket.on("game-finished", (data) => {
      setGameState("results")
      setGameData(data.finalState)
    })

    newSocket.on("error", (data) => {
      console.error("Socket error:", data.message)
      alert(data.message)
    })

    return () => {
      newSocket.close()
    }
  }, [])

  const renderCurrentScreen = () => {
    switch (gameState) {
      case "lobby":
        return (
          <GameLobby
            socket={socket}
            gameData={gameData}
            playerData={playerData}
            isCreator={isCreator}
            creatorPlayerName={creatorPlayerName}
            onGameStart={() => setGameState("playing")}
          />
        )
      case "playing":
        return (
          <GamePlay socket={socket} gameData={gameData} playerData={playerData} currentQuestion={currentQuestion} />
        )
      case "results":
        return (
          <GameResults
            gameData={gameData}
            onPlayAgain={() => {
              setGameState("lobby")
              setGameData(null)
              setPlayerData(null)
              setCurrentQuestion(null)
              setIsCreator(false)
              setCreatorPlayerName("")
            }}
          />
        )
      default:
        return <GameLobby socket={socket} />
    }
  }

  return (
    <div className="app-container">
      <div className="app-content">{renderCurrentScreen()}</div>
    </div>
  )
}
