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

import { useRouter } from "expo-router";
import styles from "../../assets/styles/login.styles.js";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import COLORS from "../../constants/custom-colors.js";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuthStore } from "../../store/authStore.js";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(false);

  const { isLoading, login, sayHello } = useAuthStore();
  const { colors } = useTheme();
  const router = useRouter();

  const handleLogin = async () => {
    if (!privacyChecked) {
      const msg = "Please agree to the Privacy Policy to continue.";
      if (Platform.OS === "web") {
        alert(msg);
      } else {
        Alert.alert("Privacy Policy Required", msg);
      }
      return;
    }
    sayHello();
    const result = await login(email, password);

    if (!result.success) {
      if (Platform.OS === "web") {
        alert(result.error);
      } else {
        Alert.alert("Login Error", result.error);
      }
      return;
    }

    if (result.success) {
      Alert.alert("Login Successful", "Welcome back!");
      // Small delay to ensure user state is updated
      setTimeout(() => {
        const currentUser = useAuthStore.getState().user;
        if (currentUser?.privilege === "admin") {
          router.replace("/(tabs)/dashboard");
        } else if (currentUser?.privilege === "instructor") {
          router.replace("/(tabs)/instructor");
        } else {
          router.replace("/(tabs)");
        }
      }, 100);
    }
  };

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
            source={require("../../assets/images/robot4.png")}
            style={styles.illustrationImage}
            resizeMode="contain"
          />
        </View>

        <View style={styles.card}>
          <View style={styles.formContainer}>
            {/*Email is here*/}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
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
                  placeholderTextColor={colors.textMuted || "#64748B"}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  underlineColorAndroid="transparent"
                />
              </View>
            </View>

            {/*Password is here*/}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={COLORS.primary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.textMuted || "#64748B"}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  underlineColorAndroid="transparent"
                />
                <Ionicons
                  name={showPassword ? "eye-outline" : "eye-off-outline"}
                  size={20}
                  color={COLORS.primary}
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.inputIcon}
                />
              </View>
              <TouchableOpacity
                style={styles.forgotPassword}
                onPress={() => router.push("/forgot-password")}
              >
                <Text style={styles.forgotPasswordText}>forgot password?</Text>
              </TouchableOpacity>
            </View>

            {/* Privacy policy acknowledgment - updated to navigate instead of modal */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <TouchableOpacity
                onPress={() => setPrivacyChecked(!privacyChecked)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: privacyChecked }}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 4,
                  borderWidth: 2,
                  borderColor: colors.primary,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 10,
                  backgroundColor: privacyChecked
                    ? colors.primary
                    : "transparent",
                }}
              >
                {privacyChecked && (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                )}
              </TouchableOpacity>
              <Text
                style={{ color: colors.textSecondary, fontSize: 12, fontWeight: "600" }}
              >
                I have agreed to the
              </Text>
              <Text
                style={{ color: colors.textSecondary, fontSize: 12, fontWeight: "600" }}
              >
                {" "}
              </Text>

              {/* Updated: navigate to privacy policy page instead of opening modal */}
              <TouchableOpacity
                onPress={() => router.push("/privacy-policy")}
              >
                <Text
                  style={{
                    color: colors.primary,
                    fontWeight: "600",
                    fontSize: 12,
                    textDecorationLine: "underline",
                  }}
                >
                  Privacy Policy
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.button,
                (!privacyChecked || isLoading) && { opacity: 0.6 },
              ]}
              onPress={handleLogin}
              disabled={isLoading || !privacyChecked}
            >
              {isLoading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.buttonText}>Login</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
