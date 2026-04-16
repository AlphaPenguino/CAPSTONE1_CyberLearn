// styles/login.styles.js
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
    padding: 24,
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
    fontFamily: Platform.select({
      ios: "System",
      android: "sans-serif",
      default: "sans-serif",
    }),
    fontWeight: "800",
    fontSize: 38,
    color: "#F8FAFC",
    textAlign: "center",
    letterSpacing: 0.4,
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
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 20,
    padding: 26,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
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
    color: COLORS.textDark,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.inputBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 48,
    color: COLORS.textDark,
    fontSize: 15,
    fontWeight: "600",
    // Remove focus outline / highlight especially on web
    ...Platform.select({
      web: {
        outlineWidth: 0,
        outlineStyle: "none",
      },
    }),
  },
  eyeIcon: {
    padding: 8,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
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
    fontWeight: "700",
    textDecorationLine: "underline",
  },
});

export default styles;
