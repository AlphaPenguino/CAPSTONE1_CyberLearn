import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';

export default function GameResults({ gameData, onPlayAgain }) {
  const getTeamColors = (index) => {
    const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b'];
    return colors[index % colors.length];
  };

  const sortedTeams = gameData?.teams
    ? [...gameData.teams].sort((a, b) => b.questionsCompleted - a.questionsCompleted)
    : [];

  const winner = sortedTeams[0];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Game Complete!</Text>
        {winner && (
          <Text style={styles.winnerText}>🏆 {winner.name} Wins!</Text>
        )}
      </View>

      <View style={styles.resultsSection}>
        <Text style={styles.sectionTitle}>Final Results</Text>
        
        {sortedTeams.map((team, index) => (
          <View key={team.name} style={[
            styles.teamResult,
            { borderLeftColor: getTeamColors(gameData.teams.findIndex(t => t.name === team.name)) },
            index === 0 && styles.winnerTeam
          ]}>
            <View style={styles.teamHeader}>
              <Text style={[
                styles.teamName,
                { color: getTeamColors(gameData.teams.findIndex(t => t.name === team.name)) }
              ]}>
                #{index + 1} {team.name}
                {index === 0 && ' 👑'}
              </Text>
              <Text style={styles.teamScore}>
                {team.questionsCompleted}/{gameData.totalQuestions} completed
              </Text>
            </View>
            
            <View style={styles.teamStats}>
              <Text style={styles.statText}>Help used: {team.helpUsed}/{team.maxHelp}</Text>
              <Text style={styles.statText}>Members: {team.members.length}</Text>
            </View>

            <View style={styles.membersList}>
              <Text style={styles.membersTitle}>Team Members:</Text>
              {team.members.map((member) => (
                <View key={member.id} style={styles.memberResult}>
                  <Text style={styles.memberName}>{member.name}</Text>
                  <Text style={styles.memberContribution}>
                    {member.questionsAnswered} questions answered
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>

      <View style={styles.gameStats}>
        <Text style={styles.sectionTitle}>Game Statistics</Text>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Total Teams:</Text>
          <Text style={styles.statValue}>{gameData?.teams.length || 0}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Questions per Team:</Text>
          <Text style={styles.statValue}>{gameData?.totalQuestions || 0}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Game Mode:</Text>
          <Text style={styles.statValue}>Relay Race</Text>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.playAgainButton} onPress={onPlayAgain}>
          <Text style={styles.buttonText}>Play Again</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Great teamwork! Each member contributed to the victory.
        </Text>
      </View>
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
    padding: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  winnerText: {
    fontSize: 20,
    color: '#fbbf24',
    fontWeight: 'bold',
  },
  resultsSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1f2937',
  },
  teamResult: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    borderLeftWidth: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  winnerTeam: {
    borderWidth: 2,
    borderColor: '#fbbf24',
    backgroundColor: '#fffbeb',
  },
  teamHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  teamName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  teamScore: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669',
  },
  teamStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statText: {
    fontSize: 14,
    color: '#6b7280',
  },
  membersList: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 15,
  },
  membersTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 10,
  },
  memberResult: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  memberName: {
    fontSize: 14,
    color: '#374151',
  },
  memberContribution: {
    fontSize: 12,
    color: '#6b7280',
  },
  gameStats: {
    padding: 20,
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  statLabel: {
    fontSize: 16,
    color: '#374151',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  actionButtons: {
    padding: 20,
    alignItems: 'center',
  },
  playAgainButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    minWidth: 200,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});