import { View, TouchableOpacity, Platform } from 'react-native';
import React, { useState, useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { IconButton } from 'react-native-paper';
import COLORS from '@/constants/custom-colors';
import CustomDrawer from '../../components/drawer/drawer';
import { useAuthStore } from '../../store/authStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const { user, token, checkAuth, logout } = useAuthStore();
  const isAdmin = user?.privilege === 'admin';
  const isSuperAdmin = user?.privilege === 'superadmin';
  const insets = useSafeAreaInsets();
  
  useEffect(() => {
    checkAuth();
    console.log("Is Admin:", isAdmin);
    console.log("Platform:", Platform.OS);
  }, []);

  return (
    <>
      {Platform.OS !== 'web' && (
        <CustomDrawer
          visible={drawerVisible}
          onDismiss={() => setDrawerVisible(false)}
        />
      )}
      <Tabs
        screenOptions={{
          headerShown: Platform.OS !== 'web',
          headerTitle: '',
          tabBarPosition: Platform.OS === 'web' ? 'top' : 'bottom',
          tabBarStyle: {
            backgroundColor: COLORS.background,
            borderTopWidth: 0,
            borderBottomWidth: 0,
            elevation: 0,
            shadowOpacity: 0,
            height: Platform.OS === 'web' 
              ? 56 
              : Platform.OS === 'android' 
                ? 65 + (insets.bottom > 0 ? insets.bottom : 12) 
                : 80,
            paddingTop: Platform.OS === 'web' ? 0 : 8,
            paddingBottom: Platform.OS === 'web' 
              ? 0 
              : Platform.OS === 'android' 
                ? insets.bottom > 0 ? insets.bottom : 12 
                : 30,
            position: 'relative',
            top: Platform.OS === 'web' ? 0 : undefined,
            bottom: Platform.OS === 'web' ? undefined : 0,
            left: 0,
            right: 0,
            safeAreaInsets: { bottom: 0 },
          },
          tabBarLabelStyle: {
            paddingBottom: Platform.OS === 'android' ? 4 : 0,
            fontSize: 12,
          },
          headerStyle: {
            height: Platform.OS === 'android' ? 50 : 56,
            backgroundColor: COLORS.background,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 0,
          },
          headerTitleStyle: {
            color: COLORS.black,
            fontWeight: '600',
          },
        }}
      >
        <Tabs.Screen
  name="index"
  options={{
    title: 'Home',
    tabBarIcon: ({ color, size, focused }) => (
      <Ionicons
        name={focused ? "home" : "home-outline"}
        size={size}
        color={color}
      />
    ),
    href: isSuperAdmin ? null : undefined,
    headerShown: !isSuperAdmin,
  }}
/>

<Tabs.Screen
  name="game"
  options={{
    title: 'Arcade',
    tabBarIcon: ({ color, size, focused }) => (
      <Ionicons
        name={focused ? "game-controller" : "game-controller-outline"}
        size={size}
        color={color}
      />
    ),
    href: isSuperAdmin ? null : undefined,
    headerShown: !isSuperAdmin,
  }}
/>

<Tabs.Screen
  name="create"
  options={{
    title: 'Create',
    tabBarIcon: ({ color, size, focused }) => (
      <Ionicons
        name={focused ? "add-circle" : "add-circle-outline"}
        size={size}
        color={color}
      />
    ),
    href: isAdmin ? undefined : null,
    headerShown: isAdmin,
  }} 
/>

<Tabs.Screen
  name="users"
  options={{
    title: 'Manage Users',
    tabBarIcon: ({ color, size, focused }) => (
      <Ionicons
        name={focused ? "person" : "person-outline"}
        size={size}
        color={color}
      />
    ),
    href: isSuperAdmin ? undefined : null,
    headerShown: isSuperAdmin,
  }} 
/>

<Tabs.Screen 
  name="leaderboards" 
  options={{
    title: 'Leaderboards',
    tabBarIcon: ({ color, size, focused }) => (
      <Ionicons 
        name={focused ? "trophy" : "trophy-outline"} 
        size={size} 
        color={color} 
      />
    ),
    href: isSuperAdmin ? null : undefined,
    headerShown: !isSuperAdmin,
  }} 
/>

<Tabs.Screen 
  name="settings" 
  options={{
    title: 'Settings',
    tabBarIcon: ({ color, size, focused }) => (
      <Ionicons 
        name={focused ? "settings" : "settings-outline"} 
        size={size} 
        color={color} 
      />
    ),
  }} 
/>
        
      </Tabs>
    </>
  );
}