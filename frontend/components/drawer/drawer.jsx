import React, { useState } from 'react';
import { Modal, Portal, Text, Surface } from 'react-native-paper';
import { View, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '@/constants/custom-colors';
import { useAuthStore } from '../../store/authStore';

const CustomDrawer = ({ visible, onDismiss }) => {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [imageError, setImageError] = useState(false);
  
  const handleLogout = async () => {
    await logout();
    onDismiss();
    router.replace('/(auth)');
  };

  const DrawerItem = ({ title, icon, onPress }) => (
    <TouchableOpacity 
      style={styles.drawerItem} 
      onPress={onPress}
    >
      <Ionicons name={icon} size={24} color={COLORS.primary} />
      <Text style={styles.drawerItemText}>{title}</Text>
    </TouchableOpacity>
  );

  // Add this helper function
  const getCompatibleImageUrl = (url) => {
    if (!url) return null;
    
    // Check if it's a Dicebear SVG URL
    if (url.includes('dicebear') && url.includes('/svg')) {
      // For Android, convert to PNG
      if (Platform.OS === 'android') {
        return url.replace('/svg', '/png');
      }
    }
    return url;
  };
  
  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.drawer}
      >
        <Surface style={styles.surface}>
        <View style={styles.header}>
          {user?.profileImage ? (
            <Image 
              source={{ uri: getCompatibleImageUrl(user.profileImage) }} 
              style={styles.profileImage}
              onError={() => {
                console.log("Profile image failed to load");
                setImageError(true);
              }}
            />
          ) : (
            <Ionicons 
              name="person-circle-outline" 
              size={40} 
              color={COLORS.primary} 
            />
          )}
          <Text style={styles.title}>
            {user?.username || 'Guest'}
          </Text>
        </View>
          
          <DrawerItem
            title="Profile"
            icon="person-outline"
            onPress={() => {
              onDismiss();
              router.push('/(tabs)/profile');
            }}
          />
          
          <DrawerItem
            title="Settings"
            icon="settings-outline"
            onPress={() => {
              onDismiss();
              router.push('/(tabs)/settings');
            }}
          />

          <DrawerItem
            title="Logout"
            icon="log-out-outline"
            onPress={handleLogout}
          />
        </Surface>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 280,
    margin: 0,
    backgroundColor: 'transparent',
  },
  surface: {
    height: '100%',
    padding: 16,
    backgroundColor: COLORS.cardBackground,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 12,
    color: COLORS.textPrimary,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  drawerItemText: {
    marginLeft: 16,
    fontSize: 16,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  profileImage: {
  width: 80,
  height: 80,
  borderRadius: 80,
  backgroundColor: COLORS.background,
  borderWidth: 2,
  borderColor: COLORS.primary,
},
});

export default CustomDrawer;