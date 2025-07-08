import { View, TouchableOpacity } from 'react-native';
import React, { useState } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { IconButton } from 'react-native-paper';
import COLORS from '@/constants/custom-colors';
import CustomDrawer from '../../components/drawer/drawer';

export default function TabLayout() {
  const [drawerVisible, setDrawerVisible] = useState(false);

  return (
    <>
      <CustomDrawer 
        visible={drawerVisible} 
        onDismiss={() => setDrawerVisible(false)} 
      />
      
      <Tabs screenOptions={{
        headerShown: true,
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => setDrawerVisible(true)}
            style={{ marginLeft: 4, padding: 8 }}
          >
            <Ionicons name="menu" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        ),
        tabBarActiveTintColor: COLORS.textPrimary,
        tabBarInactiveTintColor: COLORS.primary,
        tabBarStyle: {
          backgroundColor: COLORS.cardBackground,
          borderTopColor: COLORS.border,
          height: 60,
          paddingBottom: 8,
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
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="game-controller-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen 
          name="index" 
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home-outline" size={size} color={color} />
            ),
          }} 
        />
        <Tabs.Screen 
          name="leaderboard" 
          options={{
            title: 'Boards',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="trophy-outline" size={size} color={color} />
            ),
          }} 
        />
        
      </Tabs>
    </>
  );
}