import React, { useState } from "react";
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

export default function ChangePasswordModal({ visible, onClose }) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { user, changePassword, isLoading } = useAuthStore();

  const reset = () => {
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowOld(false);
    setShowNew(false);
    setShowConfirm(false);
  };

  const handleSubmit = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      return showMsg("All fields are required");
    }
    if (!user?.email) {
      return showMsg("No account email found. Please log in again.");
    }
    if (newPassword.length < 8) {
      return showMsg("New password must be at least 8 characters");
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
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.overlay}
      >
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Change Password</Text>
            <TouchableOpacity onPress={onClose} accessibilityLabel="Close">
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
