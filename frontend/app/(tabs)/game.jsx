import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Platform, Dimensions } from 'react-native';
import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import COLORS from '@/constants/custom-colors';
import { useAuthStore } from '@/store/authStore';
import Animated, { 
  FadeInDown, 
  FadeInRight,
  withTiming,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withDelay
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
// Adjusted card width calculation for web
const cardWidth = isWeb ? Math.min(350, width * 0.45) : width * 0.85;
// Ensure the content is centered and has a max width on web
const contentMaxWidth = isWeb ? 1200 : '100%';

const GameCard = ({ title, description, icon, color, bgImage, onPress, delay = 0 }) => {
  const scale = useSharedValue(1);
  
  const pulseAnimation = () => {
    scale.value = withSequence(
      withTiming(1.05, { duration: 300 }),
      withTiming(1, { duration: 300 })
    );
  };
  
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }]
    };
  });
  
  return (
    <Animated.View 
      entering={FadeInDown.delay(delay).springify()} 
      style={[styles.gameCardContainer, animatedStyle]}
    >
      <TouchableOpacity
        style={styles.gameCard}
        onPress={() => {
          pulseAnimation();
          setTimeout(onPress, 300);
        }}
        activeOpacity={0.8}
      >
        <Image 
          source={bgImage} 
          style={styles.cardBackground}
          resizeMode="cover"
        />
        <BlurView intensity={30} style={styles.blurOverlay}>
          <LinearGradient
            colors={[`${color}90`, `${color}DD`]}
            style={styles.cardGradient}
          >
            <View style={styles.cardContent}>
              <View style={[styles.iconContainer, { backgroundColor: color }]}>
                <MaterialCommunityIcons name={icon} size={36} color="#FFFFFF" />
              </View>
              <Text style={styles.gameTitle}>{title}</Text>
              <Text style={styles.gameDescription}>{description}</Text>
              
              <View style={styles.cardFooter}>
                <View style={styles.playButton}>
                  <Text style={styles.playText}>PLAY NOW</Text>
                  <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
                </View>
              </View>
            </View>
          </LinearGradient>
        </BlurView>
      </TouchableOpacity>
    </Animated.View>
  );
};

