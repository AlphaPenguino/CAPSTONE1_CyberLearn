import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, ScrollView } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome } from '@expo/vector-icons';
import COLORS from '@/constants/custom-colors';
import { useAuthStore } from '../../store/authStore';
import { useRouter } from 'expo-router';
import { API_URL } from '@/constants/api';

// Helper function to handle image URLs for different platforms (copied for consistency)
const getCompatibleImageUrl = (url) => {
  if (!url) return null;
  if (url.includes('dicebear') && url.includes('/svg')) {
    if (Platform.OS === 'android') {
      return url.replace('/svg', '/png');
    }
  }
  return url;
};

// Component to display achievements
const StatsDisplay = ({ totalXP, totalCompletedQuizzes }) => (
  <View style={styles.statsContainer}>
    <View style={styles.statItem}>
      <Ionicons name="sparkles" size={24} color="#FFD700" />
      <View style={{ marginLeft: 8 }}>
        <Text style={styles.statValue}>{totalXP}</Text>
        <Text style={styles.statLabel}>XP</Text>
      </View>
    </View>
    <View style={styles.statItem}>
      <Ionicons name="checkmark-done-circle-outline" size={24} color={COLORS.success} />
      <View style={{ marginLeft: 8 }}>
        <Text style={styles.statValue}>{totalCompletedQuizzes}</Text>
        <Text style={styles.statLabel}>Quizzes</Text>
      </View>
    </View>
  </View>
);

export default function ViewProfile() {
  const { user, token } = useAuthStore();
  const router = useRouter();
  const [imageError, setImageError] = useState(false);
  const [totalXP, setTotalXP] = useState(0);
  const [totalCompletedQuizzes, setTotalCompletedQuizzes] = useState(0);

  // Fallback for profile image if user object doesn't have it or there's an error
  const profileImageSource = user?.profileImage && !imageError
    ? { uri: getCompatibleImageUrl(user.profileImage) }
    : null;

  // Fetch achievements data
  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        if (!token) return;
        const response = await fetch(`${API_URL}/progress/modules`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();

        const totalXPFromModules = data.reduce((sum, module) => sum + (module.totalXP || 0), 0);
        setTotalXP(totalXPFromModules);

        let completedQuizCount = 0;
        data.forEach(module => {
          if (module.completedQuizzes && Array.isArray(module.completedQuizzes)) {
            completedQuizCount += module.completedQuizzes.length;
          }
        });
        setTotalCompletedQuizzes(completedQuizCount);

      } catch (error) {
        console.error("Failed to fetch achievements:", error);
      }
    };
    fetchAchievements();
  }, [token]);


  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Main content container with max-width and centering */}
        <View style={styles.mainContent}>

          {/* Profile header section */}
          <View style={styles.header}>
            <View style={styles.profileImageContainer}>
              <Image
                source={profileImageSource || require('../../assets/images/character1.png')}
                style={styles.profileImage}
                onError={() => setImageError(true)}
              />
            </View>
            <Text style={styles.headerTitle}>Profile</Text>
          </View>

          {/* Personal Information Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={20} color={COLORS.textPrimary} style={styles.infoIcon} />
              <Text style={styles.infoLabel}>Email:</Text>
              <Text style={styles.infoValue}>{user?.email || 'N/A'}</Text>
            </View>
             <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={20} color={COLORS.textPrimary} style={styles.infoIcon} />
              <Text style={styles.infoLabel}>Username:</Text>
              <Text style={styles.infoValue}>{user?.username || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={20} color={COLORS.textPrimary} style={styles.infoIcon} />
              <Text style={styles.infoLabel}>First Name:</Text>
              <Text style={styles.infoValue}>{user?.firstName || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={20} color={COLORS.textPrimary} style={styles.infoIcon} />
              <Text style={styles.infoLabel}>Last Name:</Text>
              <Text style={styles.infoValue}>{user?.lastName || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={20} color={COLORS.textPrimary} style={styles.infoIcon} />
              <Text style={styles.infoLabel}>Phone:</Text>
              <Text style={styles.infoValue}>{user?.phoneNumber || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="card-outline" size={20} color={COLORS.textPrimary} style={styles.infoIcon} />
              <Text style={styles.infoLabel}>ID Number:</Text>
              <Text style={styles.infoValue}>{user?.studentId || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="shield-account-outline" size={20} color={COLORS.textPrimary} style={styles.infoIcon} />
              <Text style={styles.infoLabel}>Privilege:</Text>
              <Text style={styles.infoValue}>{user?.privilege || 'N/A'}</Text>
            </View>
          </View>

          {/* EDIT PROFILE BUTTON */}
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => router.push('/profile/editprofile')}
          >
            <Text style={styles.editButtonText}>Edit Profile</Text>
            <Ionicons name="create-outline" size={20} color="#FFF" style={{ marginLeft: 10 }} />
          </TouchableOpacity>

          {/* Achievements Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Achievements</Text>
            <StatsDisplay totalXP={totalXP} totalCompletedQuizzes={totalCompletedQuizzes} />
          </View>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    alignItems: 'center',
  },
  mainContent: {
    width: '100%',
    maxWidth: 700,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginTop: 10,
  },
  profileImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.background,
    borderWidth: 3,
    borderColor: COLORS.primary,
    marginBottom: 15,
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  profileInfo: {
    alignItems: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  section: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoIcon: {
    marginRight: 10,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    width: 90, // Fixed width for labels for alignment
  },
  infoValue: {
    flex: 1, // Allows value to take remaining space
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    borderRadius: 10,
    marginTop: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  editButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 18,
  },
  // Styles for the achievements section
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 10,
    borderRadius: 8,
    width: '45%',
  },
  statValue: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
});
