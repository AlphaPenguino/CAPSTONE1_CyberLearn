import React from 'react';
import { Modal, Portal, Text, Surface, List } from 'react-native-paper';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '@/constants/custom-colors';
import { useAuthStore } from '../../store/authStore';

const CustomDrawer = ({ visible, onDismiss }) => {
  const router = useRouter();
  const { user, logout } = useAuthStore(); // Add user from useAuthStore

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

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.drawer}
      >
        <Surface style={styles.surface}>
          <View style={styles.header}>
            <Ionicons 
              name="person-circle-outline" 
              size={40} 
              color={COLORS.primary} 
            />
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
  }
});

export default CustomDrawer;