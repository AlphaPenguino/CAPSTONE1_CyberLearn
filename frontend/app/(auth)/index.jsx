import { 

  Text, 
  View, 
  Image, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert

} from 'react-native'

import { Link, useRouter } from 'expo-router';
import styles from "../../assets/styles/login.styles.js";
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../../constants/custom-colors.js';
import { useEffect } from 'react';
import { useAuthStore } from '../../store/authStore.js';



export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { user, isLoading, login, token, sayHello } = useAuthStore();
  const router = useRouter();

  const handleLogin = async () => {
    sayHello();
    const result = await login(email, password);
    
    if (!result.success) {
      if (Platform.OS === 'web') {
        alert(result.error);
      } else {
        Alert.alert('Login Error', result.error);
      }
    }
    if (result.success) {
      Alert.alert('Login Successful', 'Welcome back!');
      router.replace('/(tabs)');
    }
     
  };

  return (
    <KeyboardAvoidingView
      style={{flex:1}}
      behavior={Platform.OS === "ios" ? "padding" : "height"}>
    <View style={styles.container}>
      <View style={styles.topIllustration}>
        <Text style={styles.title}>EmpTech</Text>
        <Image
          source={require("../../assets/images/character1.png")}
          style={styles.illustrationImage}
          resizeMode= 'contain'
        />
        
      </View>

      <View style={styles.card}>
        <View style={styles.formContainer}>
          {/*Email is here*/}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputContainer}>

            
              <Ionicons
                name="mail-outline"
                size={20}
                color= {COLORS.primary}
                style={styles.inputIcon}
              />

              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor={COLORS.placeholderText}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              
            </View>
          </View>
          
          {/*Password is here*/}
          <View styles={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputContainer}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={COLORS.primary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor={COLORS.placeholderText}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <Ionicons
                name={showPassword ? "eye-outline" : "eye-off-outline"}
                size={20}
                color={COLORS.primary}
                onPress={() => setShowPassword(!showPassword)}
                style={styles.inputIcon}
              />
            </View>
            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>forgot password?</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.button} onPress={handleLogin}
          disabled={isLoading}>
            {isLoading ? (
            <ActivityIndicator color="#fff" />
            ) : ( 
            <Text style={styles.buttonText}>Login</Text>
            )}
          </TouchableOpacity>

            
        </View>


      </View>
    </View>
    </KeyboardAvoidingView>
  )
}
