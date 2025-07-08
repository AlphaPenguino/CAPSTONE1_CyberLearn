import React from 'react';
import { Modal, Portal, Text, Surface, List } from 'react-native-paper';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import COLORS from '@/constants/custom-colors';
import { useAuthStore } from '../../store/authStore';

const CustomDrawer = ({ visible, onDismiss }) => {
  const router = useRouter();
  const { logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    onDismiss();
    router.replace('/(auth)');
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.drawer}
      >
        <Surface style={styles.surface}>
          <Text style={styles.title}>Menu</Text>
          
          <List.Item
            title="Profile"
            titleStyle={{ color: COLORS.textPrimary }}
            left={props => <List.Icon {...props} icon="account" color={COLORS.primary} />}
            onPress={() => {
              onDismiss();
              router.push('/(tabs)/profile');
            }}
          />
          
          <List.Item
            title="Settings"
            titleStyle={{ color: COLORS.textPrimary }}
            left={props => <List.Icon {...props} icon="cog" color={COLORS.primary} />}
            onPress={() => {
              onDismiss();
              router.push('/(tabs)/settings');
            }}
          />

          <List.Item
            title="Logout"
            titleStyle={{ color: COLORS.textPrimary}}
            left={props => <List.Icon {...props} icon="logout" color={COLORS.primary} />}
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
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: COLORS.textPrimary,
  }
});

export default CustomDrawer;