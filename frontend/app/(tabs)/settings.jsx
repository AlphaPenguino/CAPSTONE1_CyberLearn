import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '@/constants/custom-colors';
import { useAuthStore } from '../../store/authStore';
import { useRouter } from 'expo-router';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [imageError, setImageError] = useState(false);

  const getCompatibleImageUrl = (url) => {
    if (!url) return null;
    if (url.includes('dicebear') && url.includes('/svg')) {
      if (Platform.OS === 'android') {
        return url.replace('/svg', '/png');
      }
    }
    return url;
  };

  const DrawerItem = ({ title, icon, onPress }) => (
    <TouchableOpacity style={styles.drawerItem} onPress={onPress}>
      <Ionicons name={icon} size={24} color={COLORS.primary} />
      <Text style={styles.drawerItemText}>{title}</Text>
    </TouchableOpacity>
  );

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)');
  };

  return (
    <View style={styles.container}>
      {/* Main content container with max-width and centering */}
      <View style={styles.mainContent}>
        <View style={styles.header}>
          {user?.profileImage && !imageError ? (
            <Image
              source={{ uri: getCompatibleImageUrl(user.profileImage) }}
              style={styles.profileImage}
              onError={() => setImageError(true)}
            />
          ) : (
            <Ionicons name="person-circle-outline" size={64} color={COLORS.primary} />
          )}
          <Text style={styles.title}>{user?.username || 'Guest'}</Text>
        </View>

        <View style={styles.itemsContainer}>
          <DrawerItem
            title="Profile"
            icon="person-outline"
            onPress={() => router.push('/profile/profile')}
          />
          <DrawerItem
            title="Settings"
            icon="settings-outline"
            onPress={() => router.push('/(tabs)/settings')}
          />
          <DrawerItem
            title="Logout"
            icon="log-out-outline"
            onPress={handleLogout}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.cardBackground,
    // Removed padding from here, moved to mainContent
  },
  mainContent: {
    flex: 1, // Allows the content to take up available vertical space
    width: '100%', // Takes full width of its parent initially
    maxWidth: 600, // Limit the maximum width for larger screens (adjust as needed)
    alignSelf: 'center', // Center the content horizontally
    padding: 24, // Apply padding here for consistent spacing within the constrained area
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    padding: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginLeft: 16,
    color: COLORS.textPrimary,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 80,
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  itemsContainer: {
    marginTop: 8,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: COLORS.background,
    elevation: 1,
  },
  drawerItemText: {
    marginLeft: 16,
    fontSize: 16,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
});