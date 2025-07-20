import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import io from 'socket.io-client';
import GameLobby from '../../components/GameLobby';
import GamePlay from '../../components/GamePlay';
import GameResults from '../../components/GameResults';

const SOCKET_URL = 'http://localhost:3000'; // Change to your server URL

export default function App() {
  const [socket, setSocket] = useState(null);
  const [gameState, setGameState] = useState('lobby'); // lobby, playing, results
  const [gameData, setGameData] = useState(null);
  const [playerData, setPlayerData] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);

  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to server');
    });

    newSocket.on('game-created', (data) => {
      setGameData(data.game);
    });

    newSocket.on('joined-game', (data) => {
      setPlayerData(data.player);
      setGameData(data.game);
    });

    newSocket.on('game-updated', (data) => {
      setGameData(data);
    });

    newSocket.on('game-started', (data) => {
      setGameData(data);
      setGameState('playing');
    });

    newSocket.on('new-question', (data) => {
      setCurrentQuestion(data.question);
    });

    newSocket.on('answer-result', (data) => {
      console.log('Answer result:', data);
    });

    newSocket.on('game-finished', (data) => {
      setGameState('results');
      setGameData(data.finalState);
    });

    newSocket.on('error', (data) => {
      console.error('Socket error:', data.message);
      alert(data.message);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const renderCurrentScreen = () => {
    switch (gameState) {
      case 'lobby':
        return (
          <GameLobby
            socket={socket}
            gameData={gameData}
            playerData={playerData}
            onGameStart={() => setGameState('playing')}
          />
        );
      case 'playing':
        return (
          <GamePlay
            socket={socket}
            gameData={gameData}
            playerData={playerData}
            currentQuestion={currentQuestion}
          />
        );
      case 'results':
        return (
          <GameResults
            gameData={gameData}
            onPlayAgain={() => {
              setGameState('lobby');
              setGameData(null);
              setPlayerData(null);
              setCurrentQuestion(null);
            }}
          />
        );
      default:
        return <GameLobby socket={socket} />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2563eb" />
      {renderCurrentScreen()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
});