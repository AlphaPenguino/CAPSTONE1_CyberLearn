import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import RPG_COLORS from '@/constants/rpg-theme-colors';

export const RPGContainer = ({ children, style }) => (
  <View style={[styles.rpgContainer, style]}>
    {children}
  </View>
);

export const RPGPanel = ({ children, style }) => (
  <View style={[styles.rpgPanel, style]}>
    {children}
  </View>
);

export const RPGButton = ({ children, disabled, style }) => (
  <View style={[
    styles.rpgButton,
    disabled && styles.rpgButtonDisabled,
    style
  ]}>
    {children}
  </View>
);

export const RPGHealthBar = ({ current, max, style }) => {
  const percent = Math.min(100, Math.max(0, (current / max) * 100));
  return (
    <View style={[styles.rpgBarContainer, style]}>
      <View style={[styles.rpgHealthBarFill, { width: `${percent}%` }]} />
      <Text style={styles.rpgBarText}>{current}/{max}</Text>
    </View>
  );
};

export const RPGManaBar = ({ current, max, style }) => {
  const percent = Math.min(100, Math.max(0, (current / max) * 100));
  return (
    <View style={[styles.rpgBarContainer, style]}>
      <View style={[styles.rpgManaBarFill, { width: `${percent}%` }]} />
      <Text style={styles.rpgBarText}>{current}/{max}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  rpgContainer: {
    borderWidth: 3,
    borderColor: RPG_COLORS.border,
    backgroundColor: RPG_COLORS.backgroundLight,
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 5,
    margin: 8,
  },
  rpgPanel: {
    borderWidth: 2,
    borderColor: RPG_COLORS.primaryLight,
    backgroundColor: RPG_COLORS.background,
    borderRadius: 4,
    padding: 10,
    margin: 4,
  },
  rpgButton: {
    borderWidth: 2,
    borderColor: RPG_COLORS.primaryLight,
    backgroundColor: RPG_COLORS.primary,
    borderRadius: 4,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minHeight: 50,
  },
  rpgButtonDisabled: {
    borderColor: '#455A64',
    backgroundColor: '#263238',
    opacity: 0.7,
  },
  rpgBarContainer: {
    height: 20,
    backgroundColor: '#0D1B2A',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: RPG_COLORS.primaryLight,
    position: 'relative',
  },
  rpgHealthBarFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: RPG_COLORS.healthBar,
  },
  rpgManaBarFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: RPG_COLORS.manaBar,
  },
  rpgBarText: {
    color: '#FFFFFF',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: 'bold',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    lineHeight: 20,
  }
});