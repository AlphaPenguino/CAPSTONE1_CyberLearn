import { StyleSheet, Dimensions, Platform } from "react-native";
import COLORS from "../../constants/custom-colors";

const { width } = Dimensions.get("window");
const maxWidth = 500; // Maximum width for larger screens

const styles = StyleSheet.create({
backgroundImage: {
    flex: 1,
    width: "100%",
    height: "100%",
    alignSelf: "center",
  },
  backgroundImageAsset: {
    width: "100%",
    height: "100%",
    left: 0,
    top: 0,
  },
  backgroundOverlay: {
    flex: 1,
    backgroundColor: "rgba(5, 14, 24, 0.38)",
  },
container: {
    flexGrow: 1,
    backgroundColor: "transparent",
    padding: 20,
    justifyContent: "center",
    alignItems: "center", // Center contents horizontally
  },
  scrollViewStyle: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topIllustration: {
    alignItems: "center",
    width: "100%",
  },
  brandContainer: {
    width: "100%",
    alignItems: "center",
    marginBottom: 8,
  },
  brandTitle: {
    // Switched to generic bold sans-serif system font
    fontFamily: Platform.select({
      ios: "System",
      android: "sans-serif",
      default: "sans-serif",
    }),
    fontWeight: "700",
    fontSize: 36,
    color: "#F8FAFC",
    textAlign: "center",
    letterSpacing: 1,
    textShadowColor: "rgba(0, 0, 0, 0.45)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  illustrationImage: {
    width: width * 0.75, // 75% of screen width
    height: width * 0.75, // Makes it square
    maxWidth: 300, // Add this to limit desktop size
    maxHeight: 300, // Add this to limit desktop size
    alignSelf: "center", // Ensure center alignment
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 16,
    padding: 24,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: "rgba(203, 213, 225, 0.8)",
    marginTop: -24,
    width: "100%", // Take full width of container
    maxWidth: maxWidth, // But limit to maxWidth
    alignSelf: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 8,
    textAlign: "center",
    width: "100%",
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  formContainer: {
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    // Updated to lighter blue per request (was COLORS.textPrimary)
    color: COLORS.lightBlue,
    fontWeight: "500",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.inputBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 48,
    color: COLORS.textPrimary,
  },
  eyeIcon: {
    padding: 8,
  },
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
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  authActionButton: {
    width: "100%",
    minHeight: 52,
    height: "auto",
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  authOutlineButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: COLORS.primary,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  authOutlineButtonText: {
    color: COLORS.primary,
  },
  authActionIcon: {
    marginRight: 8,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  footerText: {
    color: COLORS.textSecondary,
    marginRight: 5,
  },
  link: {
    color: COLORS.primary,
    fontWeight: "600",
  },

  //added forgot password styles
  forgotPassword: {
    alignSelf: "flex-end",
    marginTop: 8,
    marginRight: 20,
  },
  forgotPasswordText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "500",
    textDecorationLine: "underline",
  },
headerContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 20,
},
backButton: {
  padding: 8,
  marginRight: 8,
},
formTitle: {
  fontSize: 24,
  fontWeight: 'bold',
  color: COLORS.primary,
},
instructionText: {
  fontSize: 14,
  color: COLORS.textSecondary,
  marginBottom: 24,
  textAlign: 'center',
},
successContainer: {
  alignItems: 'center',
  padding: 16,
},
successIcon: {
  marginBottom: 16,
},
successTitle: {
  fontSize: 20,
  fontWeight: 'bold',
  color: COLORS.primary,
  marginBottom: 12,
},
successText: {
  fontSize: 14,
  color: COLORS.textSecondary,
  textAlign: 'center',
  marginBottom: 24,
},
networkErrorContainer: {
  backgroundColor: '#FFEEEE',
  borderRadius: 8,
  padding: 12,
  marginBottom: 16,
  flexDirection: 'row',
  alignItems: 'flex-start',
},
networkErrorText: {
  color: COLORS.error,
  fontSize: 14,
  marginLeft: 8,
  flex: 1,
},

})

export default styles;
