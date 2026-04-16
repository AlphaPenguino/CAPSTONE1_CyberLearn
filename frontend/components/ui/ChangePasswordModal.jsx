import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import COLORS from "../../constants/custom-colors";
import { useAuthStore } from "../../store/authStore";

const evaluatePassword = (password = "") => {
  const checks = {
    minLength: password.length >= 8,
    hasLower: /[a-z]/.test(password),
    hasUpper: /[A-Z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
  };

  const hasNumberOrSpecial = checks.hasNumber || checks.hasSpecial;

  let score = 0;
  if (checks.minLength) score += 1;
  if (checks.hasLower) score += 1;
  if (checks.hasUpper) score += 1;
  if (checks.hasNumber) score += 1;
  if (checks.hasSpecial) score += 1;
  if (password.length >= 12) score += 1;

  let level = "Too weak";
  let color = COLORS.error;

  if (score >= 6) {
    level = "Very strong";
    color = COLORS.success;
  } else if (score >= 4) {
    level = "Strong";
    color = COLORS.primary;
  } else if (score >= 3) {
    level = "Weak";
    color = COLORS.warning;
  }

  return {
    checks,
    hasNumberOrSpecial,
    level,
    color,
    isPolicySatisfied:
      checks.minLength && checks.hasLower && checks.hasUpper && hasNumberOrSpecial,
  };
};

export default function ChangePasswordModal({ visible, onClose }) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [hasTouchedNewPassword, setHasTouchedNewPassword] = useState(false);
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { user, changePassword, isLoading } = useAuthStore();
  const passwordEvaluation = evaluatePassword(newPassword);

  const reset = () => {
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setHasTouchedNewPassword(false);
    setShowOld(false);
    setShowNew(false);
    setShowConfirm(false);
  };

  useEffect(() => {
    if (!visible) {
      reset();
    }
  }, [visible]);

  const handleClose = () => {
    reset();
    onClose?.();
  };

  const handleSubmit = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      return showMsg("All fields are required");
    }
    if (!user?.email) {
      return showMsg("No account email found. Please log in again.");
    }
    if (!passwordEvaluation.isPolicySatisfied) {
      return showMsg(
        "Password requirements not satisfied: minimum 8 characters, at least one lowercase letter, at least one uppercase letter, and at least one number or special character."
      );
    }
    if (newPassword !== confirmPassword) {
      return showMsg("New passwords do not match");
    }

    const res = await changePassword({
      email: user.email,
      oldPassword,
      newPassword,
    });
    if (!res.success) {
      return showMsg(res.error || "Failed to change password");
    }
    showMsg("Password updated successfully");
    reset();
    onClose?.();
  };

  const showMsg = (msg) => {
    if (Platform.OS === "web") alert(msg);
    else Alert.alert("Change Password", msg);
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.overlay}
      >
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Change Password</Text>
            <TouchableOpacity onPress={handleClose} accessibilityLabel="Close">
              <Ionicons name="close" size={22} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 8 }}>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Old Password</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={COLORS.primary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter old password"
                  placeholderTextColor={COLORS.placeholderText}
                  value={oldPassword}
                  onChangeText={setOldPassword}
                  secureTextEntry={!showOld}
                  autoCapitalize="none"
                />
                <Ionicons
                  name={showOld ? "eye-outline" : "eye-off-outline"}
                  size={20}
                  color={COLORS.primary}
                  onPress={() => setShowOld(!showOld)}
                  style={styles.inputIcon}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>New Password</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="key-outline"
                  size={20}
                  color={COLORS.primary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter new password"
                  placeholderTextColor={COLORS.placeholderText}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  onFocus={() => setHasTouchedNewPassword(true)}
                  secureTextEntry={!showNew}
                  autoCapitalize="none"
                />
                <Ionicons
                  name={showNew ? "eye-outline" : "eye-off-outline"}
                  size={20}
                  color={COLORS.primary}
                  onPress={() => setShowNew(!showNew)}
                  style={styles.inputIcon}
                />
              </View>

              {hasTouchedNewPassword && newPassword.length > 0 && (
                <View style={styles.strengthContainer}>
                  <Text style={styles.requirementsTitle}>Password Strength</Text>
                  <Text style={[styles.strengthText, { color: passwordEvaluation.color }]}>
                    {passwordEvaluation.level}
                  </Text>

                  <View style={styles.requirementsList}>
                    <View style={styles.requirementRow}>
                      <Ionicons
                        name={passwordEvaluation.checks.minLength ? "checkmark-circle" : "close-circle"}
                        size={14}
                        color={passwordEvaluation.checks.minLength ? COLORS.success : COLORS.error}
                      />
                      <Text style={styles.requirementText}>At least 8 characters</Text>
                    </View>
                    <View style={styles.requirementRow}>
                      <Ionicons
                        name={passwordEvaluation.checks.hasLower ? "checkmark-circle" : "close-circle"}
                        size={14}
                        color={passwordEvaluation.checks.hasLower ? COLORS.success : COLORS.error}
                      />
                      <Text style={styles.requirementText}>At least one lowercase letter</Text>
                    </View>
                    <View style={styles.requirementRow}>
                      <Ionicons
                        name={passwordEvaluation.checks.hasUpper ? "checkmark-circle" : "close-circle"}
                        size={14}
                        color={passwordEvaluation.checks.hasUpper ? COLORS.success : COLORS.error}
                      />
                      <Text style={styles.requirementText}>At least one uppercase letter</Text>
                    </View>
                    <View style={styles.requirementRow}>
                      <Ionicons
                        name={passwordEvaluation.checks.hasNumber ? "checkmark-circle" : "close-circle"}
                        size={14}
                        color={passwordEvaluation.checks.hasNumber ? COLORS.success : COLORS.error}
                      />
                      <Text style={styles.requirementText}>At least one number</Text>
                    </View>
                    <View style={styles.requirementRow}>
                      <Ionicons
                        name={passwordEvaluation.checks.hasSpecial ? "checkmark-circle" : "close-circle"}
                        size={14}
                        color={passwordEvaluation.checks.hasSpecial ? COLORS.success : COLORS.error}
                      />
                      <Text style={styles.requirementText}>At least one special character</Text>
                    </View>
                    <Text style={styles.requirementHint}>
                      Requirement: include at least one number OR one special character.
                    </Text>
                  </View>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Re-enter New Password</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="repeat-outline"
                  size={20}
                  color={COLORS.primary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Re-enter new password"
                  placeholderTextColor={COLORS.placeholderText}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirm}
                  autoCapitalize="none"
                />
                <Ionicons
                  name={showConfirm ? "eye-outline" : "eye-off-outline"}
                  size={20}
                  color={COLORS.primary}
                  onPress={() => setShowConfirm(!showConfirm)}
                  style={styles.inputIcon}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.button, isLoading && { opacity: 0.6 }]}
              disabled={isLoading}
              onPress={handleSubmit}
            >
              <Text style={styles.buttonText}>Update Password</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  card: {
    width: "100%",
    maxWidth: 500,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  inputGroup: { marginTop: 12 },
  label: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.inputBackground,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, height: 44, color: COLORS.textPrimary },
  strengthContainer: {
    marginTop: 10,
    paddingHorizontal: 2,
  },
  requirementsTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
  strengthText: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: "700",
  },
  requirementsList: {
    marginTop: 6,
    gap: 4,
  },
  requirementRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  requirementText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  requirementHint: {
    marginTop: 2,
    fontSize: 11,
    color: COLORS.textSecondary,
    opacity: 0.9,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
  buttonText: { color: COLORS.white, fontWeight: "600" },
});
