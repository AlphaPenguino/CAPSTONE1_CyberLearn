// File: app/(tabs)/settingsConfig.jsx

import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { API_URL } from '@/constants/api';
import COLORS from '@/constants/custom-colors';

// Helper for cross-platform alerts
const showAlert = (title, message, buttons = [{ text: 'OK' }]) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n${message}`);
  } else {
    Alert.alert(title, message, buttons);
  }
};

export default function SettingsConfig() {
  const { token } = useAuthStore();
  const router = useRouter();
  
  // Added a state for the original password
  const [originalPassword, setOriginalPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    // Added validation for original password
    if (!originalPassword || !newPassword || !confirmPassword) {
      showAlert('Validation Error', 'Please fill in all password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showAlert('Validation Error', 'New password and confirm password do not match.');
      return;
    }
    if (newPassword.length < 6) {
      showAlert('Validation Error', 'New password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/users/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          originalPassword,
          newPassword,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        showAlert('Success', 'Password changed successfully!');
        setOriginalPassword('');
        setNewPassword('');
        setConfirmPassword('');
        // Optionally, navigate back or to another screen
        router.push('/');
      } else {
        showAlert('Error', result.message || 'Failed to change password. Please check your current password.');
      }
    } catch (error) {
      console.error('Password change error:', error);
      showAlert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.mainContent}>
          <Text style={styles.screenTitle}>Settings</Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Change Password</Text>

            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Original Password:</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter original password"
                secureTextEntry
                value={originalPassword}
                onChangeText={setOriginalPassword}
              />
            </View>

            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>New Password:</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter new password"
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
              />
            </View>

            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Confirm New Password:</Text>
              <TextInput
                style={styles.input}
                placeholder="Confirm new password"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleChangePassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.actionButtonText}>Change Password</Text>
              )}
            </TouchableOpacity>
          </View>
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
    maxWidth: 600,
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 16,
    color: COLORS.textPrimary,
    marginRight: 10,
    flex: 1,
    fontWeight: '600'
  },
  input: {
    flex: 2,
    backgroundColor: COLORS.inputBackground || COLORS.cardBackground,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 15,
    fontSize: 16,
    color: COLORS.textPrimary,
    borderColor: COLORS.border,
    borderWidth: 1,
  },
  actionButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
