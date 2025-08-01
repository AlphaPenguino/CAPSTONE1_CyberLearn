import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, ScrollView } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome } from '@expo/vector-icons'; // <-- ADD FontAwesome
import COLORS from '@/constants/custom-colors'; // Adjust path if needed
import { useAuthStore } from '../../store/authStore'; // Adjust path if needed
import { useRouter } from 'expo-router';

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

// <-- NEW: Badge component to display each badge
const Badge = ({ name, icon }) => (
  <View style={styles.badge}>
    <FontAwesome name={icon} size={30} color={COLORS.success} />
    <Text style={styles.badgeName}>{name}</Text>
  </View>
);
// END NEW -->

export default function ViewProfile() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [imageError, setImageError] = useState(false);

  // Fallback for profile image if user object doesn't have it or there's an error
  const profileImageSource = user?.profileImage && !imageError
    ? { uri: getCompatibleImageUrl(user.profileImage) }
    : null;

  // <-- NEW: Mock data for student badges (replace with API data)
  const studentBadges = [
    { name: 'First Assignment', icon: 'certificate' },
    { name: 'Module 1 Complete', icon: 'star' },
    { name: 'Perfect Attendance', icon: 'trophy' },
    { name: 'Top Performer', icon: 'fire' },
  ];
  // END NEW -->


  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Main content container with max-width and centering */}
        <View style={styles.mainContent}>
          <Text style={styles.screenTitle}>My Profile</Text>

          {/* Profile Picture Display */}
          <View style={styles.profileImageContainer}>
            {profileImageSource ? (
              <Image
                source={profileImageSource}
                style={styles.profileImage}
                onError={() => setImageError(true)}
              />
            ) : (
              <Ionicons name="person-circle-outline" size={120} color={COLORS.primary} />
            )}
            <Text style={styles.username}>{user?.username || 'Guest User'}</Text>
            <Text style={styles.email}>{user?.email || 'No email provided'}</Text>
          </View>

          {/* Personal Information Display */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="account" size={20} color={COLORS.textSecondary} style={styles.infoIcon} />
              <Text style={styles.infoLabel}>Full Name:</Text>
              <Text style={styles.infoValue}>{`${user?.firstName || 'N/A'} ${user?.lastName || ''}`.trim()}</Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="phone" size={20} color={COLORS.textSecondary} style={styles.infoIcon} />
              <Text style={styles.infoLabel}>Phone:</Text>
              <Text style={styles.infoValue}>{user?.phoneNumber || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="badge-account" size={20} color={COLORS.textSecondary} style={styles.infoIcon} />
              <Text style={styles.infoLabel}>Role:</Text>
              <Text style={styles.infoValue}>{user?.privilege ? user.privilege.charAt(0).toUpperCase() + user.privilege.slice(1) : 'N/A'}</Text>
            </View>
          </View>

          {/* <-- NEW: Conditional rendering for the badge section --> */}
          {user?.privilege === 'student' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Badges</Text>
              <View style={styles.badgesContainer}>
                {studentBadges.map((badge, index) => (
                  <Badge key={index} name={badge.name} icon={badge.icon} />
                ))}
              </View>
            </View>
          )}
          {/* END NEW --> */}

          {/* Edit Profile Button */}
          <TouchableOpacity 
            style={styles.editButton} 
            onPress={() => router.push('/(tabs)/profile')} // Redirects to the editable profile page
          >
            <MaterialCommunityIcons name="account-edit-outline" size={24} color="#FFF" />
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.cardBackground,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainContent: {
    width: '100%',
    maxWidth: 600, // Consistent max-width for contained layout
    alignSelf: 'center',
    padding: 24,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 30,
    textAlign: 'center',
  },
  profileImageContainer: {
    alignItems: 'center',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  profileImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: COLORS.background,
    borderWidth: 4,
    borderColor: COLORS.primary,
    marginBottom: 15,
  },
  username: {
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
    backgroundColor: COLORS.background,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 18,
    marginLeft: 10,
  },
  // <-- NEW: Styles for the badge section -->
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 10,
  },
  badge: {
    alignItems: 'center',
    margin: 10,
    padding: 10,
    backgroundColor: COLORS.inputBackground,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  badgeName: {
    marginTop: 5,
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  // END NEW -->
});