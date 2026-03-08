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

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [networkError] = useState(false);

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

    setIsLoading(true);

    try {
      // Replace with your actual API endpoint
      const API_URL =
        process.env.EXPO_PUBLIC_API_URL || "http://192.168.1.9:3000/api";
      console.log(
        `Attempting to send request to: ${API_URL}/auth/reset-password`
      );

      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email }),
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

      setResetSent(true);
    } catch (error) {
      console.error("Password reset error:", error);
      let errorMsg = "Something went wrong. Please try again.";

      if (error.name === "AbortError") {
        errorMsg = "Request timed out. The server may be down or unreachable.";
      } else if (error.message === "Network request failed") {
        errorMsg =
          "Unable to connect to the server. Please check your internet connection.";
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
                    If an account exists with the email you provided,
                    you&apos;ll receive password reset instructions shortly.
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.button,
                      {
                        flexDirection: "row",
                        justifyContent: "center",
                        alignItems: "center",
                        marginTop: 20,
                      },
                    ]}
                    onPress={() => router.replace("/")}
                  >
                    <Ionicons
                      name="arrow-back-outline"
                      size={20}
                      color={COLORS.white}
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.buttonText}>Return to Login</Text>
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
