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
} from "react-native";

import { useRouter, useLocalSearchParams } from "expo-router";
import styles from "../../assets/styles/forgot.styles.js";
import { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import COLORS from "../../constants/custom-colors.js";
import { useTheme } from "../../contexts/ThemeContext";

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState(true);

  const router = useRouter();
  const { token } = useLocalSearchParams();

  useEffect(() => {
    if (!token) {
      setTokenValid(false);
    }
  }, [token]);

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      const msg = "Please fill in all fields.";
      if (Platform.OS === "web") {
        alert(msg);
      } else {
        Alert.alert("Input Required", msg);
      }
      return;
    }

    if (newPassword !== confirmPassword) {
      const msg = "Passwords do not match.";
      if (Platform.OS === "web") {
        alert(msg);
      } else {
        Alert.alert("Password Mismatch", msg);
      }
      return;
    }

    if (newPassword.length < 8) {
      const msg = "Password must be at least 8 characters long.";
      if (Platform.OS === "web") {
        alert(msg);
      } else {
        Alert.alert("Password Too Short", msg);
      }
      return;
    }

    setIsLoading(true);

    try {
      // Replace with your actual API endpoint
      const API_URL =
        process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api";
      const response = await fetch(`${API_URL}/auth/reset-password/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to reset password");
      }

      setResetSuccess(true);
    } catch (error) {
      const errorMsg =
        error.message || "Something went wrong. Please try again.";
      if (Platform.OS === "web") {
        alert(errorMsg);
      } else {
        Alert.alert("Error", errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!tokenValid) {
    return (
      <View style={styles.container}>
        <View style={styles.brandContainer}>
          <Text style={styles.brandTitle}>CyberLearn</Text>
        </View>
        <View style={styles.card}>
          <View style={styles.formContainer}>
            <View style={styles.successContainer}>
              <Ionicons
                name="alert-circle-outline"
                size={48}
                color={COLORS.error}
                style={styles.successIcon}
              />
              <Text style={[styles.successTitle, { color: COLORS.error }]}>
                Invalid Request
              </Text>
              <Text style={styles.successText}>
                The password reset link is invalid or has expired. Please
                request a new password reset.
              </Text>
              <TouchableOpacity
                style={styles.button}
                onPress={() => router.replace("/forgot-password")}
              >
                <Text style={styles.buttonText}>Request New Reset Link</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
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
                  Enter your new password below to reset your account password.
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>New Password</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color={COLORS.primary}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter new password"
                      placeholderTextColor={COLORS.lightBlue}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                    />
                    <Ionicons
                      name={showPassword ? "eye-outline" : "eye-off-outline"}
                      size={20}
                      color={COLORS.primary}
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.inputIcon}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Confirm Password</Text>
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
                      placeholderTextColor={COLORS.lightBlue}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                    />
                  </View>
                </View>

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
                  size={48}
                  color={COLORS.success}
                  style={styles.successIcon}
                />
                <Text style={styles.successTitle}>
                  Password Reset Successfully
                </Text>
                <Text style={styles.successText}>
                  Your password has been reset successfully. You can now log in
                  with your new password.
                </Text>
                <TouchableOpacity
                  style={styles.button}
                  onPress={() => router.replace("/")}
                >
                  <Text style={styles.buttonText}>Go to Login</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
