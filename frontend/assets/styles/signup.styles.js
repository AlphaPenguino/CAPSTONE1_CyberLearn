// styles/signup.styles.js
import { StyleSheet, Dimensions } from "react-native";
import COLORS from "../../constants/custom-colors";

const { width } = Dimensions.get("window");
const maxWidth = 500; // Maximum width for larger screens

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: COLORS.background,
    padding: 20,
    justifyContent: "center",
    alignItems: "center", // Center contents horizontally
  },
  card: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    padding: 24,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: COLORS.border,
    marginTop: -24,
    width: "100%", // Take full width of container
    maxWidth: maxWidth, // But limit to maxWidth
    alignSelf: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  formContainer: { marginBottom: 16 },
  inputGroup: { marginBottom: 20 },
  label: {
    fontSize: 14,
    marginBottom: 8,
    color: COLORS.textPrimary,
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
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    height: 48,
    color: COLORS.textDark,
  },
  eyeIcon: { padding: 8 },
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
});

export default styles;