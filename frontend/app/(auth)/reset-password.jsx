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
import { API_URL } from "../../constants/api.js";

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

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [hasTouchedNewPassword, setHasTouchedNewPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState(true);
  const [tokenError, setTokenError] = useState("");
  const passwordEvaluation = evaluatePassword(newPassword);

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
    // Validations
    if (!newPassword || !confirmPassword) {
      const msg = "Please fill in all fields.";
      Platform.OS === "web" ? alert(msg) : Alert.alert("Input Required", msg);
      return;
    }

    if (newPassword !== confirmPassword) {
      const msg = "Passwords do not match.";
      Platform.OS === "web"
        ? alert(msg)
        : Alert.alert("Password Mismatch", msg);
      return;
    }

    if (!passwordEvaluation.isPolicySatisfied) {
      const msg =
        "Password requirements not satisfied: minimum 8 characters, at least one lowercase letter, at least one uppercase letter, and at least one number or special character.";
      Platform.OS === "web"
        ? alert(msg)
        : Alert.alert("Weak Password", msg);
      return;
    }

    setIsLoading(true);

    try {
      console.log(
        `[ResetPassword] Confirming reset at: ${API_URL}/auth/reset-password/confirm`
      );

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
        // Token expired or invalid
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

  // ── Invalid / expired token screen ───────────────────────────────────────
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
                    style={[styles.button, styles.authActionButton]}
                    onPress={() => router.replace("/forgot-password")}
                  >
                    <Text style={styles.buttonText}>Request New Reset Link</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.button,
                      styles.authActionButton,
                      styles.authOutlineButton,
                    ]}
                    onPress={() => router.replace("/")}
                  >
                    <Ionicons
                      name="arrow-back-outline"
                      size={18}
                      color={COLORS.primary}
                      style={styles.authActionIcon}
                    />
                    <Text style={[styles.buttonText, styles.authOutlineButtonText]}>
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
                    Enter your new password below and meet the required password rules.
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
                        onFocus={() => setHasTouchedNewPassword(true)}
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

                  {hasTouchedNewPassword && newPassword.length > 0 && (
                    <View style={{ marginTop: 2, marginBottom: 8 }}>
                      <Text style={{ fontSize: 12, fontWeight: "700", color: COLORS.textSecondary }}>
                        Password Strength
                      </Text>
                      <Text
                        style={{
                          marginTop: 3,
                          marginBottom: 6,
                          fontSize: 13,
                          fontWeight: "700",
                          color: passwordEvaluation.color,
                        }}
                      >
                        {passwordEvaluation.level}
                      </Text>

                      <View style={{ gap: 4 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Ionicons
                            name={passwordEvaluation.checks.minLength ? "checkmark-circle" : "close-circle"}
                            size={14}
                            color={passwordEvaluation.checks.minLength ? COLORS.success : COLORS.error}
                          />
                          <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>
                            At least 8 characters
                          </Text>
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Ionicons
                            name={passwordEvaluation.checks.hasLower ? "checkmark-circle" : "close-circle"}
                            size={14}
                            color={passwordEvaluation.checks.hasLower ? COLORS.success : COLORS.error}
                          />
                          <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>
                            At least one lowercase letter
                          </Text>
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Ionicons
                            name={passwordEvaluation.checks.hasUpper ? "checkmark-circle" : "close-circle"}
                            size={14}
                            color={passwordEvaluation.checks.hasUpper ? COLORS.success : COLORS.error}
                          />
                          <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>
                            At least one uppercase letter
                          </Text>
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Ionicons
                            name={passwordEvaluation.checks.hasNumber ? "checkmark-circle" : "close-circle"}
                            size={14}
                            color={passwordEvaluation.checks.hasNumber ? COLORS.success : COLORS.error}
                          />
                          <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>
                            At least one number
                          </Text>
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Ionicons
                            name={passwordEvaluation.checks.hasSpecial ? "checkmark-circle" : "close-circle"}
                            size={14}
                            color={passwordEvaluation.checks.hasSpecial ? COLORS.success : COLORS.error}
                          />
                          <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>
                            At least one special character
                          </Text>
                        </View>
                        <Text style={{ marginTop: 2, fontSize: 11, color: COLORS.textSecondary, opacity: 0.9 }}>
                          Requirement: include at least one number OR one special character.
                        </Text>
                      </View>
                    </View>
                  )}

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
                        onPress={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                      >
                        <Ionicons
                          name={
                            showConfirmPassword
                              ? "eye-outline"
                              : "eye-off-outline"
                          }
                          size={20}
                          color={COLORS.primary}
                          style={styles.inputIcon}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Password match hint */}
                  {confirmPassword.length > 0 && (
                    <Text
                      style={{
                        fontSize: 12,
                        marginBottom: 8,
                        color:
                          newPassword === confirmPassword ? "#10B981" : "#EF4444",
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
                // ── Success screen ──────────────────────────────────────
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
                    style={[styles.button, styles.authActionButton]}
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
