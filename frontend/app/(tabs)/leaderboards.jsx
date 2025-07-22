import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  Image, 
  TouchableOpacity,
  ActivityIndicator, 
  RefreshControl,
  Animated,
  Platform,
  Dimensions
} from 'react-native';
import COLORS from '@/constants/custom-colors';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { API_URL } from '../../constants/api';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '@/store/authStore';

// Get screen dimensions
const { width } = Dimensions.get('window');

export default function Leaderboards() {
  const { token } = useAuthStore();
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [timeFilter, setTimeFilter] = useState('all'); // 'all', 'monthly', 'weekly'
  const [currentUser, setCurrentUser] = useState(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  // Fetch leaderboard data from API
  const fetchLeaderboards = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get leaderboard with appropriate time filter
      const response = await fetch(`${API_URL}/users/leaderboards?timeFrame=${timeFilter}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard data');
      }
      
      const data = await response.json();
      setLeaders(data);
      
      // Get current user data for showing their rank
      const userResponse = await fetch(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setCurrentUser(userData);
      }
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeaderboards();
    
    // Start entrance animations
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
    
    // Start bounce animation for loading
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
  }, [timeFilter]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLeaderboards();
  }, [timeFilter]);

  // Get user rank badge color
  const getRankBadgeColor = (index) => {
    switch(index) {
      case 0: return ['#FFD700', '#FFA000']; // Gold
      case 1: return ['#C0C0C0', '#9E9E9E']; // Silver
      case 2: return ['#CD7F32', '#8D6E63']; // Bronze
      default: return [COLORS.primary, COLORS.primaryDark]; // Default
    }
  };

  // Find current user's rank
  const findCurrentUserRank = () => {
    if (!currentUser) return null;
    
    const userIndex = leaders.findIndex(leader => 
      leader._id === currentUser._id || leader.username === currentUser.username
    );
    
    if (userIndex === -1) return null;
    
    return {
      ...leaders[userIndex],
      rank: userIndex + 1
    };
  };

  // Loading animation
  if (loading && !refreshing) {
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
          <MaterialCommunityIcons name="trophy-award" size={60} color={COLORS.primary} />
        </Animated.View>
        <Text style={styles.loadingText}>Loading leaderboards...</Text>
      </View>
    );
  }

  const userRankData = findCurrentUserRank();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.contentContainer,
        Platform.OS === 'web' && { alignItems: 'center' }
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[COLORS.primary]}
          tintColor={COLORS.primary}
        />
      }
    >
      <View
        style={[
          Platform.OS === 'web'
            ? { width: 600, maxWidth: '100%', backgroundColor: COLORS.cardBackground, borderRadius: 18, padding: 16, marginTop: 16, marginBottom: 16 }
            : {}
        ]}
      >
        {/* Leaderboard Banner */}
        <Animated.View 
          style={[
            styles.questBanner,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.7)', 'transparent']}
            style={styles.bannerGradient}
          />
          
          <View style={styles.questTitleContainer}>
            <View style={styles.questTitleWrapper}>
              <MaterialCommunityIcons name="trophy" size={32} color="#FFD700" />
              <Text style={styles.questTitle}>Leaderboards</Text>
            </View>
            <Text style={styles.leaderboardSubtitle}>
              {timeFilter === 'all' ? 'All Time' : timeFilter === 'monthly' ? 'Monthly' : 'Weekly'} Rankings
            </Text>
          </View>
        </Animated.View>

        {/* Filter Buttons */}
        <View style={styles.filterContainer}>
          <TouchableOpacity 
            style={[styles.filterButton, timeFilter === 'all' && styles.activeFilter]}
            onPress={() => setTimeFilter('all')}
          >
            <Text style={[styles.filterText, timeFilter === 'all' && styles.activeFilterText]}>All Time</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterButton, timeFilter === 'monthly' && styles.activeFilter]}
            onPress={() => setTimeFilter('monthly')}
          >
            <Text style={[styles.filterText, timeFilter === 'monthly' && styles.activeFilterText]}>Monthly</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterButton, timeFilter === 'weekly' && styles.activeFilter]}
            onPress={() => setTimeFilter('weekly')}
          >
            <Text style={[styles.filterText, timeFilter === 'weekly' && styles.activeFilterText]}>Weekly</Text>
          </TouchableOpacity>
        </View>

        {/* Current User's Rank */}
        {userRankData && (
          <Animated.View 
            style={[
              styles.currentUserCard,
              {
                opacity: fadeAnim,
                transform: [{ translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0]
                })}]
              }
            ]}
          >
            <Text style={styles.yourRankText}>Your Rank</Text>
            <View style={styles.userRankContent}>
              <LinearGradient
                colors={getRankBadgeColor(userRankData.rank - 1)}
                style={styles.rankBadgeLarge}
              >
                <Text style={styles.rankTextLarge}>{userRankData.rank}</Text>
              </LinearGradient>
              <Image
                source={
                  userRankData.profileImage
                    ? { uri: userRankData.profileImage }
                    : require('../../assets/images/character1.png')
                }
                style={styles.avatarLarge}
              />
              <View style={styles.userInfoLarge}>
                <Text style={styles.usernameLarge}>{userRankData.username}</Text>
                <Text style={styles.scoreLarge}>{userRankData.gamification?.totalXP || 0} XP</Text>
                <Text style={styles.level}>Level {userRankData.gamification?.level || 1}</Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Leaderboard List */}
        <View style={styles.leaderboardSection}>
          <View style={styles.sectionTitleContainer}>
            <MaterialCommunityIcons name="crown" size={24} color="#FFD700" />
            <Text style={styles.sectionTitle}>Top Warriors</Text>
            <Text style={styles.challengeCounter}>{leaders.length}</Text>
          </View>
          
          {error ? (
            <View style={styles.errorContainer}>
              <MaterialCommunityIcons name="alert-octagon" size={48} color={COLORS.error} />
              <Text style={styles.errorText}>Failed to load rankings: {error}</Text>
              <TouchableOpacity 
                style={styles.retryButton} 
                onPress={fetchLeaderboards}
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : leaders.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="trophy-broken" size={60} color={COLORS.textSecondary} />
              <Text style={styles.emptyStateText}>No rankings available yet!</Text>
            </View>
          ) : (
            leaders.map((user, idx) => (
              <View
                key={user._id || idx}
                style={[
                  styles.leaderCard,
                  idx === 0 && styles.firstPlaceCard,
                  idx === 1 && styles.secondPlaceCard,
                  idx === 2 && styles.thirdPlaceCard,
                ]}
              >
                <LinearGradient
                  colors={getRankBadgeColor(idx)}
                  style={styles.rankBadge}
                >
                  <Text style={styles.rankText}>{idx + 1}</Text>
                </LinearGradient>
                
                <Image
                  source={
                    user.profileImage
                      ? { uri: user.profileImage }
                      : require('../../assets/images/character1.png')
                  }
                  style={styles.avatar}
                />
                
                <View style={styles.userInfo}>
                  <Text style={styles.username}>
                    {user.username}
                    {idx === 0 && " 👑"}
                  </Text>
                  <View style={styles.userStats}>
                    <View style={styles.statItem}>
                      <MaterialCommunityIcons name="star" size={16} color="#FFD700" />
                      <Text style={styles.statValue}>{user.gamification?.totalXP || 0} XP</Text>
                    </View>
                    <View style={styles.statItem}>
                      <MaterialCommunityIcons name="sword-cross" size={16} color={COLORS.primary} />
                      <Text style={styles.statValue}>Lv. {user.gamification?.level || 1}</Text>
                    </View>
                  </View>
                </View>
                
                {idx <= 2 && (
                  <MaterialCommunityIcons 
                    name={idx === 0 ? "medal" : idx === 1 ? "medal-outline" : "bookmark-outline"} 
                    size={24} 
                    color={idx === 0 ? "#FFD700" : idx === 1 ? "#C0C0C0" : "#CD7F32"} 
                    style={styles.medalIcon}
                  />
                )}
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    paddingVertical: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 16,
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  questBanner: {
    height: 180,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
  },
  bannerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
    zIndex: 1,
  },
  questImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  questTitleContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    zIndex: 2,
  },
  questTitleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  questTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginLeft: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  leaderboardSubtitle: {
    fontSize: 18,
    color: '#ffffff',
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    padding: 4,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeFilter: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  activeFilterText: {
    color: '#ffffff',
  },
  currentUserCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  yourRankText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  userRankContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankBadgeLarge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  rankTextLarge: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 22,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  avatarLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.background,
  },
  userInfoLarge: {
    flex: 1,
  },
  usernameLarge: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    textShadowColor: COLORS.primaryDark,
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  scoreLarge: {
    fontSize: 18,
    color: COLORS.accent,
    fontWeight: 'bold',
    marginTop: 2,
  },
  level: {
    fontSize: 16,
    color: COLORS.primaryLight,
    fontWeight: 'bold',
    marginTop: 2,
  },
  leaderboardSection: {
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginLeft: 8,
    marginRight: 8,
  },
  challengeCounter: {
    backgroundColor: COLORS.primary,
    color: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 18,
    color: COLORS.textSecondary,
    marginTop: 12,
    textAlign: 'center',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.error,
    marginTop: 12,
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  leaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBackground,
    borderRadius: 18,
    marginVertical: 8,
    padding: 16,
    borderWidth: 2,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  firstPlaceCard: {
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
  },
  secondPlaceCard: {
    borderColor: '#C0C0C0',
    backgroundColor: 'rgba(192, 192, 192, 0.12)',
  },
  thirdPlaceCard: {
    borderColor: '#CD7F32',
    backgroundColor: 'rgba(205, 127, 50, 0.10)',
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  rankText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 16,
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.background,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    textShadowColor: COLORS.primaryDark,
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  userStats: {
    flexDirection: 'row',
    marginTop: 4,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  statValue: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 4,
    fontWeight: 'bold',
  },
  medalIcon: {
    marginLeft: 8,
  }
};