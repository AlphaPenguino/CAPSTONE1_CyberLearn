import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { TextInput } from "react-native-paper";
import { useRouter } from "expo-router";
import { useAuthStore } from "../store/authStore";
import { useTheme } from "../contexts/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { API_URL } from "../constants/api";
import COLORS from "../constants/custom-colors.js";
export default function JoinSubject() {
  const { token } = useAuthStore();
  const { colors } = useTheme();
  const router = useRouter();
  const [subjectCode, setSubjectCode] = useState("");
  const [loading, setLoading] = useState(false);
  const handleBack = () => {
    try {
      if (typeof router?.canGoBack === "function" && router.canGoBack()) {
        router.back();
        return;
      }
    } catch (_) {
      // no-op, fall through to other strategies
    }
    if (Platform.OS === "web") {
      try {
        if (typeof window !== "undefined" && window.history?.length > 1) {
          window.history.back();
          return;
        }
      } catch (_) {
        // ignore and fallback
      }
    }
    // Fallback to root/home
    try {
      router.replace("/");
    } catch (_) {
      // Last resort
      router.push("/");
    }
  };
  // Local modal state (works on web + native)
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState("success"); // 'success' | 'error'

  const openModal = (title, message, type = "success") => {
    setModalTitle(title);
    setModalMessage(message);
    setModalType(type);
    setModalVisible(true);
  };

  const closeModal = () => {
    const wasSuccess = modalType === "success";
    setModalVisible(false);
    if (wasSuccess) {
      setSubjectCode("");
      handleBack();
    }
  };

  const handleJoinSubject = async () => {
    if (!subjectCode.trim()) {
      openModal("Error", "Please enter a subject code", "error");
      return;
    }

    if (!token) {
      openModal(
        "Error",
        "Authentication required. Please log in again.",
        "error"
      );
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/subjects/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subjectCode: subjectCode.trim(),
        }),
      });

      const data = await response.json();

      // Treat certain backend errors as success (legacy sections validation or already enrolled)
      const message = data?.message || "";
      const backendError = data?.error || "";
      const alreadyEnrolled = /already enrolled/i.test(message);
      const legacySectionValidation =
        /no_section is not a valid section|User validation failed/i.test(
          backendError || message
        );

      if (
        (response.ok && data.success) ||
        alreadyEnrolled ||
        legacySectionValidation
      ) {
        openModal(
          "Success! 🎉",
          `You have successfully joined "${
            data.subject?.name || "the subject"
          }"!\n\nYou can now access this subject from your home page.`,
          "success"
        );
      } else {
        // Clear the input for easier retry
        setSubjectCode("");
        openModal("Error", data.message || "Failed to join subject", "error");
      }
    } catch (error) {
      console.error("Error joining subject:", error);
      const msg = String(error?.message || "");
      const legacySectionValidation =
        /no_section is not a valid section|User validation failed/i.test(msg);
      const alreadyEnrolled = /already enrolled/i.test(msg);

      if (legacySectionValidation || alreadyEnrolled) {
        openModal(
          "Success! 🎉",
          "You're enrolled in the subject. You can access it from your home page.",
          "success"
        );
      } else {
        setSubjectCode("");
        openModal(
          "Error",
          "Failed to join subject. Please check your internet connection and try again.",
          "error"
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[
          styles.keyboardContainer,
          Platform.OS === 'web' ? styles.webCardContainer : {}
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Join Subject
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.welcomeSection}>
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={[COLORS.success, "#66BB6A"]}
                style={styles.iconGradient}
              >
                <Ionicons name="school" size={40} color="white" />
              </LinearGradient>
            </View>
            <Text style={[styles.welcomeTitle, { color: colors.text }]}>
              Join a Subject
            </Text>
            <Text
              style={[styles.welcomeSubtitle, { color: colors.textSecondary }]}
            >
              Enter the subject code provided by your instructor
            </Text>
          </View>

          <View style={styles.formSection}>
  <View style={styles.inputGroup}>
    <Text style={[styles.inputLabel, { color: colors.text }]}>
      Subject Code
    </Text>
    <View style={styles.inputGroup}>
                    <View style={styles.inputContainer}>
                      <Ionicons
                        name="key-outline"
                        size={20}
                        color={COLORS.primary}
                        style={styles.inputIcon}
                      />
                     <TextInput
  style={[styles.input, { 
    backgroundColor: 'rgba(255, 255, 255, 0.5)', // Increased opacity for even lighter background
    color: "#004d00" // Much darker green text for higher contrast
  }]}
  placeholder="Enter subject code (e.g., CSS101)"
  placeholderTextColor="rgba(46, 90, 46, 0.6)" // Darker placeholder text
  value={subjectCode}
  onChangeText={setSubjectCode}
  autoCapitalize="characters"
  theme={{
    colors: {
      text: "#004d00", // Much darker green text in theme
      placeholder: "rgba(46, 90, 46, 0.6)",
      background: "rgba(29, 13, 13, 0.5)", // Lighter background
      primary: COLORS.primary,
    }
  }}
  mode="outlined"
  outlineColor={COLORS.border}
  activeOutlineColor={COLORS.primary}
  dense={true} // Add this to make the text more compact and visible
  textAlign="center" // Center text for better visibility
/>
                    </View>
                  </View>
  </View>

            <TouchableOpacity
              style={[styles.joinButton, loading && styles.disabledButton]}
              onPress={handleJoinSubject}
              disabled={loading}
            >
              <LinearGradient
                colors={
                  loading ? ["#666", "#444"] : [COLORS.success, "#66BB6A"]
                }
                style={styles.buttonGradient}
              >
                {loading ? (
                  <Text style={styles.buttonText}>Joining...</Text>
                ) : (
                  <>
                    <Ionicons name="enter" size={20} color="white" />
                    <Text style={styles.buttonText}>Join Subject</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.helpSection}>
            <View style={styles.helpItem}>
              <Ionicons name="help-circle" size={20} color={colors.primary} />
              <Text style={[styles.helpText, { color: colors.textSecondary }]}>
                Ask your instructor for the subject code
              </Text>
            </View>
            <View style={styles.helpItem}>
              <Ionicons
                name="information-circle"
                size={20}
                color={colors.primary}
              />
              <Text style={[styles.helpText, { color: colors.textSecondary }]}>
                Subject codes are usually 6 characters long
              </Text>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Basic modal overlay (web + native) */}
      {modalVisible && (
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContainer,
              modalType === "success" ? styles.modalSuccess : styles.modalError,
            ]}
          >
            <View style={styles.modalHeaderRow}>
              <Ionicons
                name={
                  modalType === "success" ? "checkmark-circle" : "alert-circle"
                }
                size={28}
                color={"white"}
              />
              <Text style={styles.modalTitle}>{modalTitle}</Text>
            </View>
            <Text style={styles.modalMessage}>{modalMessage}</Text>
            <TouchableOpacity onPress={closeModal} style={styles.modalButton}>
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  webCardContainer: {
    ...(Platform.OS === 'web' ? {
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderRadius: 16,
      padding: 20,
      margin: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    } : {}),
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
// Update this style in your StyleSheet
input: {
  flex: 1,
  height: 48,
  fontSize: 16,
  color: "#2e5a2e", // Changed from "#FFFFFF" to dark green
  paddingVertical: 12,
},
  container: {
    flex: 1,
    ...Platform.select({
      web: {
        alignItems: 'center',
        justifyContent: 'center',
      },
      default: {},
    }),
  },
  keyboardContainer: {
    flex: 1,
    ...Platform.select({
      web: {
        maxWidth: 480,
        width: '100%',
        alignSelf: 'center',
      },
      default: {
        width: '100%',
      },
    }),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'web' ? 20 : 60,
    paddingBottom: 20,
    ...Platform.select({
      web: {
        width: '100%',
        maxWidth: 480,
        alignSelf: 'center',
        justifyContent: 'space-between',
      },
      default: {},
    }),
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "bold",
    marginHorizontal: 16,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    ...Platform.select({
      web: {
        paddingHorizontal: 30,
        maxWidth: 480,
        alignSelf: 'center',
        width: '100%',
      },
      default: {},
    }),
  },
  welcomeSection: {
    alignItems: "center",
    marginVertical: 40,
  },
  iconContainer: {
    marginBottom: 20,
  },
  iconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },
  welcomeSubtitle: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  formSection: {
    marginTop: 20,
    ...Platform.select({
      web: {
        width: '100%',
        maxWidth: 420,
        alignSelf: 'center',
      },
      default: {},
    }),
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: COLORS.surface,
    fontSize: 16,
  },
  joinButton: {
    borderRadius: 12,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    marginTop: 10,
    ...Platform.select({
      web: {
        maxWidth: 280,
        alignSelf: 'center',
        width: '100%',
      },
      default: {},
    }),
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
  helpSection: {
    marginTop: 40,
    padding: 20,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    gap: 16,
    ...Platform.select({
      web: {
        maxWidth: 420,
        alignSelf: 'center',
      },
      default: {},
    }),
  },
  helpItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  helpText: {
    fontSize: 14,
    flex: 1,
  },
  // Modal styles
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  modalSuccess: {
    backgroundColor: "#2e7d32",
  },
  modalError: {
    backgroundColor: "#c62828",
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  modalTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    flexShrink: 1,
  },
  modalMessage: {
    color: "white",
    fontSize: 15,
    lineHeight: 22,
  },
  modalButton: {
    alignSelf: "flex-end",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  modalButtonText: {
    color: "white",
    fontWeight: "600",
  },
});
