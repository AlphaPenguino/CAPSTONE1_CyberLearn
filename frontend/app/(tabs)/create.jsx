import { 

  View, 
  Text,
  SafeAreaView, 
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert

  } from 'react-native'
import { useState } from 'react'
import { SegmentedButtons, TextInput } from 'react-native-paper'
import COLORS from '@/constants/custom-colors';
import styles from '../../assets/styles/acreate.styles.js';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

export default function Create() {
  const [value, setValue] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [image, setImage] = useState(null);
  
  const router = useRouter();

  const pickImage = async () => {
    try {

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
        quality: 0.7,
        base64: true,
      });
      if (!result.canceled) {
        
        setImage(result.assets[0].uri);

        if(result.assets[0].base64) {
          setImageBase64(result.assets[0].base64);
        } else {
          const base64 = await FileSystem.readAsStringAsync(result.assets[0].uri, {
            encoding: FileSystem.EncodingType.Base64,

          });

          setImageBase64(base64);
        }
      } else {
        console.log("Image picking was canceled");
      }
    } catch (error) {
      console.error("Error picking image: ", error);
      Alert.alert("Error", "Failed to pick image.");
    }
  }

  const handleSubmit = async () => {

  }

  const renderForm = () => {
    
    switch(value) {
      case 'module':
        return (
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behaviopr={Platform.OS === "ios" ? "padding" : "height"}>
            <ScrollView contentContainerStyle={styles.formContainer} styles={styles.scrollView}>
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
                  />

                  <TextInput
                    label="Category"
                    value={category}
                    onChangeText={setCategory}
                    mode="outlined"
                    style={styles.input}
                    outlineColor={COLORS.border}
                    activeOutlineColor={COLORS.primary}
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
              </View>
              {/* Add more module form fields here */}
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
            style: styles.button,
            checkedColor: COLORS.white,
            uncheckedColor: COLORS.textSecondary,
          },
          {
            value: 'content',
            label: 'Content',
            style: styles.button,
            checkedColor: COLORS.white,
            uncheckedColor: COLORS.textSecondary,
          },
          {
            value: 'rewards',
            label: 'Rewards',
            style: styles.button,
            checkedColor: COLORS.white,
            uncheckedColor: COLORS.textSecondary,
          },
        ]}
      />
      {renderForm()}
    </SafeAreaView>
  )
}


