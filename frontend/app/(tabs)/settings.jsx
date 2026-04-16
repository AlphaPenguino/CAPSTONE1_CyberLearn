import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  useWindowDimensions,
  TextInput,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../store/authStore";
import { useSettings } from "../../contexts/SettingsContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useRouter } from "expo-router";
import COLORS from "@/constants/custom-colors";
import * as ImagePicker from "expo-image-picker";
import {
  API_URL,
  constructProfileImageUrl,
  addCacheBuster,
} from "@/constants/api";
import ChangePasswordModal from "../../components/ui/ChangePasswordModal";

export default function Settings() {
  const { width } = useWindowDimensions();
  const isMobileWidth = width < 600; // applies to web & native
  const { user, logout, updateUser } = useAuthStore();
  const { settings, saveSettings, triggerHaptic } = useSettings();
  const { isDarkMode, toggleTheme, colors } = useTheme();
  const router = useRouter();
  const [profileImageError, setProfileImageError] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState("");
  const [isSavingUsername, setIsSavingUsername] = useState(false);
  // Force re-render / cache bust key for Image component
  const [imageKey, setImageKey] = useState(Date.now());
  // Track upload attempt to enable retry logic if file not immediately available on CDN/storage
  const uploadRetryCountRef = useRef(0);
  // Local temporary image URI (display immediately after picking, before remote URL propagates)
  const [tempLocalImageUri, setTempLocalImageUri] = useState(null);

  // When profileImageTimestamp changes, bump the imageKey so Image remounts and bypasses RN cache layer
  useEffect(() => {
    if (user?.profileImageTimestamp) {
      setImageKey(user.profileImageTimestamp + Math.random());
    }
  }, [user?.profileImageTimestamp]);

  useEffect(() => {
    if (!isEditingUsername) {
      setUsernameDraft(user?.username || "");
    }
  }, [user?.username, isEditingUsername]);

  // Use dark blue in light mode instead of the default yellow for settings accents
  const highlightColor = isDarkMode ? colors.primary : "#000000";
  const screenGradient = isDarkMode ? ["#0f172a", "#111827"] : ["#caf1c8", "#5fd2cd"];
  const premiumCardStyle = {
    backgroundColor: isDarkMode
      ? "rgba(15, 23, 42, 0.74)"
      : "rgba(255, 255, 255, 0.84)",
    borderColor: isDarkMode
      ? "rgba(148, 163, 184, 0.26)"
      : "rgba(148, 163, 184, 0.34)",
  };

  // Helper function to get compatible image URL
  const getCompatibleImageUrl = (url) => {
    if (!url) return null;

    // First construct the full URL from filename if needed
    let fullUrl = constructProfileImageUrl(url);

    if (Platform.OS !== "web") {
      try {
        console.log("🧪 getCompatibleImageUrl input:", url);
        console.log("🧪 getCompatibleImageUrl constructed:", fullUrl);
      } catch {}
    }

    if (fullUrl && fullUrl.includes("dicebear") && fullUrl.includes("/svg")) {
      if (Platform.OS === "android" || Platform.OS === "ios") {
        fullUrl = fullUrl.replace("/svg", "/png");
      }
    }

    // Add cache busting parameter to force refresh
    // Use timestamp from user object if available, otherwise use current time
    const timestamp = user?.profileImageTimestamp;
    return addCacheBuster(fullUrl, timestamp);
  };

  const prefetchImage = async (url) => {
    if (!url) return;
    try {
      if (Platform.OS === "web") {
        // Web prefetch using Image object
        await new Promise((resolve, reject) => {
          const img = new window.Image();
          img.onload = resolve;
          img.onerror = reject;
          img.src = url;
        });
      } else {
        await Image.prefetch(url);
      }
      console.log("🗂️ Prefetched new profile image:", url);
    } catch (e) {
      console.log(
        "⚠️ Prefetch failed (will rely on standard load):",
        e.message
      );
    }
  };

  const scheduleRetryIfNeeded = (baseUrl) => {
    // If initial load fails right after upload, storage might be eventually consistent; retry a few times
    if (uploadRetryCountRef.current >= 4) return; // max 4 retries
    const attempt = ++uploadRetryCountRef.current;
    setTimeout(async () => {
      if (isEditingUsername) {
        return;
      }
      const retryUrl = addCacheBuster(baseUrl, Date.now());
      console.log(`🔁 Retry prefetch attempt ${attempt} ->`, retryUrl);
      await prefetchImage(retryUrl);
      // Force re-render with fresh key each retry
      setImageKey(Date.now() + attempt);
    }, 800 * attempt); // progressive backoff
  };

  const handleProfilePictureUpload = async () => {
    try {
      console.log("🚀 Starting profile picture upload...");
      triggerHaptic("light");

      // Request permission to access media library
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      console.log("📋 Permission result:", permissionResult);

      if (permissionResult.granted === false) {
        console.log("❌ Permission denied");
        Alert.alert(
          "Permission required",
          "Please allow access to your photo library to upload a profile picture."
        );
        return;
      }

      console.log("✅ Permission granted, launching image picker...");

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: false,
      });

      console.log("📸 Image picker result:", {
        canceled: result.canceled,
        assetsLength: result.assets?.length || 0,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setIsUploadingImage(true);
        const asset = result.assets[0];
        // Show picked image immediately (local) while upload proceeds
        setTempLocalImageUri(asset.uri);

        console.log("📁 Selected asset details:", {
          uri: asset.uri,
          type: asset.type,
          mimeType: asset.mimeType,
          fileName: asset.fileName,
          filename: asset.filename,
          size: asset.fileSize,
          width: asset.width,
          height: asset.height,
        });

        // Create FormData for file upload
        const formData = new FormData();

        // For React Native, we need to handle the file object differently
        // React Native requires a specific format for file uploads
        if (Platform.OS === "web") {
          // Web version - use File/Blob
          const response = await fetch(asset.uri);
          const blob = await response.blob();
          const fileName =
            asset.fileName || asset.filename || `profile_${Date.now()}.jpg`;
          formData.append("profilePicture", blob, fileName);
        } else {
          // React Native version - use object with uri, type, name
          // Fix for Android: ensure proper file extension and MIME type
          const fileName =
            asset.fileName || asset.filename || `profile_${Date.now()}.jpg`;

          // Ensure the MIME type is properly set for Android
          let mimeType = asset.mimeType || asset.type || "image/jpeg";

          // Android fix: map common image types
          if (mimeType === "image/jpg") {
            mimeType = "image/jpeg";
          }

          const fileData = {
            uri:
              Platform.OS === "android"
                ? asset.uri
                : asset.uri.replace("file://", ""),
            type: mimeType,
            name: fileName,
          };

          console.log("📎 File data for upload:", fileData);
          formData.append("profilePicture", fileData);
        }

        console.log("🌐 FormData created for platform:", Platform.OS);

        // Get token from auth store
        const { token } = useAuthStore.getState();

        if (!token) {
          throw new Error(
            "No authentication token found. Please log in again."
          );
        }

        console.log("🔑 Auth token available:", !!token);
        console.log("📤 Upload to:", `${API_URL}/users/upload-profile-picture`);

        // Upload to backend with proper headers for mobile
        const uploadHeaders = {
          Authorization: `Bearer ${token}`,
        };

        // For mobile, explicitly set Accept header
        if (Platform.OS !== "web") {
          uploadHeaders["Accept"] = "application/json";
        }

        // Upload to backend
        const response = await fetch(
          `${API_URL}/users/upload-profile-picture`,
          {
            method: "POST",
            headers: uploadHeaders,
            body: formData,
          }
        );

        console.log("📥 Upload response status:", response.status);
        console.log(
          "📥 Upload response headers:",
          Object.fromEntries(response.headers.entries())
        );

        let data;
        try {
          data = await response.json();
          console.log("📥 Upload response data:", data);
        } catch (parseError) {
          console.error("❌ Failed to parse response as JSON:", parseError);
          const responseText = await response.text();
          console.log("📄 Raw response text:", responseText);
          throw new Error(
            `Server returned non-JSON response: ${response.status} ${response.statusText}`
          );
        }

        if (response.ok && data.success) {
          console.log("✅ Upload successful, updating user data");

          // Merge with existing user to avoid losing fields (fullName, gamification, etc.)
          const existingUser = useAuthStore.getState().user || {};

          const mergedUser = {
            ...existingUser,
            ...data.user, // server now supplies fullName and other details
            profileImage: data.user.profileImage,
            profileImageTimestamp:
              data.user.profileImageTimestamp || Date.now(),
          };

          // Generate a fresh timestamp to ensure cache busting even if backend returned same value
          const freshTimestamp = Date.now();
          const mergedWithFreshTs = {
            ...mergedUser,
            profileImageTimestamp: freshTimestamp,
          };
          updateUser(mergedWithFreshTs);
          setProfileImageError(false);

          // Force image component to remount immediately
          setImageKey(Date.now());

          // Attempt to prefetch the new image in background (non-blocking)
          const constructed = constructProfileImageUrl(
            mergedWithFreshTs.profileImage
          );
          const cacheBusted = addCacheBuster(
            constructed,
            mergedWithFreshTs.profileImageTimestamp
          );

          // Run prefetch in background without blocking
          prefetchImage(cacheBusted).catch((err) => {
            console.log(
              "⚠️ Background prefetch failed, will retry:",
              err.message
            );
          });

          // Schedule a retry sequence in case the file isn't yet available (eventual consistency)
          scheduleRetryIfNeeded(constructed);

          Alert.alert("Success", "Profile picture updated successfully!");
        } else {
          console.error("❌ Upload failed:", data);
          throw new Error(
            data.message || `HTTP ${response.status}: Upload failed`
          );
        }
      } else {
        console.log("ℹ️ Image picker canceled or no image selected");
      }
    } catch (error) {
      console.error("💥 Error uploading profile picture:", error);

      // More specific error handling
      let errorMessage = "Failed to upload profile picture. Please try again.";

      if (error.message.includes("No authentication token")) {
        errorMessage = "Please log in again to upload a profile picture.";
      } else if (error.message.includes("Network request failed")) {
        errorMessage =
          "Network error. Please check your internet connection and try again.";
      } else if (error.message.includes("HTTP 400")) {
        errorMessage =
          "Invalid file format or size. Please try a different image.";
      } else if (error.message.includes("HTTP 401")) {
        errorMessage = "Authentication error. Please log in again.";
      } else if (error.message.includes("HTTP 413")) {
        errorMessage =
          "File too large. Please choose a smaller image (max 5MB).";
      } else if (error.message.includes("HTTP 500")) {
        errorMessage = "Server error. Please try again later.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      console.error("🚨 Final error message:", errorMessage);
      Alert.alert("Error", errorMessage);
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Manual refresh: user taps to attempt loading remote image & clear local placeholder
  const handleManualImageRefresh = () => {
    triggerHaptic("light");
    if (user) {
      const newTs = Date.now();
      updateUser({ ...user, profileImageTimestamp: newTs });
      setImageKey(newTs + Math.random());
    }
    // Clear local temp so remote will be attempted
    setTempLocalImageUri(null);
    const constructed = constructProfileImageUrl(user?.profileImage);
    if (constructed) {
      const cacheBusted = addCacheBuster(constructed, Date.now());
      prefetchImage(cacheBusted).catch(() => {});
    }
  };

  const handleLogout = () => {
    const performLogout = async () => {
      try {
        // Optimistically clear user state to prevent intermediate renders using stale user data
        useAuthStore.setState({ user: null, token: null });
        await logout();
        // Navigate directly to auth stack root; '/' may conflict with router base
        router.replace("/(auth)");
      } catch (e) {
        console.error("Logout error:", e);
      }
    };

    if (Platform.OS === "web") {
      if (confirm("Are you sure you want to logout?")) {
        performLogout();
      }
    } else {
      Alert.alert("Logout", "Are you sure you want to logout?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          onPress: () => {
            performLogout();
          },
          style: "destructive",
        },
      ]);
    }
  };

  const handleSettingToggle = async (setting, value) => {
    triggerHaptic("light");
    await saveSettings({ [setting]: value });
  };

  const handleSaveUsername = async () => {
    const nextUsername = (usernameDraft || "").trim();
    const previousUser = useAuthStore.getState().user || {};
    const previousUsername = previousUser?.username || "";

    if (!nextUsername) {
      Alert.alert("Invalid Username", "Username cannot be empty.");
      return;
    }

    if (nextUsername.length < 3) {
      Alert.alert(
        "Invalid Username",
        "Username should be at least 3 characters long."
      );
      return;
    }

    if ((user?.username || "").toLowerCase() === nextUsername.toLowerCase()) {
      setIsEditingUsername(false);
      return;
    }

    try {
      setIsSavingUsername(true);
      // Exit editing zone immediately when user confirms with check button.
      setIsEditingUsername(false);

      // Optimistic local update for snappy UX.
      updateUser({
        ...previousUser,
        username: nextUsername,
      });

      const currentToken = useAuthStore.getState().token;

      if (!currentToken) {
        throw new Error("No authentication token found. Please log in again.");
      }

      const response = await fetch(`${API_URL}/users/me/username`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify({ username: nextUsername }),
      });

      let data = await response.json().catch(() => ({}));
      let finalResponse = response;

      // Fallback for older backend instances that may not expose /users/me/username yet.
      if (response.status === 404) {
        const currentUserId = user?._id || user?.id;
        if (currentUserId) {
          const fallbackResponse = await fetch(`${API_URL}/users/${currentUserId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${currentToken}`,
            },
            body: JSON.stringify({ username: nextUsername }),
          });
          const fallbackData = await fallbackResponse.json().catch(() => ({}));
          finalResponse = fallbackResponse;
          data = fallbackData;
        }
      }

      if (!finalResponse.ok || !data?.success) {
        if (response.status === 404 && finalResponse.status === 404) {
          throw new Error(
            "Username endpoint is unavailable (404). Please restart the backend server and try again."
          );
        }
        throw new Error(data?.message || "Failed to update username");
      }

      const existingUser = useAuthStore.getState().user || {};
      const mergedUser = {
        ...existingUser,
        ...(data.user || {}),
        username: data?.user?.username || nextUsername,
      };

      updateUser(mergedUser);
      Alert.alert("Success", "Username updated successfully.");
    } catch (error) {
      console.error("Error updating username:", error);
      // Roll back optimistic update and reopen editor so user can retry.
      updateUser({
        ...previousUser,
        username: previousUsername,
      });
      setUsernameDraft(nextUsername);
      setIsEditingUsername(true);
      Alert.alert("Error", error.message || "Failed to update username.");
    } finally {
      setIsSavingUsername(false);
    }
  };

  const SettingItem = ({
    title,
    subtitle,
    value,
    onToggle,
    icon,
    type = "switch",
  }) => (
    <View
      style={[
        styles.settingItem,
        premiumCardStyle,
      ]}
    >
      {/* Existing content */}
      <View style={styles.settingLeft}>
        <Ionicons name={icon} size={24} color={highlightColor} />
        <View style={styles.settingText}>
          <Text style={[styles.settingTitle, { color: colors.text }]}>
            {title}
          </Text>
          {subtitle && (
            <Text
              style={[styles.settingSubtitle, { color: colors.textSecondary }]}
            >
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      {type === "switch" && (
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: "#767577", true: highlightColor }}
          thumbColor={value ? "#ffffff" : "#f4f3f4"}
        />
      )}
      {type === "chevron" && (
        <Ionicons
          name="chevron-forward"
          size={20}
          color={colors.textSecondary}
        />
      )}
    </View>
  );

  const ProfileSection = () => (
    <View style={styles.section}>
      <Text
        style={[
          styles.sectionTitle,
          { color: highlightColor },
        ]}
      >
        Profile
      </Text>
      <View
        style={[
          styles.profileContainer,
          premiumCardStyle,
        ]}
      >
        <TouchableOpacity
          style={styles.avatarContainer}
          onPress={handleProfilePictureUpload}
          disabled={isUploadingImage}
        >
          {(() => {
            // Prefer local image if just picked
            if (tempLocalImageUri) {
              return (
                <Image
                  key={imageKey}
                  source={{ uri: tempLocalImageUri }}
                  style={styles.profileImage}
                  onError={() => {
                    console.log("⚠️ Local temp image failed to render");
                  }}
                />
              );
            }
            if (user?.profileImage && !profileImageError) {
              return (
                <Image
                  key={imageKey}
                  source={{ uri: getCompatibleImageUrl(user.profileImage) }}
                  style={styles.profileImage}
                  onError={(error) => {
                    console.log(
                      "🖼️ Remote profile image load error:",
                      error.nativeEvent
                    );
                    setProfileImageError(true);
                    if (!isEditingUsername && uploadRetryCountRef.current < 4) {
                      const constructed = constructProfileImageUrl(
                        user.profileImage
                      );
                      scheduleRetryIfNeeded(constructed);
                    }
                  }}
                  onLoad={() => {
                    console.log("✅ Remote profile image loaded");
                    setProfileImageError(false);
                  }}
                />
              );
            }
            return (
              <View style={styles.profileImageFallback}>
                <Text style={styles.profileImageText}>
                  {user?.username?.charAt(0).toUpperCase() || "?"}
                </Text>
              </View>
            );
          })()}

          {/* Upload overlay */}
          <View style={styles.uploadOverlay}>
            {isUploadingImage ? (
              <ActivityIndicator size={16} color="#fff" />
            ) : (
              <Ionicons name="camera" size={16} color="#fff" />
            )}
          </View>

          <View style={styles.roleBadge}>
            <Ionicons
              name={
                user?.privilege === "instructor"
                  ? "shield"
                  : user?.privilege === "admin"
                  ? "star"
                  : "person"
              }
              size={12}
              color="#fff"
            />
          </View>
        </TouchableOpacity>
        <View style={styles.profileInfo}>
          <View style={styles.usernameRow}>
            {isEditingUsername ? (
              <TextInput
                value={usernameDraft}
                onChangeText={setUsernameDraft}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                blurOnSubmit={false}
                editable={!isSavingUsername}
                style={[
                  styles.usernameInput,
                  {
                    color: colors.text,
                    borderColor: colors.border,
                    backgroundColor: isDarkMode
                      ? "rgba(30, 41, 59, 0.8)"
                      : "rgba(241, 245, 249, 0.9)",
                  },
                ]}
              />
            ) : (
              <Text style={[styles.profileName, { color: colors.text }]}> 
                {user?.username || "Unknown User"}
              </Text>
            )}

            {isEditingUsername ? (
              <View style={styles.usernameActionsRow}>
                <TouchableOpacity
                  style={styles.usernameActionButton}
                  onPress={handleSaveUsername}
                  disabled={isSavingUsername}
                >
                  {isSavingUsername ? (
                    <ActivityIndicator size="small" color={highlightColor} />
                  ) : (
                    <Ionicons name="checkmark" size={18} color={highlightColor} />
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.usernameActionButton}
                  onPress={() => {
                    setUsernameDraft(user?.username || "");
                    setIsEditingUsername(false);
                  }}
                  disabled={isSavingUsername}
                >
                  <Ionicons name="close" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.usernameEditButton}
                onPress={() => {
                  setUsernameDraft(user?.username || "");
                  setIsEditingUsername(true);
                }}
              >
                <Ionicons name="create-outline" size={16} color={highlightColor} />
                <Text style={[styles.usernameEditText, { color: highlightColor }]}> 
                  Edit
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View
            style={[
              styles.profileInfoSection,
              {
                backgroundColor: isDarkMode
                  ? "rgba(30, 41, 59, 0.78)"
                  : "rgba(241, 245, 249, 0.9)",
              },
            ]}
          >
            <Ionicons
              name="person-outline"
              size={16}
              color={colors.textSecondary}
            />
            <Text style={[styles.profileFullName, { color: colors.text }]}>
              {user?.fullName || "No name provided"}
            </Text>
          </View>

          <View style={styles.profileInfoSection}>
            <Ionicons
              name="mail-outline"
              size={16}
              color={colors.textSecondary}
            />
            <Text
              style={[styles.profileEmail, { color: colors.textSecondary }]}
            >
              {user?.email || "No email provided"}
            </Text>
          </View>

          <View style={styles.profileInfoSection}>
            <Ionicons
              name={
                user?.privilege === "instructor"
                  ? "shield-outline"
                  : user?.privilege === "admin"
                  ? "star-outline"
                  : "school-outline"
              }
              size={16}
              color={highlightColor}
            />
            <Text style={[styles.profileRole, { color: highlightColor }]}>
              {user?.privilege === "instructor"
                ? "Instructor"
                : user?.privilege === "admin"
                ? "Administrator"
                : "Student"}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.changePhotoButton,
              {
                backgroundColor: isDarkMode
                  ? "rgba(30, 41, 59, 0.88)"
                  : "rgba(241, 245, 249, 0.95)",
              },
            ]}
            onPress={handleProfilePictureUpload}
            disabled={isUploadingImage}
          >
            <Ionicons
              name="camera-outline"
              size={16}
              color={colors.textSecondary}
            />
            <Text
              style={[styles.changePhotoText, { color: colors.textSecondary }]}
            >
              {isUploadingImage ? "Uploading..." : "Change Photo"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const SecuritySection = () => (
    <View style={styles.section}>
      <Text
        style={[
          styles.sectionTitle,
          { color: highlightColor },
        ]}
      >
        Security
      </Text>

      <TouchableOpacity
        style={[
          styles.settingItem,
          premiumCardStyle,
        ]}
        onPress={() => setShowChangePassword(true)}
      >
        <View style={styles.settingLeft}>
          <Ionicons name="key-outline" size={24} color={highlightColor} />
          <View style={styles.settingText}>
            <Text style={[styles.settingTitle, { color: colors.text }]}>
              Change Password
            </Text>
            <Text
              style={[styles.settingSubtitle, { color: colors.textSecondary }]}
            >
              Update your account password
            </Text>
          </View>
        </View>
        <Ionicons
          name="chevron-forward"
          size={20}
          color={colors.textSecondary}
        />
      </TouchableOpacity>
    </View>
  );

  const AppPreferencesSection = () => (
    <View style={styles.section}>
      <Text
        style={[
          styles.sectionTitle,
          { color: highlightColor },
        ]}
      >
        App Preferences
      </Text>

      {/* <SettingItem
        title="Dark Mode"
        subtitle="Use dark theme"
        value={isDarkMode}
        onToggle={toggleTheme}
        icon="moon-outline"
      /> */}

      {Platform.OS === "android" && (
        <SettingItem
          title="Notifications"
          subtitle="Receive push notifications"
          value={settings.notifications}
          onToggle={(value) => handleSettingToggle("notifications", value)}
          icon="notifications-outline"
        />
      )}
    </View>
  );

  const AboutSection = () => (
    <View style={styles.section}>
      <Text
        style={[
          styles.sectionTitle,
          { color: highlightColor },
        ]}
      >
        About
      </Text>

      <View style={[styles.aboutItem, { borderBottomColor: colors.border }]}>
        <Text style={[styles.aboutLabel, { color: colors.text }]}>
          App Version
        </Text>
        <Text style={[styles.aboutValue, { color: colors.textSecondary }]}>
          1.0.9
        </Text>
      </View>

      <View style={[styles.aboutItem, { borderBottomColor: colors.border }]}>
        <Text style={[styles.aboutLabel, { color: colors.text }]}>
          Platform
        </Text>
        <Text style={[styles.aboutValue, { color: colors.textSecondary }]}>
          {Platform.OS}
        </Text>
      </View>
    </View>
  );

  return (
    <LinearGradient colors={screenGradient} style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.pageWrapper,
            isMobileWidth && styles.pageWrapperMobile,
          ]}
        >
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.headerTitle, { color: highlightColor }]}> 
              ⚙️ Settings
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}> 
              Personalize your account and app experience
            </Text>
          </View>
          <ProfileSection />
          <SecuritySection />
          <AppPreferencesSection />
          <AboutSection />
          {/* Logout Button */}
          <View style={styles.section}>
            <View style={styles.logoutButtonContainer}>
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={handleLogout}
              >
                <Ionicons name="log-out-outline" size={24} color="#ffffff" />
                <Text style={styles.logoutButtonText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
          {/* Bottom Padding */}
          <View style={styles.bottomPadding} />
        </View>
        {/* Change Password Modal */}
        <ChangePasswordModal
          visible={showChangePassword}
          onClose={() => setShowChangePassword(false)}
        />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  profileName: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#FFFFFF", // Set to white
  },
  profileFullName: {
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 8,
    color: "#FFFFFF", // Set to white
  },
  profileEmail: {
    fontSize: 14,
    fontStyle: "italic",
    marginLeft: 8,
    color: "#FFFFFF", // Set to white
  },
  profileRole: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
    color: "#FFFFFF", // Set to white
  },
  profileSection: {
    fontSize: 14,
    marginLeft: 8,
    color: "#FFFFFF", // Set to white
  },
  changePhotoText: {
    fontSize: 14,
    marginLeft: 6,
    fontWeight: "500",
    color: "#FFFFFF", // Set to white
  },

  // Settings items text styles
  settingTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#FFFFFF", // Set to white
  },
  settingSubtitle: {
    fontSize: 14,
    marginTop: 2,
    color: "rgba(255, 255, 255, 0.8)", // Set to slightly transparent white
  },

  // About section text styles
  aboutLabel: {
    fontSize: 16,
    color: "#FFFFFF", // Set to white
  },
  aboutValue: {
    fontSize: 16,
    color: "#FFFFFF", // Set to white
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  pageWrapper: {
    width: "100%",
    maxWidth: 1040,
    alignSelf: "center",
    paddingHorizontal: 0,
    paddingBottom: 32,
  },
  pageWrapperMobile: {
    paddingHorizontal: 12, // leave a little padding on mobile
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: "500",
    opacity: 0.9,
  },
  section: {
    marginTop: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  profileContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 4,
  },
  profileInfoSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,

    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },

  changePhotoButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,

    borderRadius: 8,
    marginTop: 6,
    alignSelf: "flex-start",
  },
  avatarContainer: {
    position: "relative",
    marginRight: 15,
  },
  profileImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  profileImageFallback: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  profileImageText: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "bold",
  },
  uploadOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: 12,
    padding: 4,
    borderWidth: 2,
    borderColor: "#fff",
  },
  roleBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "rgba(0, 150, 255, 0.8)",
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  profileInfo: {
    flex: 1,
  },
  usernameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 10,
  },
  usernameInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 17,
    fontWeight: "700",
  },
  usernameEditButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(148, 163, 184, 0.16)",
  },
  usernameEditText: {
    fontSize: 12,
    fontWeight: "700",
  },
  usernameActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  usernameActionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(148, 163, 184, 0.16)",
  },

  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  settingText: {
    marginLeft: 15,
    flex: 1,
  },

  actionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
  },
  aboutItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderRadius: 12,
    marginBottom: 8,
  },

  logoutButtonContainer: {
    width: "100%",
    alignItems: Platform.OS === "web" ? "center" : "stretch",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#b91c1c",
    padding: 15,
    borderRadius: 14,
    marginTop: 10,
    ...(Platform.OS === "web"
      ? {
          width: 300,
          maxWidth: "100%",
        }
      : {
          width: "100%",
        }),
  },
  logoutButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 10,
  },
  bottomPadding: {
    height: 100,
  },
});
