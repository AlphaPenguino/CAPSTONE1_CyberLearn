import { StyleSheet, Dimensions, Platform } from 'react-native';
import RPG_COLORS from '@/constants/rpg-theme-colors';

const { width, height } = Dimensions.get('window');

export default StyleSheet.create({
  // Main containers
  container: {
    flex: 1,
    backgroundColor: RPG_COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: RPG_COLORS.background,
  },
  loadingText: {
    color: RPG_COLORS.text,
    marginTop: 16,
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: RPG_COLORS.background,
    padding: 20,
  },
  errorText: {
    color: RPG_COLORS.error,
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  
  // RPG-styled Quiz Header
  quizProgressHeader: {
    padding: 16,
    backgroundColor: RPG_COLORS.backgroundLight,
    borderBottomWidth: 2,
    borderBottomColor: RPG_COLORS.border,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  questionCounter: {
    color: RPG_COLORS.text,
    fontWeight: 'bold',
    fontSize: 16,
  },
  timer: {
    color: RPG_COLORS.gold,
    fontWeight: 'bold',
    fontSize: 16,
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: '#0D1B2A',
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: RPG_COLORS.primaryLight,
  },
  progressBar: {
    height: '100%',
    backgroundColor: RPG_COLORS.expBar,
  },
  
  // RPG Status Bars
  rpgStatusBars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 25,
  },
  characterStatus: {
    flex: 1,
    marginHorizontal: 8,
  },
  statusName: {
    color: RPG_COLORS.text,
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  statusBars: {
    gap: 6,
  },
  barContainer: {
    height: 18,
    backgroundColor: '#0D1B2A',
    borderRadius: 9,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: RPG_COLORS.primaryLight,
    position: 'relative',
    marginBottom: 4,
  },
  barFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  healthBarFill: {
    backgroundColor: RPG_COLORS.healthBar,
  },
  enemyHealthBarFill: {
    backgroundColor: RPG_COLORS.enemyHealth,
  },
  manaBarFill: {
    backgroundColor: RPG_COLORS.manaBar,
  },
  barText: {
    color: '#FFFFFF',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: 'bold',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    lineHeight: 18,
  },
  questProgress: {
    marginTop: 8,
  },
  questText: {
    color: RPG_COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  
  // RPG Battle Area
  rpgBattleArea: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end', // Align to bottom
    alignItems: 'center',
    paddingVertical: 16,
  },
  battleCharactersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between', // Space evenly
    alignItems: 'flex-end',
    width: '100%',
    paddingHorizontal: Platform.OS === 'web' ? 40 : 15, // Less padding on mobile
  },
  rpgSpriteWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    // Scale down on mobile
    transform: [{ scale: Platform.OS === 'web' ? 1 : 0.7 }],
  },
  rpgShadow: {
    position: 'absolute',
    bottom: 5,
    width: 80,
    height: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 40,
  },
  characterName: {
    color: RPG_COLORS.text,
    fontWeight: 'bold',
    marginTop: 8,
    fontSize: 14,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  
  // Question Container
  questionContainer: {
    flex: 1,
    margin: 12,
    backgroundColor: 'rgba(18, 44, 68, 0.9)', // Semi-transparent background
    borderRadius: 12,
    borderWidth: 3,
    borderColor: RPG_COLORS.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 10,
  },
  rpgDialogHeader: {
    backgroundColor: RPG_COLORS.primaryDark,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: RPG_COLORS.primaryLight,
  },
  rpgDialogTitle: {
    color: RPG_COLORS.text,
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  questionScrollContainer: {
    padding: 16,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: RPG_COLORS.primaryLight,
    paddingBottom: 8,
  },
  questionTypeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: RPG_COLORS.primaryDark,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: RPG_COLORS.primaryLight,
  },
  questionTypeText: {
    color: RPG_COLORS.text,
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 6,
  },
  questionPoints: {
    color: RPG_COLORS.gold,
    fontWeight: 'bold',
    fontSize: 14,
    backgroundColor: RPG_COLORS.primaryDark,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: RPG_COLORS.gold,
    overflow: 'hidden',
  },
  questionText: {
    color: RPG_COLORS.text,
    fontSize: 18,
    marginBottom: 20,
    lineHeight: 26,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0.5, height: 0.5 },
    textShadowRadius: 1,
  },
  
  // Navigation Container
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: RPG_COLORS.backgroundLight,
    borderTopWidth: 2,
    borderTopColor: RPG_COLORS.primaryLight,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: RPG_COLORS.primary,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: RPG_COLORS.primaryLight,
    minWidth: 120,
  },
  navButtonText: {
    color: RPG_COLORS.text,
    fontWeight: 'bold',
    fontSize: 16,
    marginHorizontal: 6,
  },
  disabledButton: {
    backgroundColor: RPG_COLORS.disabledBg,
    borderColor: RPG_COLORS.disabled,
    opacity: 0.7,
  },
  submitButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: RPG_COLORS.success,
    borderRadius: 8,
    minWidth: 150,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 8,
  },
  
  // Multiple choice options
  optionsContainer: {
    marginTop: 8,
  },
  optionButton: {
    backgroundColor: RPG_COLORS.backgroundLight,
    borderWidth: 2,
    borderColor: RPG_COLORS.primaryLight,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: RPG_COLORS.primaryLight,
    backgroundColor: RPG_COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  selectedRadio: {
    backgroundColor: RPG_COLORS.primary,
    borderColor: RPG_COLORS.primaryLight,
  },
  optionText: {
    color: RPG_COLORS.text,
    fontSize: 16,
    flex: 1,
  },
  selectedOption: {
    backgroundColor: RPG_COLORS.primary,
    borderColor: RPG_COLORS.primaryLight,
  },
  selectedOptionText: {
    color: RPG_COLORS.text,
    fontWeight: 'bold',
  },

  // Fill in the blanks
  fillBlanksContainer: {
    marginTop: 8,
  },
  questionTextContainer: {
    marginBottom: 16,
  },
  questionPart: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  questionPartText: {
    color: RPG_COLORS.text,
    fontSize: 16,
  },
  blankInput: {
    backgroundColor: RPG_COLORS.backgroundLight,
    borderWidth: 1,
    borderColor: RPG_COLORS.primaryLight,
    color: RPG_COLORS.text,
    borderRadius: 4,
    padding: 8,
    minWidth: 120,
    marginHorizontal: 4,
  },
  blanksHelpContainer: {
    backgroundColor: RPG_COLORS.panelBg,
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: RPG_COLORS.primaryLight,
  },
  blanksHelpTitle: {
    color: RPG_COLORS.text,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  blanksHelpText: {
    color: RPG_COLORS.textSecondary,
    fontSize: 14,
  },

  // Code sections
  codeContainer: {
    marginTop: 16,
  },
  codeTemplateContainer: {
    marginBottom: 16,
  },
  codeTemplateTitle: {
    color: RPG_COLORS.text,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  codeTemplateScroll: {
    backgroundColor: RPG_COLORS.background,
    borderRadius: 4,
    padding: 8,
    maxHeight: 150,
  },
  codeTemplateText: {
    color: RPG_COLORS.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 14,
  },
  codeInputContainer: {
    marginTop: 16,
  },
  codeInputTitle: {
    color: RPG_COLORS.text,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  codeInput: {
    backgroundColor: RPG_COLORS.background,
    color: RPG_COLORS.text,
    padding: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: RPG_COLORS.primaryLight,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 14,
    textAlignVertical: 'top',
  },
  implementationInput: {
    minHeight: 200,
  },

  // Quiz completion
  completionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: RPG_COLORS.background,
    padding: 20,
  },
  completionCard: {
    backgroundColor: RPG_COLORS.backgroundLight,
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: RPG_COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  completionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: RPG_COLORS.text,
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  scoreText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: RPG_COLORS.gold,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  scoreBreakdown: {
    color: RPG_COLORS.textSecondary,
    fontSize: 16,
    marginTop: 8,
  },
  
  // Miscellaneous
  retryButton: {
    backgroundColor: RPG_COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
    borderWidth: 2,
    borderColor: RPG_COLORS.primaryLight,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },

  // Start screen
  startContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: RPG_COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: height * 0.8,
  },
  quizHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  quizTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: RPG_COLORS.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  quizDescription: {
    fontSize: 16,
    color: RPG_COLORS.textSecondary,
    textAlign: 'center',
  },
  quizInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 40,
    flexWrap: 'wrap',
  },
  infoItem: {
    alignItems: 'center',
    backgroundColor: RPG_COLORS.backgroundLight,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 100,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: RPG_COLORS.primaryLight,
  },
  infoText: {
    color: RPG_COLORS.text,
    marginTop: 6,
    fontWeight: '600',
  },
  startButton: {
    borderRadius: 8,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 300,
  },
  startButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 18,
    marginRight: 12,
  },
  battlefieldBackground: {
    flex: 1,
    width: '100%',
    maxHeight: Platform.OS === 'web' ? 300 : 220, // Smaller height on mobile
  },
});