import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import COLORS from '@/constants/custom-colors';
import { API_URL } from '@/constants/api';

const { width } = Dimensions.get('window');

export default function Leaderboard() {
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState([]);
  const [error, setError] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const router = useRouter();

  useEffect(() => {
    fetchLeaderboard();

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      })
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);

      // Replace with your actual leaderboard API endpoint
      const res = await fetch(`${API_URL}/leaderboard`);
      if (!res.ok) throw new Error('Failed to load leaderboard');
      const data = await res.json();
      setLeaderboard(data);
    } catch (err) {
      setError(err.message || 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Animated.View
          style={{
            transform: [{
              rotate: bounceAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '360deg']
              })
            }]
          }}
        >
          <MaterialCommunityIcons name="trophy" size={60} color={COLORS.primary} />
        </Animated.View>
        <Text style={styles.loadingText}>Loading leaderboard...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="alert-octagon" size={60} color={COLORS.error} />
        <Text style={styles.errorText}>Failed: {error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={fetchLeaderboard}
          activeOpacity={0.7}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Banner */}
      <Animated.View
        style={[
          styles.leaderboardBanner,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        <LinearGradient
          colors={['#FFD700', 'rgba(255,215,0,0.2)']}
          style={styles.bannerGradient}
        />
        <View style={styles.leaderboardTitleContainer}>
          <MaterialCommunityIcons name="trophy" size={28} color="#FFD700" />
          <Text style={styles.leaderboardTitle}>Leaderboard</Text>
        </View>
        <Text style={styles.leaderboardSubtitle}>Top Cyber Defenders</Text>
      </Animated.View>

      {/* Leaderboard List */}
      <View style={styles.leaderboardListSection}>
        {leaderboard.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="account-group" size={60} color={COLORS.textSecondary} />
            <Text style={styles.emptyStateText}>No leaderboard data yet!</Text>
          </View>
        ) : (
          leaderboard.map((entry, idx) => (
            <LinearGradient
              key={entry.userId || idx}
              colors={
                idx === 0
                  ? ['#FFD700', '#FFFDE4']
                  : idx === 1
                  ? ['#C0C0C0', '#F5F5F5']
                  : idx === 2
                  ? ['#CD7F32', '#F5E6C0']
                  : ['#232A36', '#181C24']
              }
              style={[
                styles.leaderboardCard,
                idx < 3 && styles.topThreeCard
              ]}
            >
              <View style={styles.rankCircle}>
                <Text style={styles.rankText}>{idx + 1}</Text>
              </View>
              <Image
                source={
                  entry.avatar
                    ? { uri: entry.avatar }
                    : require('../../assets/images/character1.png')
                }
                style={styles.avatar}
              />
              <View style={styles.leaderboardInfo}>
                <Text style={styles.username}>{entry.username || 'Anonymous'}</Text>
                <Text style={styles.scoreLabel}>Score: <Text style={styles.scoreValue}>{entry.score}</Text></Text>
              </View>
              {idx === 0 && (
                <MaterialCommunityIcons name="crown" size={28} color="#FFD700" style={{ marginLeft: 8 }} />
              )}
            </LinearGradient>
          ))
        )}
      </View>

      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="arrow-left" size={20} color="#ffffff" />
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#181C24' },
  contentContainer: { padding: 16, paddingBottom: 40 },
  leaderboardBanner: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 18,
    alignItems: 'center',
    paddingVertical: 24,
    position: 'relative'
  },
  bannerGradient: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1
  },
  leaderboardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6
  },
  leaderboardTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFD700',
    marginLeft: 8
  },
  leaderboardSubtitle: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 4
  },
  leaderboardListSection: {
    marginTop: 8,
    marginBottom: 24
  },
  leaderboardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#232A36',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    elevation: 2
  },
  topThreeCard: {
    borderWidth: 2,
    borderColor: '#FFD700'
  },
  rankCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#181C24',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  rankText: {
    color: '#FFD700',
    fontWeight: 'bold',
    fontSize: 18
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    backgroundColor: '#333'
  },
  leaderboardInfo: {
    flex: 1
  },
  username: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16
  },
  scoreLabel: {
    color: '#FFD700',
    fontSize: 14
  },
  scoreValue: {
    color: '#fff',
    fontWeight: 'bold'
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 40
  },
  emptyStateText: {
    color: '#aaa',
    fontSize: 16,
    marginTop: 10
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#181C24'
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 16
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#181C24'
  },
  errorText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 16,
    textAlign: 'center'
  },
  retryButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: COLORS.primary
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#232A36',
    position: 'absolute',
    bottom: 16,
    left: 16,
    elevation: 2
  },
  backButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8
  }
});