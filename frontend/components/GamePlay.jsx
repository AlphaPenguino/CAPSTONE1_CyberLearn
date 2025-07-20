import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';

export default function GamePlay({ socket, gameData, playerData, currentQuestion }) {
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isMyTurn, setIsMyTurn] = useState(false);

  useEffect(() => {
    if (gameData && playerData) {
      const myTeam = gameData.teams.find(team => team.name === playerData.teamName);
      if (myTeam) {
        const currentPlayer = myTeam.members[myTeam.currentPlayerIndex];
        setIsMyTurn(currentPlayer && currentPlayer.id === playerData.id);
      }
    }
  }, [gameData, playerData]);

  useEffect(() => {
    if (currentQuestion && isMyTurn) {
      setTimeLeft(30);
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [currentQuestion, isMyTurn]);

  const submitAnswer = () => {
    if (selectedAnswer === null) {
      Alert.alert('Error', 'Please select an answer');
      return;
    }

    socket.emit('answer-question', {
      gameId: gameData.id,
      answerIndex: selectedAnswer
    });

    setSelectedAnswer(null);
  };

  const requestHelp = () => {
    socket.emit('request-help', { gameId: gameData.id });
  };

  const getTeamColors = (index) => {
    const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b'];
    return colors[index % colors.length];
  };

  const myTeam = gameData?.teams.find(team => team.name === playerData?.teamName);
  const currentPlayer = myTeam?.members[myTeam.currentPlayerIndex];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Knowledge Race</Text>
        <Text style={styles.gameId}>Game: {gameData?.id}</Text>
      </View>

      {/* Team Progress */}
      <View style={styles.progressSection}>
        <Text style={styles.sectionTitle}>Team Progress</Text>
        {gameData?.teams.map((team, index) => (
          <View key={team.name} style={[styles.teamProgress, { borderLeftColor: getTeamColors(index) }]}>
            <Text style={[styles.teamName, { color: getTeamColors(index) }]}>
              {team.name}
            </Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    width: `${(team.questionsCompleted / gameData.totalQuestions) * 100}%`,
                    backgroundColor: getTeamColors(index)
                  }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {team.questionsCompleted}/{gameData.totalQuestions} | Help: {team.helpUsed}/{team.maxHelp}
            </Text>
          </View>
        ))}
      </View>

      {/* Current Turn Info */}
      <View style={styles.turnSection}>
        <Text style={styles.sectionTitle}>Current Turn</Text>
        <View style={styles.turnInfo}>
          <Text style={styles.turnText}>
            {isMyTurn ? "It's your turn!" : `${currentPlayer?.name || 'Unknown'} is answering`}
          </Text>
          {isMyTurn && (
            <Text style={styles.timerText}>Time left: {timeLeft}s</Text>
          )}
        </View>
      </View>

      {/* Question */}
      {currentQuestion && (
        <View style={styles.questionSection}>
          <Text style={styles.questionTitle}>Question {myTeam?.questionsCompleted + 1}</Text>
          <Text style={styles.questionText}>{currentQuestion.question}</Text>
          
          <View style={styles.optionsContainer}>
            {currentQuestion.options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.optionButton,
                  selectedAnswer === index && styles.selectedOption,
                  !isMyTurn && styles.disabledOption
                ]}
                onPress={() => isMyTurn && setSelectedAnswer(index)}
                disabled={!isMyTurn}
              >
                <Text style={[
                  styles.optionText,
                  selectedAnswer === index && styles.selectedOptionText,
                  !isMyTurn && styles.disabledOptionText
                ]}>
                  {String.fromCharCode(65 + index)}. {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {isMyTurn && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.submitButton, selectedAnswer === null && styles.disabledButton]}
                onPress={submitAnswer}
                disabled={selectedAnswer === null}
              >
                <Text style={styles.buttonText}>Submit Answer</Text>
              </TouchableOpacity>

              {myTeam && myTeam.helpUsed < myTeam.maxHelp && (
                <TouchableOpacity style={styles.helpButton} onPress={requestHelp}>
                  <Text style={styles.buttonText}>
                    Ask for Help ({myTeam.maxHelp - myTeam.helpUsed} left)
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}

      {/* Team Members */}
      {myTeam && (
        <View style={styles.teamSection}>
          <Text style={styles.sectionTitle}>Your Team: {myTeam.name}</Text>
          {myTeam.members.map((member, index) => (
            <View key={member.id} style={[
              styles.memberItem,
              member.isActive && styles.activeMemberItem
            ]}>
              <Text style={[
                styles.memberName,
                member.isActive && styles.activeMemberName
              ]}>
                {member.name} {member.id === playerData?.id ? '(You)' : ''}
              </Text>
              <Text style={styles.memberStats}>
                Questions answered: {member.questionsAnswered}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#2563eb',
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  gameId: {
    fontSize: 14,
    color: '#bfdbfe',
    marginTop: 5,
  },
  progressSection: {
    padding: 20,
    backgroundColor: 'white',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#1f2937',
  },
  teamProgress: {
    marginBottom: 15,
    borderLeftWidth: 4,
    paddingLeft: 10,
  },
  teamName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    marginBottom: 5,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#6b7280',
  },
  turnSection: {
    padding: 20,
    backgroundColor: 'white',
    marginBottom: 10,
  },
  turnInfo: {
    alignItems: 'center',
  },
  turnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  timerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ef4444',
    marginTop: 5,
  },
  questionSection: {
    padding: 20,
    backgroundColor: 'white',
    marginBottom: 10,
  },
  questionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6b7280',
    marginBottom: 10,
  },
  questionText: {
    fontSize: 18,
    color: '#1f2937',
    marginBottom: 20,
    lineHeight: 24,
  },
  optionsContainer: {
    marginBottom: 20,
  },
  optionButton: {
    backgroundColor: '#f9fafb',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  selectedOption: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  disabledOption: {
    opacity: 0.5,
  },
  optionText: {
    fontSize: 16,
    color: '#374151',
  },
  selectedOptionText: {
    color: '#1d4ed8',
    fontWeight: 'bold',
  },
  disabledOptionText: {
    color: '#9ca3af',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  submitButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
  },
  helpButton: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  teamSection: {
    padding: 20,
    backgroundColor: 'white',
  },
  memberItem: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#f9fafb',
  },
  activeMemberItem: {
    backgroundColor: '#dcfce7',
    borderWidth: 2,
    borderColor: '#16a34a',
  },
  memberName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
  },
  activeMemberName: {
    color: '#15803d',
  },
  memberStats: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
});