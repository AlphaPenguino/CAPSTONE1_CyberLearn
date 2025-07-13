import { 

  View, 
  Text,
  SafeAreaView, 
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator

  } from 'react-native'
import { useState } from 'react'
import { SegmentedButtons, TextInput } from 'react-native-paper'
import COLORS from '@/constants/custom-colors';
import styles from '../../assets/styles/acreate.styles.js';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/store/authStore.js';
import { API_URL } from '@/constants/api.js';
import * as ImageManipulator from 'expo-image-manipulator';

export default function Create() {
  const [value, setValue] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const { token } = useAuthStore();

  const pickImage = async () => {
    try {
      // For web platform
      if (Platform.OS === 'web') {
        // Create an input element
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          
          // Check file size - reject if too large
          if (file.size > 5000000) { // 5MB
            alert("Image too large. Please select a smaller image or compress it first.");
            return;
          }
          
          // Compress image using canvas before converting to base64
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 800;
            const scaleSize = MAX_WIDTH / img.width;
            canvas.width = MAX_WIDTH;
            canvas.height = img.height * scaleSize;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            // Get compressed data URL
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.6);
            
            // Set image for preview
            setImage(compressedDataUrl);
            
            // Extract base64 without prefix
            const base64data = compressedDataUrl.split(',')[1];
            setImageBase64(base64data);
            
            console.log("Web image compressed and converted, length:", base64data.length);
          };
          
          img.src = URL.createObjectURL(file);
        };
        input.click();
      } else {
        if (Platform.OS !== 'web') {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

          console.log("Media Library Permission Status: ", status);
          if (status !== 'granted') {
            Alert.alert('Permission to access camera roll is required!');
            return;
          }
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: "images",
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.5, // Already reduced quality, good
          base64: true,
        });

        if (!result.canceled) {
          // Compress image before using it
          const asset = result.assets[0];
          
          try {
            // Use ImageManipulator for additional compression
            const compressedImage = await ImageManipulator.manipulateAsync(
              asset.uri,
              [{ resize: { width: 800 } }], // Resize to reasonable dimensions
              { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
            );
            
            setImage(compressedImage.uri);
            
            // Get base64 of compressed image
            const base64 = await FileSystem.readAsStringAsync(
              compressedImage.uri, 
              { encoding: FileSystem.EncodingType.Base64 }
            );
            
            setImageBase64(base64);
            console.log("Image compressed and converted to base64, length:", base64.length);
          } catch (compressionError) {
            console.error("Error compressing image:", compressionError);
            // Fallback to original image
            setImage(asset.uri);
            setImageBase64(asset.base64);
          }
        } else {
          console.log("Image picking was canceled");
        }
      }
    } catch (error) {
      console.error("Error picking image: ", error);
      if (Platform.OS === 'web') {
        alert("Failed to pick image.");
      } else {
        Alert.alert("Error", "Failed to pick image.");
      }
    }
  }

  const handleSubmit = async () => {
    // Form validation
    if (!title || !description || !category || !imageBase64) {
      if (Platform.OS === 'web') {
        alert("Please fill in all fields and select an image.");
      } else {
        Alert.alert("Error", "Please fill in all fields and select an image.");
      }
      return;
    }
    
    try {
      setLoading(true);
      
      // Add safety check for image
      if (!image) {
        throw new Error("Image not found. Please select an image again.");
      }
      
      const uriParts = image.split('.');
      const fileType = uriParts[uriParts.length - 1];
      const imageType = fileType ? `image/${fileType.toLowerCase()}` : "image/jpeg";

      const imageDataUrl = imageBase64.startsWith('data:image') 
      ? imageBase64 
      : `data:image/jpeg;base64,${imageBase64}`;
      
      console.log("Preparing to upload to:", `${API_URL}/modules`);
      
      const response = await fetch(`${API_URL}/modules`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          category,
          image: imageDataUrl,
        }),
      });

      // Safer JSON parsing with error handling
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error("Failed to parse response:", parseError);
        throw new Error("Server returned an invalid response");
      }
      
      if (!response.ok) {
        // Safe error handling with optional chaining
        throw new Error(data?.message || 'Failed to create module');
      }
      console.log("Image data format check:", 
      imageBase64.substring(0, 30) + "...",
      "Length:", imageBase64.length);
      Alert.alert("Success", "Module created successfully!");
      setTitle('');
      setDescription('');
      setCategory('');
      setImage(null);
      setImageBase64(null);
      router.push('/(tabs)');

    } catch (error) {
      // Safe error handling - don't assume error.message exists
      console.error("Error submitting form:", error);
      
      const errorMessage = error && typeof error.message === 'string' 
        ? error.message 
        : "Failed to create module. Please try again.";
        
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderForm = () => {
    
    switch(value) {
      case 'module':
        return (
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <ScrollView 
              style={styles.scrollView}
              contentContainerStyle={{paddingBottom: 40}}>
              
              <View style={styles.formContainer}>
                <View style={styles.card}>
                  <View style={styles.header}>
                    <Text style={styles.title}>Create Module</Text>
                  </View>
                    <View style={styles.inputContainer}>
                      
                      <TextInput
                        label="Title"
                        value={title}
                        onChangeText={setTitle}
                        mode="outlined"
                        style={styles.input}
                        outlineColor={COLORS.border}
                        activeOutlineColor={COLORS.primary}
                        textColor={COLORS.primary} // Add this line to change text color
                      />

                      <TextInput
                        label="Description"
                        value={description}
                        onChangeText={setDescription}
                        mode="outlined"
                        style={styles.input}
                        multiline
                        numberOfLines={4}
                        outlineColor={COLORS.border}
                        activeOutlineColor={COLORS.primary}
                        textColor={COLORS.primary}
                      />

                      <TextInput
                        label="Category"
                        value={category}
                        onChangeText={setCategory}
                        mode="outlined"
                        style={styles.input}
                        outlineColor={COLORS.border}
                        activeOutlineColor={COLORS.primary}
                        textColor={COLORS.primary}
                      />
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Image</Text>
                      <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                        {image ? 
                        (
                          <Image source={{ uri: image }} style={styles.previewImage} />
                        
                        ):(

                          <View style={styles.placeholderContainer}>
                            <Ionicons name="image-outline" size={24} color={COLORS.textSecondary} />
                            <Text style={styles.placeholderText}>Pick an image</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    </View>

                    
                     <TouchableOpacity style={styles.button} onPress={handleSubmit}
                        disabled={loading}>
                        {loading ? (
                        <ActivityIndicator color="#fff" />
                        ) : (
                        <View style={styles.buttonContent}>
                          <Ionicons 
                            name="cloud-upload-outline" 
                            size={24} 
                            color={COLORS.white} 
                            style={styles.buttonIcon} 
                          />
                          <Text style={styles.buttonText}>Submit</Text>
                        </View>
                        )}
                      </TouchableOpacity>
                    
                </View>
                
                
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        );
      case 'content':
        return (
          <View style={styles.formContainer}>
            <Text>Content Form</Text>
          </View>
        );
      case 'rewards':
        return (
          <View style={styles.formContainer}>
            <Text>Goals Form</Text>
          </View>
        );
      default:
        return null;
    }
    
  };
  return (
    <SafeAreaView style={styles.container }>
      <SegmentedButtons
        value={value}
        onValueChange={setValue}
        style={styles.group}
        buttons={[
          {
            value: 'module',
            label: 'Module',
            style: styles.segmentButton,
            // This will style the selected button differently
            showSelectedCheck: false,
            // Apply conditional styling based on selection state
            buttonStyle: ({checked}) => ({
              backgroundColor: checked ? COLORS.primaryLight : 'transparent',
              borderColor: checked ? COLORS.primary : COLORS.border,
            }),
            checkedColor: COLORS.white,
            uncheckedColor: COLORS.textSecondary,
          },
          {
            value: 'content',
            label: 'Content',
            style: styles.segmentButton,
            showSelectedCheck: false,
            buttonStyle: ({checked}) => ({
              backgroundColor: checked ? COLORS.primaryLight : 'transparent',
              borderColor: checked ? COLORS.primary : COLORS.border,
            }),
            checkedColor: COLORS.white,
            uncheckedColor: COLORS.textSecondary,
          },
          {
            value: 'rewards',
            label: 'Rewards',
            style: styles.segmentButton,
            showSelectedCheck: false,
            buttonStyle: ({checked}) => ({
              backgroundColor: checked ? COLORS.primaryLight : 'transparent',
              borderColor: checked ? COLORS.primary : COLORS.border,
            }),
            checkedColor: COLORS.white,
            uncheckedColor: COLORS.textSecondary,
          },
        ]}
      />
      {renderForm()}
    </SafeAreaView>
  )
}


