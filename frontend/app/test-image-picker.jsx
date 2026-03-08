import React, { useState } from "react";
import { View, Text, TouchableOpacity, Alert, Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";

export default function TestImagePicker() {
  const [isUploading, setIsUploading] = useState(false);

  const testImagePicker = async () => {
    try {
      console.log("🔍 Testing image picker...");
      setIsUploading(true);

      // Request permission
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log("📋 Permission result:", permissionResult);

      if (permissionResult.granted === false) {
        Alert.alert(
          "Permission required",
          "Please allow access to your photo library to upload a profile picture."
        );
        return;
      }

      console.log("✅ Permission granted, launching picker...");

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
        assets: result.assets?.length || 0,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        console.log("🖼️  Selected asset:", {
          uri: asset.uri,
          type: asset.type,
          mimeType: asset.mimeType,
          fileName: asset.fileName,
          filename: asset.filename,
          size: asset.fileSize,
          width: asset.width,
          height: asset.height,
        });

        Alert.alert(
          "Success!",
          `Image selected: ${asset.fileName || asset.filename || "unnamed"}`
        );
      } else {
        console.log("❌ No image selected or picker canceled");
      }
    } catch (error) {
      console.error("💥 Error testing image picker:", error);
      Alert.alert("Error", `Failed to test image picker: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <View style={{ padding: 20, flex: 1, justifyContent: "center" }}>
      <Text style={{ fontSize: 18, marginBottom: 20, textAlign: "center" }}>
        Image Picker Test
      </Text>
      <Text style={{ marginBottom: 20, textAlign: "center" }}>
        Platform: {Platform.OS}
      </Text>
      <TouchableOpacity
        onPress={testImagePicker}
        disabled={isUploading}
        style={{
          backgroundColor: isUploading ? "#ccc" : "#007AFF",
          padding: 15,
          borderRadius: 8,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "white", fontSize: 16 }}>
          {isUploading ? "Testing..." : "Test Image Picker"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
