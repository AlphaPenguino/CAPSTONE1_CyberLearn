import { View, TouchableOpacity, Platform } from 'react-native';
import React, { useState, useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { IconButton } from 'react-native-paper';
import COLORS from '@/constants/custom-colors';
import CustomDrawer from '../../components/drawer/drawer';
import { useAuthStore } from '../../store/authStore';

export default function TabLayout() {
  const [drawerVisible, setDrawerVisible] = useState(false);

    const { user, token, checkAuth, logout } = useAuthStore();

  
  const isAdmin = user?.privilege === 'admin';
  
  useEffect(() => { 
    checkAuth();
    
    console.log("Is Admin:", isAdmin);
    console.log("Platform:", Platform.OS);
  }, []);

  return (
    <>
      <CustomDrawer 
        visible={drawerVisible} 
        onDismiss={() => setDrawerVisible(false)} 
      />
      
      
      <Tabs screenOptions={{
        headerShown: true,
        headerTitle: '',
        headerStyle: {
          height: 56,
          backgroundColor: COLORS.cardBackground,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
        },
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => setDrawerVisible(true)}
            style={{ 
              marginLeft: 16,
              padding: 8,
              justifyContent: 'center',
              height: 48,
            }}
          >
            <Ionicons name="menu" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        ),
        tabBarActiveTintColor: COLORS.textPrimary,
        tabBarInactiveTintColor: COLORS.primary,
        tabBarStyle: {
          backgroundColor: COLORS.cardBackground,
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          height: Platform.OS === 'android' ? 65 : 80,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'android' ? 12 : 30,
          position: Platform.OS === 'android' ? 'relative' : 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          safeAreaInset: { bottom: 'always' },
        },
        tabBarLabelStyle: {
          paddingBottom: Platform.OS === 'android' ? 4 : 0,
          fontSize: 12,
        },
        headerTitleStyle: { 
          color: COLORS.black, 
          fontWeight: "600" 
        },
      }}>
        
        <Tabs.Screen 
          name="game" 
          options={{
            title: 'Play',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons 
                name={focused ? "game-controller" : "game-controller-outline"} 
                size={size} 
                color={color} 
              />
            ),
          }}
        />
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
          name="leaderboard" 
          options={{
            title: 'Boards',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons 
                name={focused ? "trophy" : "trophy-outline"} 
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