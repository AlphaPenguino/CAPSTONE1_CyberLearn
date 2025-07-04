import { Text, View, StyleSheet } from 'react-native'
import React from 'react'

export default function signup() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>signup yo chat</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  headerContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  cardContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
  }
});