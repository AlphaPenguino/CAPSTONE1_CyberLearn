import { Text, View, StyleSheet, Image } from 'react-native'
import styles from "../../../assets/styles/login.styles.js";
import { useState } from 'react';


export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = () => {

  };

  return (
    <View style={styles.container}>
      <View style={styles.topIllustration}>
        <Text style={styles.title}>Welcome to CyberLearn</Text>
        <Image
          source={require("../../../assets/images/cyberlearn-logo-transparent.png")}
          style={styles.illustrationImage}
          resizeMode= 'contain'
        />
        
      </View>

      <View style={styles.card}>
        <View style={styles.formContainer}>
          <Text style={styles.subtitle}>Login ka dito boi</Text>
        </View>
      </View>
    </View>
  )
}
