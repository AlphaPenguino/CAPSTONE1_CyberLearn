import { 

  Text, 
  View, 
  Image, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform

} from 'react-native'

import { Link, useRouter } from 'expo-router';
import styles from "../../../assets/styles/login.styles.js";
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../../../constants/custom-colors.js';



export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();

  const handleLogin = () => {

    fetch('http://localhost:3000/api/auth/login', {

    });

  }

  return (
    <KeyboardAvoidingView
      style={{flex:1}}
      behavior={Platform.OS === "ios" ? "padding" : "height"}>
    <View style={styles.container}>
      <View style={styles.topIllustration}>
        
        <Image
          source={require("../../../assets/images/cyberlearn-logo-transparent.png")}
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

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don&apos;t have an account?</Text>
            <Link href="/(auth)/signup" asChild>
              <TouchableOpacity>
                <Text style={styles.link}>Sign Up</Text>
              </TouchableOpacity>
            </Link>
          </View>
            
        </View>


      </View>
    </View>
    </KeyboardAvoidingView>
  )
}
