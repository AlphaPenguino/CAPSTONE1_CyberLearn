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
  Dimensions,
  StyleSheet, // Added StyleSheet import
} from 'react-native';
import COLORS from '@/constants/custom-colors';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { API_URL } from '../../constants/api';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '@/store/authStore';

// Get screen dimensions
const { width } = Dimensions.get('window');

export default function Leaderboards() {
  const { token, user } = useAuthStore();
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [timeFilter, setTimeFilter] = useState('all'); // 'all', 'monthly', 'weekly'
  const [category, setCategory] = useState('cookies'); // 'cookies' or 'cakes'
  const [currentUserRank, setCurrentUserRank] = useState(null);

  // Add state for section filter
  const [sectionFilter, setSectionFilter] = useState('all');
  const [sections, setSections] = useState(['all']);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  // Fetch leaderboard data from Progress API
  const fetchLeaderboards = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get leaderboard with appropriate time filter and category
      const response = await fetch(
        `${API_URL}/progress/leaderboards?timeFrame=${timeFilter}&category=${category}`, 
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard data');
      }
      
      const data = await response.json();
      setLeaders(data);
      
      // Extract unique sections
      const uniqueSections = ['all', ...new Set(data.map(leader => leader.section || 'No Class'))];
      setSections(uniqueSections);
      
      // Find current user in the leaderboard
      const currentUserIndex = data.findIndex(
        leader => leader.userId === user?._id || leader.username === user?.username
      );
      
      if (currentUserIndex !== -1) {
        setCurrentUserRank({
          ...data[currentUserIndex],
          rank: currentUserIndex + 1
        });
      } else {
        // If user is not in the leaderboard, fetch their stats separately
        const userProgressResponse = await fetch(`${API_URL}/progress/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (userProgressResponse.ok) {
          const userStats = await userProgressResponse.json();
          setCurrentUserRank({
            ...userStats,
            username: user?.username,
            profileImage: user?.profileImage,
            section: user?.section || 'No Class', // Add section information
            rank: data.length + 1, // Below the last ranked user
            userId: user?._id
          });
        }
      }
      
    } catch (err) {
      setError(err.message);
      console.error('Leaderboard error:', err);
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
  }, [timeFilter, category]); 

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLeaderboards();
  }, [timeFilter, category]);

  // Get user rank badge color
  const getRankBadgeColor = (index) => {
    switch(index) {
      case 0: return ['#FFD700', '#FFA000']; // Gold
      case 1: return ['#C0C0C0', '#9E9E9E']; // Silver
      case 2: return ['#CD7F32', '#8D6E63']; // Bronze
      default: return [COLORS.primary, COLORS.primaryDark]; // Default
    }
  };

  // Get metric color based on category
  const getCategoryColor = () => {
    return category === 'cookies' ? '#FFD700' : '#FF69B4';
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
          <MaterialCommunityIcons 
            name={category === 'cookies' ? "cookie" : "cake"} 
            size={60} 
            color={getCategoryColor()} 
          />
        </Animated.View>
        <Text style={styles.loadingText}>Loading leaderboards...</Text>
      </View>
    );
  }

  // Filter the leaders based on section
  const filteredLeaders = sectionFilter === 'all' 
    ? leaders 
    : leaders.filter(leader => (leader.section || 'No Class') === sectionFilter);

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
              <MaterialCommunityIcons 
                name={category === 'cookies' ? "trophy" : "cake-variant"} 
                size={32} 
                color={getCategoryColor()} 
              />
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

        {/* Category Selector */}
        <View style={styles.categoryContainer}>
          <TouchableOpacity 
            style={[styles.categoryTab, category === 'cookies' && styles.activeCategory]}
            onPress={() => setCategory('cookies')}
          >
            <MaterialCommunityIcons 
              name="cookie" 
              size={22} 
              color={category === 'cookies' ? '#FFD700' : COLORS.textSecondary} 
            />
            <Text style={[
              styles.categoryText, 
              category === 'cookies' && { color: '#FFD700' }
            ]}>
              Cookies (XP)
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.categoryTab, category === 'cakes' && styles.activeCategory]}
            onPress={() => setCategory('cakes')}
          >
            <MaterialCommunityIcons 
              name="cake" 
              size={22} 
              color={category === 'cakes' ? '#FF69B4' : COLORS.textSecondary} 
            />
            <Text style={[
              styles.categoryText, 
              category === 'cakes' && { color: '#FF69B4' }
            ]}>
              Cakes (Quizzes)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Section Filter - Only show if there are multiple sections */}
        {sections.length > 1 && (
          <View style={styles.sectionFilterContainer}>
            <Text style={styles.sectionFilterLabel}>Class Filter:</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.sectionFilterScroll}
            >
              {sections.map(section => (
                <TouchableOpacity
                  key={section}
                  style={[
                    styles.sectionFilterButton,
                    sectionFilter === section && styles.activeSectionFilter
                  ]}
                  onPress={() => setSectionFilter(section)}
                >
                  <Text style={[
                    styles.sectionFilterText,
                    sectionFilter === section && styles.activeSectionFilterText
                  ]}>
                    {section === 'all' ? 'All Classes' : section}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Current User's Rank */}
        {currentUserRank && (
          <Animated.View 
            style={[
              styles.currentUserCard,
              {
                opacity: fadeAnim,
                transform: [{ translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0]
                })}]
              },
              category === 'cookies' ? { borderColor: '#FFD700', shadowColor: '#FFD700' } : { borderColor: '#FF69B4', shadowColor: '#FF69B4' }
            ]}
          >
            <Text style={[
              styles.yourRankText,
              category === 'cookies' ? { color: '#FFD700' } : { color: '#FF69B4' }
            ]}>Your Rank</Text>
            <View style={styles.userRankContent}>
              <LinearGradient
                colors={getRankBadgeColor(currentUserRank.rank - 1)}
                style={styles.rankBadgeLarge}
              >
                <Text style={styles.rankTextLarge}>{currentUserRank.rank}</Text>
              </LinearGradient>
              <Image
                source={
                  currentUserRank.profileImage ? { uri: currentUserRank.profileImage } : require('../../assets/images/character1.png')
                }
                style={[
                  styles.avatarLarge,
                  category === 'cookies' ? { borderColor: '#FFD700' } : { borderColor: '#FF69B4' }
                ]}
              />
              <View style={styles.userInfoLarge}>
                <Text style={styles.usernameLarge}>{currentUserRank.username}</Text>
                {/* Add section info */}
                <View style={styles.sectionRowLarge}>
                  <Ionicons name="school" size={16} color={currentUserRank.section === 'no_section' ? '#aaa' : '#4CAF50'} />
                  <Text style={[
                    styles.sectionTextLarge,
                    currentUserRank.section === 'no_section' && { color: '#aaa', fontStyle: 'italic' }
                  ]}>
                    {currentUserRank.section || 'No Class'}
                  </Text>
                </View>
                <Text style={[
                  styles.scoreLarge,
                  category === 'cookies' ? { color: '#FFD700' } : { color: '#FF69B4' }
                ]}>
                  {category === 'cookies' ? `${currentUserRank.totalXP || 0} Cookies` : `${currentUserRank.completedQuizzes || 0} Cakes` }
                </Text>
                {/* Updated Level Text Color */}
                <Text style={[styles.level, { color: '#E1BEE7', fontWeight: 'bold' }]}>
                  Level {Math.floor((currentUserRank.totalXP || 0) / 100) + 1}
                </Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Leaderboard List */}
        <View style={styles.leaderboardSection}>
          <View style={styles.sectionTitleContainer}>
            <MaterialCommunityIcons
              name={category === 'cookies' ? "crown" : "cake-variant"}
              size={24}
              color={getCategoryColor()}
            />
            <Text style={styles.sectionTitle}>
              Top {category === 'cookies' ? 'Cookie' : 'Cake'} Collectors
            </Text>
            <Text style={styles.challengeCounter}>{leaders.length}</Text>
          </View>
          {error ? (
            <View style={styles.errorContainer}>
              <MaterialCommunityIcons name="alert-octagon" size={48} color={COLORS.error} />
              <Text style={styles.errorText}>Failed to load rankings: {error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={fetchLeaderboards} >
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : filteredLeaders.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="trophy-broken" size={60} color={COLORS.textSecondary} />
              <Text style={styles.emptyStateText}>No rankings available yet!</Text>
            </View>
          ) : (
            filteredLeaders.map((leader, idx) => (
              <View
                key={leader._id || idx}
                style={[
                  styles.leaderCard,
                  idx === 0 && styles.firstPlaceCard,
                  idx === 1 && styles.secondPlaceCard,
                  idx === 2 && styles.thirdPlaceCard,
                  category === 'cakes' && idx === 0 && { borderColor: '#FF69B4', backgroundColor: 'rgba(255, 105, 180, 0.15)' },
                  category === 'cakes' && idx === 1 && { borderColor: '#FF69B4', backgroundColor: 'rgba(255, 105, 180, 0.10)' },
                  category === 'cakes' && idx === 2 && { borderColor: '#FF69B4', backgroundColor: 'rgba(255, 105, 180, 0.05)' }
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
                    leader.profileImage ? { uri: leader.profileImage } : require('../../assets/images/character1.png')
                  }
                  style={[
                    styles.avatar,
                    category === 'cookies' ? { borderColor: '#FFD700' } : { borderColor: '#FF69B4' }
                  ]}
                />
                <View style={styles.userInfoContainer}>
                  <Text style={styles.username}>{leader.username}</Text>
                  {/* Add section info */}
                  <View style={styles.sectionRow}>
                    <Ionicons name="school" size={14} color={leader.section === 'no_section' ? '#aaa' : '#4CAF50'} />
                    <Text style={[
                      styles.sectionText,
                      leader.section === 'no_section' && { color: '#aaa', fontStyle: 'italic' }
                    ]}>
                      {leader.section || 'No Class'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.score}>
                  {category === 'cookies' ? `${leader.totalXP || 0} XP` : `${leader.completedQuizzes || 0} Cakes`}
                </Text>
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Main containers and layout
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: 16,
  },
  
  // Loading and Error states
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    color: COLORS.textPrimary,
    marginTop: 16,
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    marginTop: 20,
  },
  errorText: {
    color: COLORS.textPrimary,
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    marginTop: 20,
  },
  emptyStateText: {
    color: COLORS.textSecondary,
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },

  // Banner
  questBanner: {
    height: 120,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 24, // Increased spacing
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  bannerGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  questTitleContainer: {
    padding: 16,
    paddingTop: 16,
    alignItems: 'center',
  },
  questTitleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  questTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginLeft: 8,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  leaderboardSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    textAlign: 'center',
  },

  // Filters
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8, // Changed from 20 to 8
    backgroundColor: COLORS.backgroundLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  activeFilter: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    color: COLORS.textSecondary,
    fontWeight: 'bold',
  },
  activeFilterText: {
    color: '#fff',
  },

  // Category Selector
  categoryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    padding: 8,
    marginBottom: 20,
  },
  categoryTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  activeCategory: {
    backgroundColor: COLORS.background,
  },
  categoryText: {
    marginLeft: 8,
    fontWeight: 'bold',
    color: COLORS.textSecondary,
  },

  // Section Filter
  sectionFilterContainer: {
    marginBottom: 20,
  },
  sectionFilterLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  sectionFilterScroll: {
    paddingRight: 16,
  },
  sectionFilterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: COLORS.backgroundLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
  },
  activeSectionFilter: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
  },
  sectionFilterText: {
    color: COLORS.textSecondary,
    fontWeight: 'bold',
  },
  activeSectionFilterText: {
    color: '#fff',
  },
  
  // Current User's Rank Card
  currentUserCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 18,
    padding: 24, // Increased padding
    borderWidth: 3,
    marginBottom: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  yourRankText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16, // Increased spacing
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  userRankContent: {
    flexDirection: 'row',
    alignItems: 'center',
    // Removed justifyContent: 'center' to allow for left alignment
  },
  rankBadgeLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 20, // Increased margin
  },
  rankTextLarge: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 24,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  avatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 20, // Increased margin
    borderWidth: 3,
  },
  userInfoLarge: {
    flex: 1, // Make it take up available space
    justifyContent: 'center', // Center content vertically
  },
  usernameLarge: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    marginBottom: 4, // Added spacing
    textAlign: 'left', // Align text to the left
  },
  sectionRowLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8, // Increased spacing
    marginTop: 4,
    justifyContent: 'flex-start', // Align icon and text to the left
  },
  sectionTextLarge: {
    color: '#4CAF50',
    fontSize: 16,
    marginLeft: 4, // Adjusted margin for centering
  },
  scoreLarge: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4, // Added spacing
    textAlign: 'left',
  },
  level: {
    fontSize: 16,
    color: '#E1BEE7',
    marginTop: 4,
    textAlign: 'left',
  },

  // Leaderboard List
  leaderboardSection: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 18,
    padding: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginLeft: 8,
    flex: 1,
  },
  challengeCounter: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textSecondary,
  },
  leaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16, // Increased padding
    marginBottom: 12,
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  firstPlaceCard: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  secondPlaceCard: {
    backgroundColor: 'rgba(192, 192, 192, 0.15)',
    borderColor: '#C0C0C0',
  },
  thirdPlaceCard: {
    backgroundColor: 'rgba(205, 127, 50, 0.15)',
    borderColor: '#CD7F32',
  },
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 20, // Increased margin
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
    marginRight: 20, // Increased margin
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.background,
  },
  userInfoContainer: {
    flex: 1, // Make it take up available space
    justifyContent: 'center', // Center content vertically
  },
  username: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    textShadowColor: COLORS.primaryDark,
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    marginBottom: 2, // Added spacing
    textAlign: 'left', // Align text to the left
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4, // Increased spacing
    justifyContent: 'flex-start', // Align icon and text to the left
  },
  sectionText: {
    color: '#4CAF50',
    fontSize: 14,
    marginLeft: 4, // Adjusted margin
  },
  score: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
});
