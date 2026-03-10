import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";

export default function PrivacyPolicyPage() {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            borderBottomColor: colors.border,
            backgroundColor: colors.surface,
          },
        ]}
      >
        {/* Back button - only show if not accessed directly via URL */}
        {router.canGoBack?.() && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
        )}

        <View style={styles.headerTextContainer}>
          <Text style={[styles.title, { color: colors.text }]}>
            Data Privacy Policy
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            CyberLearn Application
          </Text>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 48 }}
        showsVerticalScrollIndicator={true}
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Data Privacy Notice
        </Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          The CyberLearn Gamified Hybrid E-Learning Application ("CyberLearn",
          "the Application", "we", "our") is developed under the Bachelor of
          Science in Information Technology program of Lyceum of the Philippines
          University – Cavite. We value your privacy and are committed to
          protecting your personal data while you use our platform.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Information We Collect
        </Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          As part of the study entitled "CyberLearn: Development of a Gamified
          Hybrid E-Learning Application for Empowerment Technologies in LPU
          Cavite," the Application may collect certain basic information from
          you, including:{"\n"}• Your Name{"\n"}• Grade Level/Section{"\n"}•
          Role (Student/Instructor/Administrator){"\n"}• Your interactions or
          responses within the Application (e.g., quiz results, game experience
          points)
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Data Security and Protection
        </Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          We implement appropriate security measures to protect your information
          from unauthorized access, misuse, loss, or any form of unlawful
          processing. Your personal data will not be disclosed, shared, or
          transferred to any external party without your explicit consent. All
          study findings or published outputs will be aggregated and anonymized,
          ensuring that no user can be personally identified.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Data Retention
        </Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          Your information will only be retained for as long as needed to
          support the functionality of the Application and to complete the
          academic research.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Application Management
        </Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          The Application is managed by the Capstone Project 2 Research Team of
          LPU Cavite. For questions or concerns regarding your data or the
          Application, you may contact:{"\n"}•
          john.bathan1@lpunetwork.edu.ph{"\n"}•
          zunder.pacis@lpunetwork.edu.ph{"\n"}•
          alexander.perez@lpunetwork.edu.ph
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Data Protection Office Contact
        </Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          For data-privacy-specific concerns or to exercise your rights under
          the Data Privacy Act of 2012, you may email the LPU Cavite Data
          Protection Office at:{"\n"}privacy.cavite@lpu.edu.ph
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Your Rights Under the Data Privacy Act
        </Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          Under the Data Privacy Act of 2012, you have the right to:{"\n"}• Be
          informed about the collection and processing of your personal data
          {"\n"}• Access your personal information{"\n"}• Correct inaccurate or
          incomplete data{"\n"}• Request deletion of your personal information
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
          By using the CyberLearn Application, you acknowledge that you have
          read, understood, and agree to this Data Privacy Notice.
        </Text>

        {/* Back to login link */}
        <TouchableOpacity
          style={[styles.backToLogin, { borderColor: colors.primary }]}
          onPress={() => router.replace("/(auth)")}
        >
          <Ionicons name="arrow-back-circle" size={20} color={colors.primary} />
          <Text style={[styles.backToLoginText, { color: colors.primary }]}>
            Back to Login
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: Platform.OS === "android" ? 40 : 20,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 8,
    textAlign: "center",
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 14,
    textAlign: "center",
  },
  acknowledgment: {
    fontSize: 14,
    lineHeight: 22,
    marginTop: 20,
    marginBottom: 20,
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    fontWeight: "500",
    textAlign: "center",
  },
  backToLogin: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
    gap: 8,
  },
  backToLoginText: {
    fontSize: 15,
    fontWeight: "600",
  },
});