import { StyleSheet, Platform } from "react-native";
import COLORS from "../../constants/custom-colors";


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginVertical: 16,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  startContainer: {
    flex: 1,
    padding: 20,
  },
  quizHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  quizTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginVertical: 16,
  },
  quizDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  quizInfo: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    fontWeight: '500',
  },
  startButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  startButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  quizProgressHeader: {
    backgroundColor: '#ffffff',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  questionCounter: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  timer: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  questionContainer: {
    flex: 1,
    padding: 20,
  },
  questionText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    lineHeight: 28,
    marginBottom: 24,
  },
  optionsContainer: {
    flex: 1,
  },
  optionButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  selectedOption: {
    borderColor: COLORS.primary,
    backgroundColor: '#e3f2fd',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  selectedOptionText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  navButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  navButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  submitButton: {
    borderRadius: 8,
    overflow: 'hidden',
    minWidth: 140,
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  completionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  completionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  completionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 16,
    textAlign: 'center',
  },
  scoreText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 8,
  },
  passingScoreText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  backToModuleButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  backToModuleButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  fillInBlanksContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
  },
  fillInBlanksHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  fillInBlanksInput: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
  },
  codeEditorContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
  },
  codeEditorHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  codeInput: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    fontSize: 16,
    color: '#333',
    minHeight: 100,
    maxHeight: 200,
    marginBottom: 12,
  },

  codeBlock: {
    backgroundColor: '#f1f8e9',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#c8e6c9',
    fontSize: 16,
    color: '#2e7d32',
    marginBottom: 12,
    //re-added
    overflow: 'hidden',
  },

  dragHandle: {
    width: 24,
    height: 24,
    backgroundColor: '#e0e0e0',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 12,
    right: 12,
  },
  draggedBlock: {
    opacity: 0.7,
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  dropZone: {
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    padding: 12,
    borderWidth: 2,
    borderColor: '#c8e6c9',
    minHeight: 50,
    marginBottom: 12,
  },
  dropZoneText: {
    fontSize: 16,
    color: '#2e7d32',
    textAlign: 'center',
  },
  questionScrollContainer: {
    flex: 1,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  questionTypeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  questionTypeText: {
    fontSize: 14,
    color: COLORS.primary,
    marginLeft: 8,
    fontWeight: '600',
  },
  questionPoints: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  
  // Multiple Choice Styles
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedRadio: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  
  // Fill in Blanks Styles
  fillBlanksContainer: {
    flex: 1,
  },
  questionTextContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  questionPart: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  questionPartText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  blankInput: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
    minWidth: 100,
    marginHorizontal: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  blanksHelpContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
  },
  blanksHelpTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  blanksHelpText: {
    fontSize: 12,
    color: '#666',
  },
  
  // Code Styles
  codeContainer: {
    flex: 1,
  },
  codeTemplateContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  codeTemplateTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  codeTemplateScroll: {
    maxHeight: 120,
  },
  codeTemplateText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#333',
    lineHeight: 18,
  },
  expectedOutputContainer: {
    backgroundColor: '#e8f5e8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  expectedOutputTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2e7d32',
    marginBottom: 4,
  },
  expectedOutputText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#2e7d32',
  },
  codeInputContainer: {
    flex: 1,
  },
  codeInputTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },

  implementationInput: {
    minHeight: 200,
  },
  codeInstructionsContainer: {
    backgroundColor: '#fff3e0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  codeInstructionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e65100',
    marginBottom: 4,
  },
  codeInstructionsText: {
    fontSize: 12,
    color: '#e65100',
  },
  
  // Code Ordering Styles
  codeOrderingContainer: {
    flex: 1,
  },
  codeOrderingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  codeBlocksList: {
    flex: 1,
    maxHeight: 400,
  },
  codeBlockWrapper: {
    marginBottom: 12,
  },

  codeBlockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  codeBlockPosition: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  codeBlockControls: {
    flexDirection: 'row',
    gap: 4,
  },
  moveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 4,
    padding: 4,
    minWidth: 32,
    alignItems: 'center',
  },
  disabledMoveButton: {
    backgroundColor: '#ccc',
  },
  codeBlockScroll: {
    maxHeight: 80,
  },
  codeBlockText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#333',
    padding: 12,
    lineHeight: 18,
  },
  orderingHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    padding: 8,
  },
  orderingHintText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },

    // ✅ Updated Completion Screen Styles
  scoreContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  scoreBreakdown: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginVertical: 20,
    paddingVertical: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#333',
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '500',
  },
  performanceMessageContainer: {
    width: '100%',
    marginVertical: 16,
  },
  successMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e8',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  successMessageText: {
    fontSize: 14,
    color: '#2e7d32',
    marginLeft: 8,
    flex: 1,
    fontWeight: '500',
  },
  failMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3e0',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  failMessageText: {
    fontSize: 14,
    color: '#e65100',
    marginLeft: 8,
    flex: 1,
    fontWeight: '500',
  },
  completionActions: {
    flexDirection: 'column',
    width: '100%',
    gap: 12,
    marginTop: 16,
  },
  retryQuizButton: {
    backgroundColor: '#FF9800',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  retryQuizButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Add these to your existing styles
  codeOrderingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  shuffleButton: {
    backgroundColor: '#FF9800',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  shuffleButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
});

//code ordering styles

const dragDropStyles = {
  codeOrderingContainer: {
    marginVertical: 16,
    flex: 1,
  },
  codeOrderingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  codeOrderingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 12,
  },
  shuffleButton: {
    backgroundColor: '#FF9800',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  shuffleButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  dragListContainer: {
    maxHeight: 400,
    minHeight: 200,
  },
  gestureContainer: {
    flex: 1,
  },
  flatListContent: {
    paddingBottom: 8,
  },
  codeBlockWrapper: {
    marginBottom: 12,
  },
  activeCodeBlock: {
    transform: [{ scale: 1.02 }],
  },
  codeBlock: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  draggingCodeBlock: {
    backgroundColor: '#ffffff',
    borderColor: COLORS.primary,
    borderWidth: 2,
    elevation: 8,
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  codeBlockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#343a40',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  positionBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  codeBlockPosition: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  dragIndicator: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeBlockControls: {
    flexDirection: 'row',
    gap: 6,
  },
  moveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moveUpButton: {
    backgroundColor: '#28a745',
  },
  moveDownButton: {
    backgroundColor: '#17a2b8',
  },
  disabledMoveButton: {
    backgroundColor: '#6c757d',
    opacity: 0.5,
  },
  codeBlockContent: {
    padding: 12,
    backgroundColor: '#ffffff',
  },
  codeBlockText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    color: '#212529',
    lineHeight: 18,
  },
  orderingHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    padding: 12,
    backgroundColor: '#e7f3ff',
    borderRadius: 8,
    gap: 8,
  },
  orderingHintText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },

  //gamification
    attackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d32f2f',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  attackButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
    marginRight: 8,
  },
};

// Export the combined styles
export default StyleSheet.create({
  // ... your existing styles
  ...styles,
  ...dragDropStyles,
});