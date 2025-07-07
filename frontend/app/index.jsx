
import { Link } from 'expo-router';
import { StyleSheet, View, Text } from 'react-native';


export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Test Screens</Text>
      <Text style={styles.subtitle}>Screen Routes:</Text>
      <Link href="/(auth)/signup" style={styles.subtitle}>Signup</Link>
      <Link href="/(auth)" style={styles.subtitle}>Login</Link>

      <Link href="/imagine" style={styles.subtitle}>Catch.Missing.Screen</Link>
    </View>
  );
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
