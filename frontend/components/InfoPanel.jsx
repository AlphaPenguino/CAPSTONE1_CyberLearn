import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import COLORS from '@/constants/custom-colors';

const isMobile = Platform.OS === 'ios' || Platform.OS === 'android';

export const InfoPanel = ({
  title,
  description,
  actionTitle,
  onAction,
  style,
  scrollY
}) => {
  return (
    <View style={[styles.panel, style]}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {actionTitle && (
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={onAction}
        >
          <Text style={styles.actionButtonText}>{actionTitle}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  panel: {
    width: isMobile ? '90%' : 300,
    maxWidth: 400,
    padding: isMobile ? 16 : 24,
    backgroundColor: 'rgba(10, 25, 41, 0.95)',
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 18,
    maxHeight: '80vh',
    zIndex: 1000,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: COLORS.lightGray,
    marginBottom: 16,
  },
  actionButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: COLORS.white,
    fontWeight: '500',
  },
});