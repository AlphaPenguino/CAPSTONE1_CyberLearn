import {
  Text,
  View,
  Image,
  ImageBackground,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";

import { useRouter } from "expo-router";
import styles from "../../assets/styles/login.styles.js";
import { useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { AudioContext } from "react-native-audio-api";
import * as Animatable from "react-native-animatable";
import COLORS from "../../constants/custom-colors.js";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuthStore } from "../../store/authStore.js";

const AnimatedRobotImage = Animatable.createAnimatableComponent(Image);

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(false);

  const audioContextRef = useRef(null);
  const loginMusicRef = useRef(null);

  const { isLoading, login, sayHello } = useAuthStore();
  const { colors } = useTheme();
  const router = useRouter();

  useEffect(() => {
    let isCancelled = false;

    const startLoginMusic = async () => {
      try {
        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;

        const audioBuffer = await audioContext.decodeAudioData(
          require("../../assets/sounds/login-page.mp3")
        );

        if (isCancelled) {
          await audioContext.close();
          return;
        }

        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.loop = true;
        source.connect(audioContext.destination);
        source.start(audioContext.currentTime);
        loginMusicRef.current = source;
      } catch (error) {
        console.warn("Login music failed to start:", error);
      }
    };

    startLoginMusic();

    return () => {
      isCancelled = true;

      try {
        loginMusicRef.current?.stop();
        loginMusicRef.current?.disconnect();
      } catch {
        // Ignore cleanup errors if source already stopped or detached.
      }

      const contextToClose = audioContextRef.current;
      audioContextRef.current = null;
      loginMusicRef.current = null;

      if (contextToClose) {
        contextToClose.close().catch(() => {
          // Ignore close errors during teardown.
        });
      }
    };
  }, []);

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
      <ImageBackground
        source={require("../../assets/images/loginbg.jpeg")}
        style={styles.backgroundImage}
        imageStyle={styles.backgroundImageAsset}
        resizeMode="cover"
      >
        <View style={styles.backgroundOverlay}>
          <View style={styles.container}>
            <View style={styles.brandContainer}>
              <Text style={styles.brandTitle}>CyberLearn</Text>
            </View>
            <Animatable.View
              style={styles.topIllustration}
              animation="fadeInDown"
              duration={900}
              useNativeDriver
            >
              <Animatable.View
                animation="pulse"
                duration={2400}
                iterationCount="infinite"
                easing="ease-in-out"
                useNativeDriver
              >
                <AnimatedRobotImage
                  source={require("../../assets/images/robot4.png")}
                  style={styles.illustrationImage}
                  resizeMode="contain"
                />
              </Animatable.View>
            </Animatable.View>

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
        </View>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
}
