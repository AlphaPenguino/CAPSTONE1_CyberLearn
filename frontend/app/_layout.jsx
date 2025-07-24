import { Slot, useRouter, useSegments } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';  
import { SafeScreen } from '@/components/SafeScreen';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '@/store/authStore';
import { PaperProvider } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaView } from 'react-native';
import CustomDrawer from '../components/drawer/drawer';


export default function RootLayout() {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const segments = useSegments();
  const { checkAuth, user, token } = useAuthStore();

  useEffect(() => {
    setMounted(true);
    checkAuth();
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const inAuthScreen = segments[0] === '(auth)';
    const isSignedIn = user && token;

    if (!isSignedIn && !inAuthScreen) {
      router.replace('/(auth)');
    }
    else if (isSignedIn && inAuthScreen) {
      router.replace('/(tabs)');
    }
  }, [user, token, segments, mounted]);

  return (
   
    <SafeAreaProvider>
    
    <PaperProvider>
    
       
        
         <Slot />
      <StatusBar style="light" />
      
    
    </PaperProvider>
    </SafeAreaProvider>
    
  );
}
