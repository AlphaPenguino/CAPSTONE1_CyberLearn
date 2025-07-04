import { Stack } from 'expo-router';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';  
import { SafeScreen } from '@/components/SafeScreen';
import { StatusBar } from 'expo-status-bar';

export default function TabLayout() {
  return  (

    <SafeAreaProvider>

      <SafeScreen>

        <Stack screenOptions={{headerShown: false}} >
          <Stack.Screen name="index"/>
          <Stack.Screen name="(auth)"/>
        </Stack>

      </SafeScreen>
      
      <StatusBar style="dark" />

    </SafeAreaProvider>
    
  );
}
