import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '@/constants/custom-colors';
import { Platform } from 'react-native';

const isMobile = Platform.OS === 'ios' || Platform.OS === 'android';

export const ModuleNode = ({ 
  module, 
  index, 
  moduleX, 
  spacing, 
  verticalSpacing,
  isSelected,
  onSelect,
  isAdmin,
  onDelete 
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.moduleNode,
        isSelected && styles.selectedNode,
        !module.isUnlocked && styles.lockedNode,
        {
          left: moduleX - (isMobile ? 30 : 40),
          top: index * verticalSpacing,
          transform: [
            { translateX: index % 2 === 0 ? -spacing : spacing },
          ],
        }
      ]}
      onPress={() => module.isUnlocked ? onSelect(module, index) : null}
      disabled={!module.isUnlocked}
    >
      <Text style={[
        styles.moduleName,
        index % 2 === 0 ? styles.moduleNameLeft : styles.moduleNameRight
      ]}>
        {module.title}
      </Text>
      <Text style={styles.moduleLevel}>Level {index + 1}</Text>
      {!module.isUnlocked && (
        <View style={styles.lockOverlay}>
          <Ionicons name="lock-closed" size={24} color="#ffffff" />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  moduleNode: {
    position: 'absolute',
    width: isMobile ? 60 : 80,
    height: isMobile ? 60 : 80,
    borderRadius: isMobile ? 30 : 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(25, 118, 210, 0.3)',
    borderWidth: 2,
    borderColor: '#1976d2',
    shadowColor: '#1976d2',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 3,
    zIndex: 2,
  },
  // ... copy relevant styles from main file
});