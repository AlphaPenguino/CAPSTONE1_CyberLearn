import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
  Platform
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { API_URL } from '../../../constants/api';
import { useAuthStore } from '../../../store/authStore';
import COLORS from '@/constants/custom-colors';

export default function EditModule() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { token } = useAuthStore();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [image, setImage] = useState(null);
  const [imageChanged, setImageChanged] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);

  // Fetch module data
  useEffect(() => {
    fetchModuleData();
  }, [id]);

  const fetchModuleData = async () => {
    try {
      setLoading(true);
      //console.log(`Fetching module with ID: ${id}`);
      //console.log(`Using token: ${token?.substring(0, 10)}...`);
      
      const response = await fetch(`${API_URL}/modules/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Log response status
      //console.log(`Response status: ${response.status}`);
      const data = await response.json();
      //console.log(`Response data:`, data);

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch module data');
      }

      setTitle(data.title);
      setDescription(data.description);
      setCategory(data.category || '');
      setImage(data.image);
    } catch (error) {
      console.error('Error fetching module:', error);
      setError(error.message || 'Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Pick an image from the library
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setImage(result.assets[0].uri);
        setImageChanged(true);
      }
    } catch (error) {
      console.log('Error picking image:', error);
      alert('Failed to select image.');
    }
  };

  // Convert image to base64 for upload
  const convertImageToBase64 = async (uri) => {
    // Skip conversion if already a remote URL
    if (uri.startsWith('http')) {
      return uri;
    }
    
    try {
      // For React Native
      if (Platform.OS !== 'web') {
        const response = await fetch(uri);
        const blob = await response.blob();
        
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } 
      // For web
      else {
        return new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'Anonymous';
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const dataURL = canvas.toDataURL('image/jpeg');
            resolve(dataURL);
          };
          img.src = uri;
        });
      }
    } catch (error) {
      console.log('Error converting image:', error);
      throw error;
    }
  };

  // Submit the form
  const handleSubmit = async () => {
    if (!title.trim()) {
      alert('Title is required');
      return;
    }

    try {
      setUpdating(true);
      
      // Create request body as JSON instead of FormData
      const updateData = {
        title,
        description,
        category
      };
      
      // Only include image if it changed and is a new upload
      if (imageChanged) {
        // Convert image to base64 for upload
        const base64Image = await convertImageToBase64(image);
        updateData.image = base64Image;
      }

      // Make API request
      const response = await fetch(`${API_URL}/modules/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update module');
      }

      // Success
      if (Platform.OS === 'web') {
        alert('Module updated successfully!');
      } else {
        Alert.alert('Success', 'Module updated successfully!');
      }
      router.back();
    } catch (error) {
      console.error('Error updating module:', error);
      alert(`Failed to update module: ${error.message}`);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading module data...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color={COLORS.error} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.button} onPress={fetchModuleData}>
          <Text style={styles.buttonText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ 
        title: "Edit Module",
        headerStyle: { backgroundColor: '#0a1929' },
        headerTintColor: '#ffffff',
      }} />
      
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.label}>Module Title</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Enter module title"
          placeholderTextColor="#666"
        />
        
        <Text style={styles.label}>Category</Text>
        <TextInput
          style={styles.input}
          value={category}
          onChangeText={setCategory}
          placeholder="Enter category (optional)"
          placeholderTextColor="#666"
        />
        
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Enter module description"
          placeholderTextColor="#666"
          multiline
          numberOfLines={4}
        />
        
        <Text style={styles.label}>Module Image</Text>
        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
          {image ? (
            <Image source={{ uri: image }} style={styles.imagePreview} />
          ) : (
            <View style={styles.imagePreviewPlaceholder}>
              <Ionicons name="image-outline" size={40} color="#888" />
              <Text style={styles.placeholderText}>Tap to select an image</Text>
            </View>
          )}
        </TouchableOpacity>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.cancelButton]} 
            onPress={() => router.back()}
            disabled={updating}
          >
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, updating && styles.buttonDisabled]} 
            onPress={handleSubmit}
            disabled={updating}
          >
            {updating ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Update Module</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1929',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a1929',
  },
  loadingText: {
    marginTop: 16,
    color: '#fff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a1929',
    padding: 20,
  },
  errorText: {
    color: COLORS.error,
    marginTop: 12,
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: '#1976d2',
    borderRadius: 8,
    color: '#fff',
    fontSize: 16,
    padding: 12,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  imagePicker: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#1976d2',
    borderRadius: 8,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  imagePreviewPlaceholder: {
    width: '100%',
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  placeholderText: {
    color: '#888',
    marginTop: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 32,
  },
  button: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    marginTop: 16,
  },
  backButtonText: {
    color: COLORS.primary,
  },
});