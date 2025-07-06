import {

  Text, 
  View,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert

 } from 'react-native'

import { Link, useRouter } from 'expo-router';
import styles from "../../../assets/styles/signup.styles.js";
import COLORS from '../../../constants/custom-colors.js';
import { use, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../store/authStore.js';

export default function Signup() {

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { user, isLoading, register } = useAuthStore();

  const router = useRouter();

  const handleSignup = async () => {

    
    const result = await register(username, email, password);

    if (!result.success) Alert.alert("Signup Failed", result.error || "An error occurred during signup");
    
    
  };
  return (
    <KeyboardAvoidingView
      style={{flex: 1}}
      behavior={Platform.OS === "ios" ? "padding" : "height"}>

        <View style={styles.container}>
          <View style={styles.card}>
            
            <View style={styles.header}>
              <Text style={styles.title}>CyberLearn yo?</Text>
              <Text style={styles.subtitle}>Empowerment Technologies E-learning App</Text>
            </View>

            <View style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color={COLORS.primary}
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

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Username</Text>
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color={COLORS.primary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your username"
                    placeholderTextColor={COLORS.placeholderText}
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                  />
                </View>
              </View>
              
              {/* Password Input */}
              <View style={styles.inputGroup}>
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
                          placeholder="Create a password"
                          placeholderTextColor={COLORS.placeholderText}
                          value={password}
                          onChangeText={setPassword}
                          secureTextEntry={!showPassword}
                          autoCapitalize="none"
                      />
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                          <Ionicons
                              name={showPassword ? "eye-outline" : "eye-off-outline"}
                              size={20}
                              color={COLORS.primary}
                              style={styles.inputIcon}
                          />
                      </TouchableOpacity>
                  </View>
              </View>

              {/* Confirm Password Input */}
              <View style={styles.inputGroup}>
                  <Text style={styles.label}>Confirm Password</Text>
                  <View style={styles.inputContainer}>
                      <Ionicons
                          name="lock-closed-outline"
                          size={20}
                          color={COLORS.primary}
                          style={styles.inputIcon}
                      />
                      <TextInput
                          style={styles.input}
                          placeholder="Confirm your password"
                          placeholderTextColor={COLORS.placeholderText}
                          value={confirmPassword}
                          onChangeText={setConfirmPassword}
                          secureTextEntry={!showPassword}
                          autoCapitalize="none"
                      />
                  </View>
              </View>

              <TouchableOpacity style={styles.button} onPress={() => {handleSignup();}}
              disabled={isLoading}>
                {isLoading ? (
                <ActivityIndicator color="#fff" />
                ) : ( 
                <Text style={styles.buttonText}>Signup</Text>
                )}
              </TouchableOpacity>

                                      <View style={styles.footer}>
                  <Text style={styles.footerText}>Already have an account?</Text>
                  <Link href="/(auth)" asChild>
                      <TouchableOpacity>
                          <Text style={styles.link}>Login</Text>
                      </TouchableOpacity>
                  </Link>
              </View>
              
            </View>

          </View>
        </View>

    </KeyboardAvoidingView>
  )
}

