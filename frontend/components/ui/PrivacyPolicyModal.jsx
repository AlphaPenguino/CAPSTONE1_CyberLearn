import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from "react-native";
import { useAuthStore } from "../../store/authStore";
import { useTheme } from "../../contexts/ThemeContext";
import { API_URL } from "../../constants/api";

const PrivacyPolicyModal = ({ visible, onClose, allowAccept = true }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { user, updateUser } = useAuthStore();
  const { colors } = useTheme();

  const handleAccept = async () => {
    if (!allowAccept) {
      // In pre-login/read-only mode, just close the modal
      onClose?.();
      return;
    }
    if (!user?.id) {
      Alert.alert("Error", "User information not found");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/accept-privacy-policy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: user.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to accept privacy policy");
      }

      // Update user in store
      await updateUser({
        ...user,
        privacyPolicyAccepted: true,
      });

      onClose();
    } catch (error) {
      console.error("Privacy policy acceptance error:", error);
      Alert.alert(
        "Error",
        "Failed to accept privacy policy. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="formSheet"
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.header,
            {
              borderBottomColor: colors.border,
              backgroundColor: colors.surface,
            },
          ]}
        >
          <Text style={[styles.title, { color: colors.text }]}>
            Data Privacy Policy
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Philippines
          </Text>
        </View>

        <ScrollView
          style={[styles.content]}
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={true}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Data Privacy Notice
          </Text>

          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            The CyberLearn Gamified Hybrid E-Learning Application ("CyberLearn", "the Application", "we", "our") is developed under the Bachelor of Science in Information Technology program of Lyceum of the Philippines University – Cavite. We value your privacy and are committed to protecting your personal data while you use our platform.
          </Text>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Information We Collect
          </Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            As part of the study entitled "CyberLearn: Development of a Gamified Hybrid E-Learning Application for Empowerment Technologies in LPU Cavite," the Application may collect certain basic information from you, including:
            {"\n"}• Your Name
            {"\n"}• Grade Level/Section
            {"\n"}• Role (Student/Instructor/Administrator)
            {"\n"}• Your interactions or responses within the Application (e.g., quiz results, game experience points)
          </Text>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Data Security and Protection
          </Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            We implement appropriate security measures to protect your information from unauthorized access, misuse, loss, or any form of unlawful processing. Your personal data will not be disclosed, shared, or transferred to any external party without your explicit consent. All study findings or published outputs will be aggregated and anonymized, ensuring that no user can be personally identified.
          </Text>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Data Retention
          </Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            Your information will only be retained for as long as needed to support the functionality of the Application and to complete the academic research.
          </Text>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Application Management
          </Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            The Application is managed by the Capstone Project 2 Research Team of LPU Cavite. For questions or concerns regarding your data or the Application, you may contact:
            {"\n"}• john.bathan1@lpunetwork.edu.ph
            {"\n"}• zunder.pacis@lpunetwork.edu.ph
            {"\n"}• alexander.perez@lpunetwork.edu.ph
          </Text>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Data Protection Office Contact
          </Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            For data-privacy-specific concerns or to exercise your rights under the Data Privacy Act of 2012, you may email the LPU Cavite Data Protection Office at:
            {"\n"}privacy.cavite@lpu.edu.ph
          </Text>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Your Rights Under the Data Privacy Act
          </Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            Under the Data Privacy Act of 2012, you have the right to:
            {"\n"}• Be informed about the collection and processing of your personal data
            {"\n"}• Access your personal information
            {"\n"}• Correct inaccurate or incomplete data
            {"\n"}• Request deletion of your personal information
            {"\n"}• File a complaint with the National Privacy Commission
          </Text>

          <Text
            style={[
              styles.acknowledgment,
              {
                color: colors.text,
                backgroundColor: colors.surface,
                borderLeftColor: colors.primary,
              },
            ]}
          >
            By using the CyberLearn Application, you acknowledge that you have read, understood, and agree to this Data Privacy Notice.
          </Text>
        </ScrollView>

        <View
          style={[
            styles.buttonContainer,
            { borderTopColor: colors.border, backgroundColor: colors.surface },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.button,
              allowAccept
                ? { backgroundColor: colors.success }
                : { backgroundColor: colors.border },
            ]}
            onPress={handleAccept}
            disabled={isLoading}
          >
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "bold" }}>
              {allowAccept
                ? isLoading
                  ? "Processing..."
                  : "I Accept"
                : "Close"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    backgroundColor: "#f8f9fa",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2c3e50",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#7f8c8d",
    textAlign: "center",
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2c3e50",
    marginTop: 20,
    marginBottom: 10,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    color: "#34495e",
    marginBottom: 15,
    textAlign: "justify",
  },
  acknowledgment: {
    fontSize: 14,
    lineHeight: 22,
    color: "#2c3e50",
    marginTop: 20,
    marginBottom: 20,
    padding: 15,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#3498db",
    fontWeight: "500",
  },
  buttonContainer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    backgroundColor: "#f8f9fa",
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
});

export default PrivacyPolicyModal;