const FeaturedGame = ({ onPress }) => {
  const rotation = useSharedValue(0);
  const bounce = useSharedValue(1);
  
  useEffect(() => {
    const interval = setInterval(() => {
      rotation.value = withSequence(
        withTiming(rotation.value - 5, { duration: 800 }),
        withTiming(rotation.value + 10, { duration: 1600 }),
        withTiming(rotation.value, { duration: 800 })
      );
      
      bounce.value = withSequence(
        withTiming(1.03, { duration: 700 }),
        withTiming(0.97, { duration: 700 }),
        withTiming(1, { duration: 700 })
      );
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);
  
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { rotate: `${rotation.value}deg` },
        { scale: bounce.value }
      ]
    };
  });
  
  return (
    <Animated.View 
      entering={FadeInDown.springify()}
      style={styles.featuredContainer}
    >
      <TouchableOpacity 
        onPress={onPress}
        style={styles.featuredTouchable}
        activeOpacity={0.9}
      >
        <View style={styles.featuredContent}>
          <View style={styles.featuredTextContainer}>
            <Text style={styles.featuredLabel}>FEATURED</Text>
            <Text style={styles.featuredTitle}>Cyber Relay Race</Text>
            <Text style={styles.featuredDescription}>
              Team up and race against your classmates in this fast-paced relay challenge!
            </Text>
            <View style={styles.featuredButton}>
              <Text style={styles.featuredButtonText}>PLAY MULTIPLAYER</Text>
              <Ionicons name="people" size={16} color="#FFFFFF" style={{marginLeft: 8}} />
            </View>
          </View>
          
          {/* Adjusted image container position and size */}
          <Animated.View style={[styles.featuredImageContainer, animatedStyle]}>
            <Image
              source={require('../../assets/images/character1.png')}
              style={styles.featuredImage}
              resizeMode="contain"
            />
          </Animated.View>
        </View>
        
        <LinearGradient
          colors={['rgba(2, 21, 38, 0)', 'rgba(2, 21, 38, 0.8)', COLORS.background]}
          style={styles.featuredGradient}
        />
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function GameArcade() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [games, setGames] = useState([
    {
      id: 'code-challenge',
      title: 'Code Challenge',
      description: 'Fix broken code snippets against the clock',
      icon: 'code-tags',
      color: '#4361EE',
      bgImage: require('../../assets/images/character1.png')
    },
    {
      id: 'cyber-match',
      title: 'Cyber Match',
      description: 'Match security terms with their correct definitions',
      icon: 'card-account-details-outline',
      color: '#7209B7',
      bgImage: require('../../assets/images/character1.png')
    },
    {
      id: 'network-puzzle',
      title: 'Network Puzzle',
      description: 'Connect the network components correctly',
      icon: 'lan',
      color: '#F72585',
      bgImage: require('../../assets/images/character1.png')
    },
    {
      id: 'trivia-master',
      title: 'Trivia Master',
      description: 'Test your knowledge of cybersecurity trivia',
      icon: 'brain',
      color: '#4CC9F0',
      bgImage: require('../../assets/images/character1.png')
    }
  ]);
  
  const handleGameSelect = (gameId) => {
    if (gameId === 'multiplayer') {
      router.push('/multiplayer');
    } else {
      // Navigate to the specific single-player game
      router.push(`/arcade/${gameId}`);
    }
  };
  
  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      {/* Added wrapper for web to center content */}
      <View style={styles.contentWrapper}>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={isWeb ? styles.webScrollContent : null}
        >
          <View style={styles.header}>
            <Animated.Text entering={FadeInDown.delay(100)} style={styles.title}>Arcade</Animated.Text>
            <Animated.View entering={FadeInDown.delay(200)} style={styles.userPoints}>
              <MaterialCommunityIcons name="star" size={16} color="#FFD700" />
              <Text style={styles.pointsText}>{user?.points || 0} Points</Text>
            </Animated.View>
          </View>
          
          <FeaturedGame onPress={() => handleGameSelect('multiplayer')} />
          
          <Animated.Text 
            entering={FadeInDown.delay(300)} 
            style={styles.sectionTitle}
          >
            Single Player Games
          </Animated.Text>
          
          <View style={styles.gamesGrid}>
            {games.map((game, index) => (
              <GameCard
                key={game.id}
                title={game.title}
                description={game.description}
                icon={game.icon}
                color={game.color}
                bgImage={game.bgImage}
                delay={400 + index * 100}
                onPress={() => handleGameSelect(game.id)}
              />
            ))}
          </View>
          
          <View style={styles.comingSoonContainer}>
            <Animated.Text 
              entering={FadeInDown.delay(800)} 
              style={styles.comingSoonText}
            >{/* more games coming soon!*/}
            </Animated.Text>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  // New wrapper to center content on web
  contentWrapper: {
    flex: 1,
    alignItems: isWeb ? 'center' : 'stretch',
    width: '100%',
  },
  // Added for web to ensure content doesn't stretch
  webScrollContent: {
    maxWidth: contentMaxWidth,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    width: '100%',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  userPoints: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBackground,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  pointsText: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginLeft: 6,
  },
  // Adjusted featured container for better proportions
  featuredContainer: {
    height: isWeb ? 240 : 200,
    margin: 20,
    marginTop: 10,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: COLORS.primaryDark,
    width: isWeb ? 'auto' : undefined,
  },
  featuredTouchable: {
    flex: 1,
    position: 'relative',
  },
  featuredContent: {
    flex: 1,
    flexDirection: 'row',
    padding: 20,
  },
  featuredTextContainer: {
    flex: 1,
    justifyContent: 'center',
    zIndex: 2,
    // Adjusted width for web to prevent overflow
    maxWidth: isWeb ? '60%' : undefined,
  },
  featuredLabel: {
    color: '#60A5FA',
    fontWeight: 'bold',
    fontSize: 12,
    marginBottom: 8,
  },
  featuredTitle: {
    color: COLORS.textPrimary,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  featuredDescription: {
    color: COLORS.textDark,
    marginBottom: 16,
    fontSize: 14,
  },
  featuredButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  featuredButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  // Fixed image position and size to prevent cropping
  featuredImageContainer: {
    position: 'absolute',
    right: isWeb ? 10 : -20,
    bottom: isWeb ? -30 : -20,
    width: isWeb ? 180 : 180,
    height: isWeb ? 220 : 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  featuredGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginTop: 10,
    marginBottom: 16,
    marginHorizontal: 20,
    width: '100%',
  },
  // Improved grid layout for web
  gamesGrid: {
    flexDirection: isWeb ? 'row' : 'column',
    flexWrap: isWeb ? 'wrap' : 'nowrap',
    justifyContent: isWeb ? 'space-around' : 'center',
    alignItems: 'center',
    paddingHorizontal: isWeb ? 10 : 20,
    width: '100%',
  },
  // Adjusted card container dimensions
gameCardContainer: {
  width: isWeb ? cardWidth : '100%',
  height: 200, // Increase from 170 to 200 for more space
  margin: isWeb ? 10 : 0,
  marginBottom: 20,
  maxWidth: isWeb ? '45%' : '100%',
},
gameCard: {
  flex: 1,
  borderRadius: 16,
  overflow: 'hidden',
  backgroundColor: COLORS.cardBackground, // Optional: ensure background for visibility
},
  cardBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.6,
  },
  blurOverlay: {
    flex: 1,
  },
  cardGradient: {
    flex: 1,
    padding: 20,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'space-between',
    minHeight: 120, // Add this line to ensure enough space
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  gameTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  gameDescription: {
    fontSize: 14,
    color: COLORS.textDark,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(8, 8, 8, 0.2)',
    borderRadius: 16,
  },
  playText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginRight: 4,
    fontSize: 12,
  },
  comingSoonContainer: {
    marginVertical: 30,
    alignItems: 'center',
    width: '100%',
  },
  comingSoonText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: '500',
    fontStyle: 'italic',
  },
});