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
import { SafeAreaView } from "react-native-safe-area-context";

export default function PrivacyPolicyPage() {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
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
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={true}
      >
        <View
          style={[
            styles.policyCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Data Privacy Notice
        </Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          The CyberLearn Gamified Hybrid E-Learning Application (&quot;CyberLearn&quot;,
          &quot;the Application&quot;, &quot;we&quot;, &quot;our&quot;) is developed under the Bachelor of
          Science in Information Technology program of Lyceum of the Philippines
          University – Cavite. We value your privacy and are committed to
          protecting your personal data while you use our platform.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Information We Collect
        </Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          As part of the study entitled &quot;CyberLearn: Development of a Gamified
          Hybrid E-Learning Application for Empowerment Technologies in LPU
          Cavite,&quot; the Application may collect certain basic information from
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
              borderColor: colors.border,
              borderLeftColor: colors.primary,
            },
          ]}
        >
          By using the CyberLearn Application, you acknowledge that you have
          read, understood, and agree to this Data Privacy Notice.
        </Text>

        {/* Back to login link */}
        <TouchableOpacity
          style={[
            styles.backToLogin,
            { borderColor: colors.primary, backgroundColor: colors.primary },
          ]}
          onPress={() => router.replace("/(auth)")}
        >
          <Ionicons name="arrow-back-circle" size={20} color="#FFFFFF" />
          <Text style={[styles.backToLoginText, { color: "#FFFFFF" }]}> 
            Back to Login
          </Text>
        </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
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
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 4,
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  policyCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 20,
    marginBottom: 10,
    textAlign: "left",
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 8,
    textAlign: "left",
    fontWeight: "500",
  },
  acknowledgment: {
    fontSize: 15,
    lineHeight: 24,
    marginTop: 20,
    marginBottom: 18,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
    fontWeight: "600",
    textAlign: "left",
  },
  backToLogin: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 6,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  backToLoginText: {
    fontSize: 15,
    fontWeight: "700",
  },
});