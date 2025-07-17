import { StyleSheet, Platform, Dimensions } from 'react-native';
import COLORS from '@/constants/custom-colors';

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  // Main container styles
  scrollView: {
    flex: 1,
    width: '100%',
    ...(Platform.OS === 'web' && {
      overflowY: 'auto',
      height: '85vh',
    }),
  },
  formContainer: {
    padding: 16,
    marginTop: 16,
  },
  card: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginVertical: 16,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.white,
    marginBottom: 8,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  
  // Input styles
  input: {
    backgroundColor: COLORS.inputBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  optionInput: {
    flex: 1,
    marginRight: 10,
    backgroundColor: COLORS.inputBackground,
    borderRadius: 12,
  },
  codeInput: {
    marginBottom: 15,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    backgroundColor: COLORS.inputBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  codeBlockInput: {
    flex: 1,
    marginRight: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    backgroundColor: COLORS.inputBackground,
    borderRadius: 12,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    color: COLORS.textPrimary,
    fontWeight: "500",
  },
  
  // Image picker styles
  imagePicker: {
    width: "100%",
    height: 200,
    backgroundColor: COLORS.inputBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderContainer: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  previewImage: {
    width: "100%",
    height: "100%",
    resizeMode: 'cover',
  },
  
  // Button styles
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
  },
  buttonIcon: {
    marginRight: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  addButtonText: {
    color: COLORS.primary,
    marginLeft: 8,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
  },
  cancelButtonText: {
    color: COLORS.textSecondary,
  },
  saveButton: {
    flex: 1,
    padding: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 8,
  },
  saveButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  
  // Layout helpers
  row: {
    flexDirection: 'row', 
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  
  // Dropdown styles
  selectContainer: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    marginBottom: 15,
    backgroundColor: COLORS.inputBackground,
    overflow: 'hidden',
  },
  webSelect: {
    width: '100%',
    height: 50,
    color: COLORS.text,
    backgroundColor: 'transparent',
    border: 'none',
    paddingHorizontal: 12,
    fontSize: 16,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
    marginBottom: 15,
    backgroundColor: COLORS.inputBackground,
  },
  dropdownButtonText: {
    color: COLORS.textPrimary,
    fontSize: 16,
  },
  
  // Modal styles
modalOverlay: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: 'rgba(0,0,0,0.5)',
  // Add these properties for better focus handling
  ...(Platform.OS === 'web' && {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000
  }),
},
  modalView: {
    width: width * 0.8,
    maxHeight: '70%',
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: COLORS.primary,
    textAlign: 'center',
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  selectedModalItem: {
    backgroundColor: 'rgba(25, 118, 210, 0.1)',
  },
  modalItemText: {
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  closeButton: {
    marginTop: 20,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  
  // Question builder styles
  questionsContainer: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: COLORS.primary,
  },
  questionItem: {
    backgroundColor: 'rgba(25, 118, 210, 0.05)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  questionType: {
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  questionText: {
    color: COLORS.textPrimary,
  },
  addQuestionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    borderStyle: 'dashed',
    justifyContent: 'center',
    marginTop: 16,
  },
  addQuestionText: {
    color: COLORS.primary,
    marginLeft: 10,
    fontSize: 16,
  },
  questionForm: {
    backgroundColor: COLORS.inputBackground,
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  questionTypeForm: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  questionFormActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  
  // Helper text
  helperText: {
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginBottom: 10,
    fontSize: 14,
  },
  
  // Option items
  optionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  optionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  
  // Code blocks
  codeBlockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  codeBlockOrder: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  codeBlockOrderText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
});

// Add these styles to your form styles
const editingStyles = StyleSheet.create({
  disabledInput: {
    backgroundColor: '#f5f5f5',
    opacity: 0.7,
  },
  
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  
  questionCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  
  deleteQuestionButton: {
    backgroundColor: '#ff4444',
    borderRadius: 6,
    padding: 8,
  },
});

export default { ...styles, ...editingStyles };