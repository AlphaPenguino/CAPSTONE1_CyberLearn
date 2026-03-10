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

import { useRouter } from "expo-router";
import styles from "../../assets/styles/forgot.styles.js";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import COLORS from "../../constants/custom-colors.js";
import { useTheme } from "../../contexts/ThemeContext";
import { API_URL } from "../../constants/api.js";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [networkError, setNetworkError] = useState(false);

  const router = useRouter();

  const handleResetPassword = async () => {
    if (!email) {
      const msg = "Please enter your email address.";
      if (Platform.OS === "web") {
        alert(msg);
      } else {
        Alert.alert("Email Required", msg);
      }
      return;
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      const msg = "Please enter a valid email address.";
      if (Platform.OS === "web") {
        alert(msg);
      } else {
        Alert.alert("Invalid Email", msg);
      }
      return;
    }

    setIsLoading(true);
    setNetworkError(false);

    try {
      console.log(`Attempting to send request to: ${API_URL}/auth/reset-password`);

      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Check if the response is JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server error: Received non-JSON response");
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to request password reset");
      }

      // Success — show confirmation regardless of whether email exists (security best practice)
      setResetSent(true);
    } catch (error) {
      console.error("Password reset error:", error);
      let errorMsg = "Something went wrong. Please try again.";

      if (error.name === "AbortError") {
        errorMsg = "Request timed out. The server may be down or unreachable.";
        setNetworkError(true);
      } else if (
        error.message === "Network request failed" ||
        error.message?.includes("Failed to fetch")
      ) {
        errorMsg =
          "Unable to connect to the server. Please check your internet connection.";
        setNetworkError(true);
      } else if (error.message === "Server error: Received non-JSON response") {
        errorMsg =
          "The server is not responding correctly. Please try again later.";
      } else {
        errorMsg = error.message || errorMsg;
      }

      if (Platform.OS === "web") {
        alert(errorMsg);
      } else {
        Alert.alert("Error", errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

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
              source={require("../../assets/images/robot3.png")}
              style={styles.illustrationImage}
              resizeMode="contain"
            />
          </View>

          <View style={styles.card}>
            <View style={styles.formContainer}>
              <View style={styles.headerContainer}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => router.back()}
                >
                  <Ionicons
                    name="arrow-back"
                    size={24}
                    color={COLORS.primary}
                  />
                </TouchableOpacity>
                <Text style={styles.formTitle}>Forgot Password</Text>
              </View>

              {!resetSent ? (
                <>
                  <Text style={styles.instructionText}>
                    Enter your email address below and we&apos;ll send you
                    instructions to reset your password.
                  </Text>

                  {networkError && (
                    <View style={styles.networkErrorContainer}>
                      <Ionicons
                        name="wifi-outline"
                        size={16}
                        color={COLORS.error}
                      />
                      <Text style={styles.networkErrorText}>
                        Network connection issue. Please check your internet
                        connection and try again.
                      </Text>
                    </View>
                  )}

                  <View style={styles.inputGroup}>
                    <View style={styles.inputContainer}>
                      <Ionicons
                        name="mail-outline"
                        size={20}
                        color={COLORS.primary}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="Enter your email"
                        placeholderTextColor={COLORS.primary}
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!isLoading}
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
                      <Text style={styles.buttonText}>Send Reset Link</Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.successContainer}>
                  <Ionicons
                    name="mail"
                    size={48}
                    color={COLORS.primary}
                    style={styles.successIcon}
                  />
                  <Text style={styles.successTitle}>Check Your Email</Text>
                  <Text style={styles.successText}>
                    If an account exists with{" "}
                    <Text style={{ fontWeight: "bold" }}>{email}</Text>,
                    you&apos;ll receive password reset instructions shortly.
                    {"\n\n"}
                    Please also check your spam or junk folder.
                  </Text>
                  <TouchableOpacity
                    style={[styles.button, { marginTop: 12 }]}
                    onPress={() => {
                      setResetSent(false);
                      setEmail("");
                      setNetworkError(false);
                    }}
                  >
                    <Text style={styles.buttonText}>Try a Different Email</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.button,
                      {
                        flexDirection: "row",
                        justifyContent: "center",
                        alignItems: "center",
                        marginTop: 10,
                        backgroundColor: "transparent",
                        borderWidth: 1,
                        borderColor: COLORS.primary,
                      },
                    ]}
                    onPress={() => router.replace("/")}
                  >
                    <Ionicons
                      name="arrow-back-outline"
                      size={20}
                      color={COLORS.primary}
                      style={{ marginRight: 8 }}
                    />
                    <Text style={[styles.buttonText, { color: COLORS.primary }]}>
                      Return to Login
                    </Text>
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
