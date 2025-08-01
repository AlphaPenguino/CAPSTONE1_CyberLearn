// File: app/(tabs)/profile.jsx

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, TextInput, ActivityIndicator, Alert, Platform, ScrollView } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import COLORS from '@/constants/custom-colors';
import { useAuthStore } from '../../store/authStore';
import { API_URL } from '@/constants/api';
import { useRouter } from 'expo-router';

// Re-implement showAlert to match the new behavior
const showAlert = (title, message, buttons = [{ text: 'OK' }]) => {
  if (Platform.OS === 'web') {
    if (buttons.length <= 1) {
      window.alert(`${title}\n${message}`);
    } else {
      const confirmed = window.confirm(`${title}\n${message}`);
      if (confirmed) {
        const confirmButton = buttons.find(button => button.style === 'destructive' || button.text === 'OK');
        confirmButton?.onPress?.();
      } else {
        const cancelButton = buttons.find(button => button.style === 'cancel');
        cancelButton?.onPress?.();
      }
    }
  } else {
    Alert.alert(title, message, buttons);
  }
};

export default function Profile() {
  const { user, token, updateUser } = useAuthStore();
  const router = useRouter();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [studentId, setStudentId] = useState('');
  const [profileImageUri, setProfileImageUri] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setUsername(user.username || '');
      setPhoneNumber(user.phoneNumber || '');
      setStudentId(user.studentId || '');
      setProfileImageUri(user.profileImage || '');
    }
  }, [user]);

  const getCompatibleImageUrl = (url) => {
    if (!url) return null;
    if (url.includes('dicebear') && url.includes('/svg')) {
      if (Platform.OS === 'android') {
        return url.replace('/svg', '/png');
      }
    }
    return url;
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permission Required', 'We need camera roll permissions to make this work!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setProfileImageUri(result.assets[0].uri);
      setImageError(false);
    }
  };

  const handleWebImageSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImageUri(reader.result);
        setImageError(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    if (!firstName || !lastName || !username || !studentId) {
      showAlert('Validation Error', 'First Name, Last Name, Username, and ID Number are required.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstName,
          lastName,
          username,
          phoneNumber,
          studentId,
          profileImage: profileImageUri,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update profile.');
      }

      const updatedUserData = await response.json();
      updateUser(updatedUserData.user);

      showAlert('Success', 'Profile updated successfully!', [{
        text: 'OK',
        onPress: () => router.back(),
      }]);
    } catch (error) {
      console.error('Error updating profile:', error);
      showAlert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.mainContent}>
          <Text style={styles.screenTitle}>Edit Profile</Text>

          <View style={styles.profileImageContainer}>
            {profileImageUri && !imageError ? (
              <Image
                source={{ uri: getCompatibleImageUrl(profileImageUri) }}
                style={styles.profileImage}
                onError={() => setImageError(true)}
              />
            ) : (
              <Ionicons name="person-circle-outline" size={100} color={COLORS.primary} />
            )}
            <TouchableOpacity
              style={styles.changeImageButton}
              onPress={() => {
                if (Platform.OS === 'web') {
                  fileInputRef.current?.click();
                } else {
                  pickImage();
                }
              }}
            >
              <MaterialCommunityIcons name="camera-plus-outline" size={24} color="#FFF" />
              <Text style={styles.changeImageButtonText}>Change Photo</Text>
            </TouchableOpacity>

            {Platform.OS === 'web' && (
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleWebImageSelect}
                accept="image/*"
              />
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
             <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={20} color={COLORS.textPrimary} style={styles.infoIcon} />
              <Text style={styles.infoLabel}>Email:</Text>
              <Text style={styles.infoValue}>{user?.email || 'N/A'}</Text>
            </View>
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Username:</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter Username"
                placeholderTextColor={COLORS.textSecondary}
                value={username}
                onChangeText={setUsername}
              />
            </View>
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>First Name:</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter First Name"
                placeholderTextColor={COLORS.textSecondary}
                value={firstName}
                onChangeText={setFirstName}
              />
            </View>
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Last Name:</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter Last Name"
                placeholderTextColor={COLORS.textSecondary}
                value={lastName}
                onChangeText={setLastName}
              />
            </View>
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Phone Number:</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter Phone Number"
                placeholderTextColor={COLORS.textSecondary}
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
              />
            </View>
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>ID Number:</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter ID Number"
                placeholderTextColor={COLORS.textSecondary}
                keyboardType="numeric"
                value={studentId}
                onChangeText={setStudentId}
              />
            </View>
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.saveButtonText}>Save Profile</Text>
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
  profileImageContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.background,
    borderWidth: 3,
    borderColor: COLORS.primary,
    marginBottom: 15,
  },
  changeImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 25,
    marginBottom: 10,
  },
  changeImageButtonText: {
    color: '#FFF',
    marginLeft: 8,
    fontWeight: 'bold',
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
    fontWeight: '600',
    color: COLORS.textPrimary,
    width: 120,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.inputBackground || COLORS.cardBackground,
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.textPrimary,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
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
    width: 90,
  },
  infoValue: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
});
