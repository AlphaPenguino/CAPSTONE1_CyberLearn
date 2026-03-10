import {
  Text,
  View,
  Image,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from "react-native";

import { useRouter, useLocalSearchParams } from "expo-router";
import styles from "../../assets/styles/forgot.styles.js";
import { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import COLORS from "../../constants/custom-colors.js";
// ✅ Import from constants — works for both localhost and production
import { API_URL } from "../../constants/api.js";

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState(true);
  const [tokenError, setTokenError] = useState("");

  const router = useRouter();
  const { token } = useLocalSearchParams();

  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      setTokenError(
        "No reset token found. The link may be invalid or has already been used."
      );
    }
  }, [token]);

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      const msg = "Please fill in all fields.";
      Platform.OS === "web" ? alert(msg) : Alert.alert("Input Required", msg);
      return;
    }

    if (newPassword !== confirmPassword) {
      const msg = "Passwords do not match.";
      Platform.OS === "web" ? alert(msg) : Alert.alert("Password Mismatch", msg);
      return;
    }

    if (newPassword.length < 8) {
      const msg = "Password must be at least 8 characters long.";
      Platform.OS === "web" ? alert(msg) : Alert.alert("Password Too Short", msg);
      return;
    }

    setIsLoading(true);

    try {
      console.log(`[ResetPassword] POST → ${API_URL}/auth/reset-password/confirm`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${API_URL}/auth/reset-password/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ token, newPassword }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server error: Received non-JSON response");
      }

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 400) {
          setTokenValid(false);
          setTokenError(
            data.message ||
              "This reset link is invalid or has expired. Please request a new one."
          );
          return;
        }
        throw new Error(data.message || "Failed to reset password");
      }

      setResetSuccess(true);
    } catch (error) {
      console.error("[ResetPassword] Error:", error);
      let errorMsg = "Something went wrong. Please try again.";

      if (error.name === "AbortError") {
        errorMsg = "Request timed out. Please check your connection.";
      } else if (
        error.message === "Network request failed" ||
        error.message?.includes("Failed to fetch")
      ) {
        errorMsg = "Unable to connect to the server. Check your internet connection.";
      } else {
        errorMsg = error.message || errorMsg;
      }

      Platform.OS === "web" ? alert(errorMsg) : Alert.alert("Error", errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Invalid / expired token screen ──────────────────────────────────────
  if (!tokenValid) {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <View style={styles.container}>
            <View style={styles.brandContainer}>
              <Text style={styles.brandTitle}>CyberLearn</Text>
            </View>
            <View style={styles.card}>
              <View style={styles.formContainer}>
                <View style={styles.successContainer}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={56}
                    color={COLORS.error || "#EF4444"}
                    style={styles.successIcon}
                  />
                  <Text style={[styles.successTitle, { color: COLORS.error || "#EF4444" }]}>
                    Link Expired or Invalid
                  </Text>
                  <Text style={styles.successText}>{tokenError}</Text>
                  <TouchableOpacity
                    style={[styles.button, { marginTop: 16 }]}
                    onPress={() => router.replace("/forgot-password")}
                  >
                    <Text style={styles.buttonText}>Request New Reset Link</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.button,
                      {
                        marginTop: 10,
                        backgroundColor: "transparent",
                        borderWidth: 1,
                        borderColor: COLORS.primary,
                        flexDirection: "row",
                        justifyContent: "center",
                        alignItems: "center",
                      },
                    ]}
                    onPress={() => router.replace("/")}
                  >
                    <Ionicons
                      name="arrow-back-outline"
                      size={18}
                      color={COLORS.primary}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.buttonText, { color: COLORS.primary }]}>
                      Return to Login
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={styles.container}>
          <View style={styles.brandContainer}>
            <Text style={styles.brandTitle}>CyberLearn</Text>
          </View>
          <View style={styles.topIllustration}>
            <Image
              source={require("../../assets/images/character1.png")}
              style={styles.illustrationImage}
              resizeMode="contain"
            />
          </View>

          <View style={styles.card}>
            <View style={styles.formContainer}>
              <View style={styles.headerContainer}>
                <Text style={styles.formTitle}>Reset Password</Text>
              </View>

              {!resetSuccess ? (
                <>
                  <Text style={styles.instructionText}>
                    Enter your new password below. Must be at least 8 characters.
                  </Text>

                  {/* New Password */}
                  <View style={styles.inputGroup}>
                    <View style={styles.inputContainer}>
                      <Ionicons
                        name="lock-closed-outline"
                        size={20}
                        color={COLORS.primary}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="New password"
                        placeholderTextColor={COLORS.primary}
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!isLoading}
                      />
                      <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
                      >
                        <Ionicons
                          name={showPassword ? "eye-outline" : "eye-off-outline"}
                          size={20}
                          color={COLORS.primary}
                          style={styles.inputIcon}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Confirm Password */}
                  <View style={styles.inputGroup}>
                    <View style={styles.inputContainer}>
                      <Ionicons
                        name="lock-closed-outline"
                        size={20}
                        color={COLORS.primary}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="Confirm new password"
                        placeholderTextColor={COLORS.primary}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry={!showConfirmPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!isLoading}
                      />
                      <TouchableOpacity
                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        <Ionicons
                          name={
                            showConfirmPassword ? "eye-outline" : "eye-off-outline"
                          }
                          size={20}
                          color={COLORS.primary}
                          style={styles.inputIcon}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Live match indicator */}
                  {confirmPassword.length > 0 && (
                    <Text
                      style={{
                        fontSize: 12,
                        marginBottom: 8,
                        marginLeft: 4,
                        color: newPassword === confirmPassword ? "#10B981" : "#EF4444",
                      }}
                    >
                      {newPassword === confirmPassword
                        ? "✓ Passwords match"
                        : "✗ Passwords do not match"}
                    </Text>
                  )}

                  <TouchableOpacity
                    style={[styles.button, isLoading && { opacity: 0.6 }]}
                    onPress={handleResetPassword}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator color={COLORS.white} />
                    ) : (
                      <Text style={styles.buttonText}>Reset Password</Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.successContainer}>
                  <Ionicons
                    name="checkmark-circle"
                    size={56}
                    color="#10B981"
                    style={styles.successIcon}
                  />
                  <Text style={styles.successTitle}>
                    Password Reset Successfully!
                  </Text>
                  <Text style={styles.successText}>
                    Your password has been updated. You can now log in with your
                    new password.
                  </Text>
                  <TouchableOpacity
                    style={[styles.button, { marginTop: 16 }]}
                    onPress={() => router.replace("/")}
                  >
                    <Text style={styles.buttonText}>Go to Login</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
