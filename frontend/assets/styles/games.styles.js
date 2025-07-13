import { StyleSheet } from "react-native";
import COLORS from "../../constants/custom-colors";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  battleContainer: {
    flex: 1,
    backgroundColor: '#e0e5f0', // Slightly different for battle scenes
  },
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderBottomWidth: 1,
    borderBottomColor: '#d0d0d0',
  },
  // Battle scene styles
  battleScene: {
    flex: 0.4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(240,242,245,0.5)',
  },
  enemyArea: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '45%',
  },
  playerArea: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 160, // Adjust based on your sprite dimensions
    height: 160,
  },
  enemyName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 8,
  },
  playerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2',
    marginTop: 8,
  },
  enemyImage: {
    width: 120,
    height: 120,
  },
  playerImage: {
    width: 100,
    height: 120,
  },
  enemyAttacking: {
    tintColor: '#ff6659',
  },
  enemyHurt: {
    opacity: 0.7,
  },
  enemyDefeated: {
    opacity: 0.5,
    transform: [{ rotate: '90deg' }],
  },
  playerAttacking: {
    tintColor: '#64b5f6',
  },
  playerHurt: {
    opacity: 0.7,
  },
  playerVictory: {
    tintColor: '#81c784',
  },
  // Dialogue box styles
  dialogueBox: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 10,
    padding: 16,
    margin: 16,
    marginTop: 0,
  },
  dialogueText: {
    color: 'white',
    fontSize: 16,
    lineHeight: 24,
  },
  dialogueTapArea: {
    alignItems: 'center',
    marginTop: 12,
  },
  dialogueTapText: {
    color: '#64b5f6',
    fontSize: 14,
  },
  // Game elements
  livesContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'white',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d0d0d0',
  },
  timerText: {
    fontWeight: 'bold',
    color: '#333',
  },
  scoreContainer: {
    backgroundColor: '#1976d2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  scoreText: {
    color: 'white',
    fontWeight: 'bold',
  },
  levelContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  levelText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  questionCounter: {
    color: '#666',
    marginTop: 4,
  },
  questionContainer: {
    backgroundColor: 'white',
    margin: 16,
    marginTop: 8,
    padding: 20,
    paddingTop: 30,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d0d0d0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 6,
    position: 'relative',
  },
  questionBadge: {
    position: 'absolute',
    top: -15,
    left: 20,
    backgroundColor: '#1976d2',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 4,
  },
  questionBadgeText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 3,
    marginBottom: 16,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#1976d2',
    borderRadius: 3,
  },
  questionCategory: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1976d2',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  questionText: {
    fontSize: 18,
    color: '#333',
    lineHeight: 26,
    fontWeight: '500',
  },
  optionsContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  optionButton: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d0d0d0',
  },
  correctOption: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderColor: '#4CAF50',
  },
  incorrectOption: {
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
    borderColor: '#F44336',
  },
  optionText: {
    color: '#333',
  },
  correctOptionText: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  incorrectOptionText: {
    color: '#C62828',
    fontWeight: 'bold',
  },
  feedbackContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d0d0d0',
  },
  feedbackText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  correctFeedback: {
    color: '#2E7D32',
  },
  incorrectFeedback: {
    color: '#C62828',
  },
  explanationText: {
    color: '#666',
    textAlign: 'center',
  },
  // Start, game over and win screens
  startScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#e0e5f0',
  },
  gameTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1976d2',
    textAlign: 'center',
    marginBottom: 24,
  },
  characterImage: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
    marginBottom: 24,
  },
  instructions: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 32,
    lineHeight: 22,
  },
  startButton: {
    backgroundColor: '#1976d2',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
  },
  startButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  gameOverScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#ffebee',
  },
  gameOverText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#C62828',
    marginBottom: 16,
  },
  defeatImage: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
    marginBottom: 16,
  },
  finalScore: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  defeatMessage: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    marginBottom: 32,
  },
  restartButton: {
    backgroundColor: '#1976d2',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
  },
  restartButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  winScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#e8f5e9',
  },
  winText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 16,
  },
  victoryImage: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
    marginBottom: 16,
  },
  victoryMessage: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    marginBottom: 32,
  },
  nextLevelButton: {
    backgroundColor: '#1976d2',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
  },
  nextLevelButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // New enemy speech bubble styles
  enemySpeechBubble: {
    position: 'absolute',
    top: -60,
    right: 0,
    left: -20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 12,
    padding: 12,
    zIndex: 10,
    maxWidth: 180,
  },
  enemySpeechText: {
    color: 'white',
    fontSize: 14,
    lineHeight: 18,
    textAlign: 'center',
  },
  speechBubbleArrow: {
    position: 'absolute',
    bottom: -10,
    right: 30,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 15,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'rgba(0, 0, 0, 0.8)',
  },
  
});


export default styles;