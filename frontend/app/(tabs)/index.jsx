import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
  StyleSheet,
  Animated,
  useWindowDimensions,
} from 'react-native';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useRouter } from 'expo-router';
import { API_URL } from '../../constants/api';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import COLORS from '@/constants/custom-colors';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';

const AnimatedScrollView = Animated.ScrollView;

export default function Home() {
  const { user, token, checkAuth, logout } = useAuthStore();
  const isInstructor = user?.privilege === 'instructor' || user?.privilege === 'admin';
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedModule, setSelectedModule] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showProfileOnMobile, setShowProfileOnMobile] = useState(false); // <-- New state variable
  const [totalXP, setTotalXP] = useState(0);
  const [totalCompletedQuizzes, setTotalCompletedQuizzes] = useState(0);
  const { width, height } = useWindowDimensions();

  const isMobile = Platform.OS !== 'web' && width < 768;

  // 1. Create two separate Animated.Value instances
  const scrollY = useRef(new Animated.Value(0)).current;
  const nativeScrollY = useRef(new Animated.Value(0)).current;

  const [menuVisible, setMenuVisible] = useState(null);
  const router = useRouter();
  const playerPosition = useRef(new Animated.ValueXY({ x: 50, y: 100 })).current;
  const [profileImageError, setProfileImageError] = useState(false);

  const MODULE_VERTICAL_SPACING = isMobile ? 60 : 75;
  const HORIZONTAL_OFFSET = isMobile ? (width * 0.25) : 150;
  const MODULE_SIZE = isMobile ? 60 : 80;
  const PLAYER_SIZE = isMobile ? 30 : 40;
  const INITIAL_TOP_OFFSET = isMobile ? 80 : 100;
  const TITLE_VERTICAL_OFFSET = isMobile ? 10 : 15;

  const INFO_PANEL_HEIGHT = isMobile ? 150 : 180;
  const PROFILE_PANEL_HEIGHT = isMobile ? 180 : 200;

  // Update the panel animations
  const infoPanelTranslateY = Platform.OS === 'web' ? 
    scrollY.interpolate({
      inputRange: [0, 100],
      outputRange: [0, 10],
      extrapolate: 'clamp',
    }) :
    nativeScrollY.interpolate({
      inputRange: [0, 100],
      outputRange: [0, 10],
      extrapolate: 'clamp',
    });

  const profilePanelTranslateY = Platform.OS === 'web' ? 
    scrollY.interpolate({
      inputRange: [0, 100],
      outputRange: [0, 10],
      extrapolate: 'clamp',
    }) :
    nativeScrollY.interpolate({
      inputRange: [0, 100],
      outputRange: [0, 10],
      extrapolate: 'clamp',
    });

  useFocusEffect(
    useCallback(() => {
      checkAuth();
      fetchModules();
    }, [])
  );

  const getModuleCalculatedCenter = (index) => {
    let x;
    let y = index * MODULE_VERTICAL_SPACING + INITIAL_TOP_OFFSET;

    if (index === 0) {
      x = width / 2 - HORIZONTAL_OFFSET;
    } else if (index === 1) {
      x = width / 2;
    } else if (index === 2) {
      x = width / 2 + HORIZONTAL_OFFSET;
    } else {
      const adjustedIndex = index - 3;
      const linePairIndex = Math.floor(adjustedIndex / 2);
      const positionInLinePair = adjustedIndex % 2;

      if (linePairIndex % 2 === 0) {
        if (positionInLinePair === 0) {
          x = width / 2;
        } else {
          x = width / 2 - HORIZONTAL_OFFSET;
        }
      } else {
        if (positionInLinePair === 0) {
          x = width / 2;
        } else {
          x = width / 2 + HORIZONTAL_OFFSET;
        }
      }
    }
    return { x, y };
  };

  const movePlayerToModule = (module, index) => {
    if (menuVisible) {
      setMenuVisible(null);
    }

    const { x, y } = getModuleCalculatedCenter(index);

    const playerTargetPosition = {
      x: x - PLAYER_SIZE / 2,
      y: y - PLAYER_SIZE / 2,
    };

    Animated.spring(playerPosition, {
      toValue: playerTargetPosition,
      friction: 6,
      tension: 40,
      useNativeDriver: false,
    }).start();
    setSelectedModule(module);
  };

  const fetchModules = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/progress/modules`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 401) {
        logout();
        router.replace('/login');
        return;
      }
      const data = await response.json();
      setModules(data);
      
      // Calculate total XP from all modules
      const totalCookies = data.reduce((sum, module) => sum + (module.totalXP || 0), 0);
      setTotalXP(totalCookies);
      
      // Calculate total completed quizzes
      let completedQuizCount = 0;
      data.forEach(module => {
        // If module has completedQuizzes property, use it
        if (module.completedQuizzes && Array.isArray(module.completedQuizzes)) {
          completedQuizCount += module.completedQuizzes.length;
        }
      });
      setTotalCompletedQuizzes(completedQuizCount);

      const firstUnlocked = data.find(m => m.isUnlocked);
      if (firstUnlocked && !selectedModule) {
        const i = data.findIndex(m => m._id === firstUnlocked._id);
        movePlayerToModule(firstUnlocked, i);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchModules().then(() => setRefreshing(false));
  }, []);

  const navigateToModule = (moduleId) => {
    router.push(`/module/${moduleId}`);
  };

  const handleDeleteModule = (moduleId) => {
    if (Platform.OS === 'web') {
      if (confirm('Are you sure you want to delete this module?')) {
        deleteModule(moduleId);
      }
    } else {
      Alert.alert(
        'Delete Module',
        'Are you sure you want to delete this module?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', onPress: () => deleteModule(moduleId), style: 'destructive' }
        ]
      );
    }
  };

  const deleteModule = async (moduleId) => {
    try {
      const response = await fetch(`${API_URL}/modules/${moduleId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        setModules(modules.filter(m => m._id !== moduleId));
        if (selectedModule?._id === moduleId) {
          setSelectedModule(null);
        }
        setMenuVisible(null);
      } else {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete module');
      }
    } catch (error) {
      console.error('Error deleting module:', error);
      alert('Failed to delete module: ' + error.message);
    }
  };

  useEffect(() => {
    if (user?.privilege === 'admin') {
      router.replace('/(tabs)/users');
    }
  }, [user?.privilege, router]);

  const getCompatibleImageUrl = url => {
    if (!url) return null;
    if (url.includes('dicebear') && url.includes('/svg')) {
      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        return url.replace('/svg', '/png');
      }
    }
    return url;
  };

  const generatePathD = () => {
    if (modules.length === 0) return '';

    let pathD = '';
    modules.forEach((_, index) => {
      const { x, y } = getModuleCalculatedCenter(index);
      if (index === 0) {
        pathD += `M ${x} ${y}`;
      } else {
        pathD += ` L ${x} ${y}`;
      }
    });
    return pathD;
  };

  useEffect(() => {
    if (Platform.OS !== 'web') {
      // Preload background image
      Image.prefetch(Image.resolveAssetSource(require('../../assets/images/BG5.jpg')).uri)
        .then(() => console.log('Background image preloaded successfully'))
        .catch(err => console.error('Error preloading background image:', err));
    }
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cyber Quest Map</Text>
        <View style={{ flexDirection: 'row' }}>
          {Platform.OS !== 'web' && (
            <TouchableOpacity
              style={[styles.instructorButton, styles.profileToggleButton]}
              onPress={() => setShowProfileOnMobile(!showProfileOnMobile)}>
              <Ionicons name="person" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          )}
          {isInstructor && (
            <TouchableOpacity
              style={styles.instructorButton}
              onPress={() => router.push('/(tabs)/create')}>
              <Ionicons name="add-circle" size={24} color={COLORS.primary} />
              <Text style={styles.instructorButtonText}>Create</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} />
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={40} color={COLORS.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchModules}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : modules.length === 0 ? (
        <View style={styles.errorContainer}>
          <Ionicons name="school-outline" size={50} color={COLORS.textSecondary} />
          <Text style={styles.emptyModulesTitle}>No Modules Available</Text>
          <Text style={styles.emptyModulesText}>
            Your instructor hasn&apos;t created any modules for your class yet.
          </Text>
        </View>
      ) : (
        <AnimatedScrollView
          style={styles.mapContainer}
          contentContainerStyle={[
            styles.mapContent,
            { paddingBottom: Platform.OS === 'web' ? 300 : height * 0.35 }
          ]}
          onScroll={Platform.OS === 'web' ? 
            // For web: Use the regular scrollY value
            Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: false }  // Set to false for web
            ) : 
            // For mobile: Use the native-driver compatible value
            Animated.event(
              [{ nativeEvent: { contentOffset: { y: nativeScrollY } } }],
              { useNativeDriver: true }   // Keep true for mobile
            )
          }
          scrollEventThrottle={16}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        >
          <View style={{
  position: 'absolute',
  width: '100%',
  height: '100%',
  backgroundColor: '#061223', // Dark blue fallback
  opacity: 1,
  left: 0,
  top: 0,
  zIndex: 0,
}} />

{/* Then your Image component */}
<Image
  source={require('../../assets/images/BG5.jpg')}
  style={{
    position: 'absolute',
    width: '100%',
    height: Platform.OS === 'web' 
      ? Math.max(height, modules.length * MODULE_VERTICAL_SPACING + INITIAL_TOP_OFFSET + 300) 
      : '100%',
    opacity: 0.7,
    left: 0,
    top: 0,
    zIndex: 1,
  }}
  resizeMode={Platform.OS === 'web' ? "cover" : "repeat"}
  onError={() => console.log('Error loading background image')}
/>

          <Svg
            height={modules.length * MODULE_VERTICAL_SPACING + 600}
            width="100%"
            style={styles.svgPathContainer}
          >
            <Path
              d={generatePathD()}
              stroke="#2dffeeff"
              strokeWidth="15"
              fill="none"
            />
          </Svg>

          {/* Player Character */}
          <Animated.View style={[styles.player, playerPosition.getLayout()]}>
            {user?.profileImage && !profileImageError ? (
              <Image
                source={{ uri: getCompatibleImageUrl(user.profileImage) }}
                style={[styles.playerImage, { width: PLAYER_SIZE * 0.875, height: PLAYER_SIZE * 0.875, borderRadius: (PLAYER_SIZE * 0.875) / 2 }]}
                onError={() => setProfileImageError(true)}
              />
            ) : (
              // Player Image - CORRECTED PATH
              // This path assumes character1.png is in app/assets/images/ relative to your project root
              <Image source={require('../../assets/images/character1.png')} style={[styles.playerImage, { width: PLAYER_SIZE * 0.875, height: PLAYER_SIZE * 0.875, borderRadius: (PLAYER_SIZE * 0.875) / 2 }]} />
            )}
          </Animated.View>

          {/* Module Nodes */}
          {modules.map((module, index) => {
            const { x, y } = getModuleCalculatedCenter(index);

            return (
              <React.Fragment key={module._id}>
                <TouchableOpacity
                  style={{
                    position: 'absolute',
                    left: x - MODULE_SIZE / 2,
                    top: y - MODULE_SIZE / 2,
                    width: MODULE_SIZE,
                    height: MODULE_SIZE,
                    borderRadius: MODULE_SIZE / 2,
                    backgroundColor: 'rgba(25, 118, 210, 0.3)',
                    borderWidth: 2,
                    borderColor: '#1976d2',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 2,
                    ...(selectedModule?._id === module._id && styles.selectedNode),
                  }}
                  onPress={() => module.isUnlocked && movePlayerToModule(module, index)}
                  disabled={!module.isUnlocked}
                >
                  {!module.isUnlocked && (
                    <View style={[styles.lockOverlay, { borderRadius: MODULE_SIZE / 2 }]}>
                      <Ionicons name="lock-closed" size={MODULE_SIZE * 0.5} color="#ffffff" />
                    </View>
                  )}

                  <Image
                    source={typeof module.image === 'string' ? { uri: module.image } : module.image}
                    style={{
                      width: MODULE_SIZE * 0.6,
                      height: MODULE_SIZE * 0.6,
                      borderRadius: (MODULE_SIZE * 0.6) / 2,
                      opacity: module.isUnlocked ? 1 : 0.4,
                    }}
                  />

                  {module.isCompleted && (
                    <View style={[styles.completedBadge, { right: -MODULE_SIZE * 0.08, top: -MODULE_SIZE * 0.08 }]}>
                      <Ionicons name="checkmark-circle" size={MODULE_SIZE * 0.25} color="#4CAF50" />
                    </View>
                  )}
                  {module.isCurrent && !module.isCompleted && (
                    <View style={[styles.currentBadge, { right: -MODULE_SIZE * 0.08, top: -MODULE_SIZE * 0.08 }]}>
                      <Ionicons name="play-circle" size={MODULE_SIZE * 0.25} color="#FF9800" />
                    </View>
                  )}

                  {isInstructor && (
                    <View style={[styles.instructorOptionsContainer, { top: -MODULE_SIZE * 0.08, right: -MODULE_SIZE * 0.08 }]}>
                      <TouchableOpacity
                        style={[styles.optionsButton, { width: MODULE_SIZE * 0.3, height: MODULE_SIZE * 0.3, borderRadius: (MODULE_SIZE * 0.3) / 2 }]}
                        onPress={(e) => {
                          e.stopPropagation();
                          setMenuVisible(menuVisible === module._id ? null : module._id);
                        }}
                      >
                        <Ionicons name="ellipsis-vertical" size={MODULE_SIZE * 0.225} color="#ffffff" />
                      </TouchableOpacity>

                      {menuVisible === module._id && (
                        <>
                          {/* FIX: Dynamic dimensions applied directly here for optionsOverlay */}
                          <TouchableOpacity
                            style={[
                                styles.optionsOverlay,
                                {
                                    top: -height,
                                    left: -width,
                                    width: width * 2,
                                    height: height * 2,
                                }
                            ]}
                            onPress={(e) => {
                              e.stopPropagation();
                              setMenuVisible(null);
                            }}
                            activeOpacity={0}
                          />
                          <View style={styles.optionsMenu}>
                            <TouchableOpacity
                              style={styles.optionItem}
                              onPress={() => {
                                setMenuVisible(null);
                                router.push(`/module/edit/${module._id}`);
                              }}
                            >
                              <Ionicons name="create-outline" size={16} color="#ffffff" />
                              <Text style={styles.optionText}>Edit</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[styles.optionItem, styles.deleteOption]}
                              onPress={() => {
                                setMenuVisible(null);
                                handleDeleteModule(module._id);
                              }}
                            >
                              <Ionicons name="trash-outline" size={16} color="#ff4d4f" />
                              <Text style={[styles.optionText, { color: '#ff4d4f' }]}>Delete</Text>
                            </TouchableOpacity>
                          </View>
                        </>
                      )}
                    </View>
                  )}
                </TouchableOpacity>

                {/* Module Title */}
                <Text style={{
                  position: 'absolute',
                  left: x - (MODULE_SIZE * 1.2) / 2,
                  top: y + MODULE_SIZE / 2 + TITLE_VERTICAL_OFFSET,
                  width: MODULE_SIZE * 1.2,
                  color: '#fff',
                  fontSize: isMobile ? 9 : 10,
                  textAlign: 'center',
                  zIndex: 3,
                }}>
                  {module.title || `Module ${index + 1}`}
                </Text>
              </React.Fragment>
            );
          })}
        </AnimatedScrollView>
      )}

      {/* Info Panel */}
      {selectedModule && (
        <Animated.View
          style={[
            styles.infoPanel,
            {
              width: width * 0.9,
              left: width * 0.05,
              bottom: 20,
            },
            Platform.OS === 'web' ? {
              maxWidth: 500,
              width: 500,
              left: '50%',
              transform: [{ translateX: -250 }],
              borderRadius: 18,
            } : {
              transform: [{ translateY: infoPanelTranslateY }],
            }
          ]}
        >
          <Text style={styles.infoTitle}>{selectedModule.title}</Text>
          <Text style={styles.infoDescription}>{selectedModule.description}</Text>
          <TouchableOpacity
            style={styles.startButton}
            onPress={() => navigateToModule(selectedModule._id)}
          >
            <Text style={styles.startButtonText}>Begin Quest</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Profile Panel */}
      {!loading && (Platform.OS === 'web' || showProfileOnMobile) && (
        <Animated.View
          style={[
            styles.userProfilePanel,
            Platform.OS === 'web' 
              ? {
                  display: 'flex',
                  width: 220,
                  left: 16,
                  top: 80,
                }
              : {
                  display: 'flex',
                  width: width * 0.9,
                  left: width * 0.05,
                  bottom: selectedModule ? 230 : 30,
                  top: undefined,
                  borderRadius: 16,
                  padding: 16,
                  elevation: 10,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 5,
                  transform: [{ translateY: profilePanelTranslateY }],
                }
          ]}
        >
          {/* Mobile Header with Close button */}
          <View style={[
            styles.userProfileHeader, 
            Platform.OS !== 'web' && { 
              flexDirection: 'row', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              paddingBottom: 12,
              marginBottom: 16,
            }
          ]}>
            <Text style={[
              styles.userProfileTitle,
              Platform.OS !== 'web' && { fontSize: 18 }
            ]}>Your Profile</Text>
            
            {Platform.OS !== 'web' && (
              <TouchableOpacity 
                onPress={() => setShowProfileOnMobile(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={22} color={COLORS.primary} />
              </TouchableOpacity>
            )}
          </View>

          {/* User Info Section */}
          <View style={[
            styles.userProfileContent,
            Platform.OS !== 'web' && { 
              flexDirection: 'row', 
              alignItems: 'center',
              marginBottom: 16,
            }
          ]}>
            <View style={[
              styles.avatarContainer,
              Platform.OS !== 'web' && { marginRight: 16 }
            ]}>
              {(user?.profileImage && !profileImageError) ? (
                <Image
                  source={{ uri: getCompatibleImageUrl(user?.profileImage) }}
                  style={[
                    styles.userAvatar,
                    Platform.OS !== 'web' && { width: 60, height: 60, borderRadius: 30 }
                  ]}
                  onError={() => setProfileImageError(true)}
                />
              ) : (
                <View style={[
                  styles.userAvatarFallback,
                  Platform.OS !== 'web' && { width: 60, height: 60, borderRadius: 30 }
                ]}>
                  <Text style={[
                    styles.avatarLetterText,
                    Platform.OS !== 'web' && { fontSize: 24 }
                  ]}>
                    {user?.username?.charAt(0).toUpperCase() || '?'}
                  </Text>
                </View>
              )}

              <View style={[
                styles.roleBadge,
                Platform.OS !== 'web' && { padding: 3 }
              ]}>
                <Ionicons
                  name={
                    user?.privilege === 'instructor' ? 'shield' :
                      user?.privilege === 'admin' ? 'star' :
                        'person'
                  }
                  size={Platform.OS === 'web' ? 12 : 14}
                  color="#fff"
                />
              </View>
            </View>

            <View style={styles.userInfoBox}>
              <Text style={[
                styles.usernameText,
                Platform.OS !== 'web' && { fontSize: 16, marginBottom: 6 }
              ]}>
                {user?.username || 'Unknown Hero'}
              </Text>

              <View style={styles.infoRow}>
                <Ionicons
                  name="ribbon-outline"
                  size={Platform.OS === 'web' ? 16 : 14}
                  color={COLORS.primary}
                />
                <Text style={[
                  styles.infoText, 
                  Platform.OS !== 'web' && { fontSize: 14 }
                ]}>
                  {user?.privilege === 'instructor' ? 'Instructor' :
                    user?.privilege === 'admin' ? 'Admin' :
                      'Student'}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Ionicons
                  name={user?.section === 'no_section' ? 'school-outline' : 'school'}
                  size={Platform.OS === 'web' ? 16 : 14}
                  color={user?.section === 'no_section' ? '#aaa' : '#4CAF50'}
                />
                <Text style={[
                  styles.infoText,
                  Platform.OS !== 'web' && { fontSize: 14 },
                  user?.section === 'no_section' && { color: '#aaa', fontStyle: 'italic' }
                ]}>
                  {user?.section === 'no_section' ? 'No Class' : user?.section}
                </Text>
              </View>
            </View>
          </View>

          {/* Stats Container */}
          <View style={[
            styles.statsContainer,
            Platform.OS !== 'web' && { 
              paddingVertical: 12,
              marginBottom: 8,
              borderTopWidth: 1,
              borderBottomWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.1)',
            }
          ]}>
            <View style={styles.statItem}>
              <Text style={[
                styles.statValue,
                Platform.OS !== 'web' && { fontSize: 18 }
              ]}>
                {modules?.filter(m => m.isCompleted)?.length || 0}
              </Text>
              <Text style={[
                styles.statLabel,
                Platform.OS !== 'web' && { fontSize: 12 }
              ]}>Completed</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={[
                styles.statValue,
                Platform.OS !== 'web' && { fontSize: 18 }
              ]}>
                {modules?.filter(m => m.isUnlocked && !m.isCompleted)?.length || 0}
              </Text>
              <Text style={[
                styles.statLabel,
                Platform.OS !== 'web' && { fontSize: 12 }
              ]}>Available</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={[
                styles.statValue,
                Platform.OS !== 'web' && { fontSize: 18 }
              ]}>
                {modules?.filter(m => !m.isUnlocked)?.length || 0}
              </Text>
              <Text style={[
                styles.statLabel,
                Platform.OS !== 'web' && { fontSize: 12 }
              ]}>Locked</Text>
            </View>
          </View>

          {/* Rewards Section */}
          <View style={Platform.OS !== 'web' && styles.rewardsContainer}>
            {/* Cookies */}
            <View style={[
              styles.cookiesContainer,
              Platform.OS !== 'web' && { 
                marginTop: 4, 
                marginBottom: 8,
                paddingVertical: 8,
                backgroundColor: 'rgba(255, 215, 0, 0.05)',
                borderRadius: 12,
                paddingHorizontal: 12
              }
            ]}>
              <View style={[
                styles.cookiesIconContainer,
                Platform.OS !== 'web' && {
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                }
              ]}>
                <MaterialCommunityIcons 
                  name="cookie" 
                  size={Platform.OS === 'web' ? 20 : 18} 
                  color="#FFD700" 
                />
              </View>
              <View style={styles.cookiesTextContainer}>
                <Text style={styles.cookiesLabel}>Total Cookies</Text>
                <Text style={[
                  styles.cookiesValue,
                  Platform.OS !== 'web' && { fontSize: 18 }
                ]}>{totalXP}</Text>
              </View>
            </View>

            {/* Cakes */}
            <View style={[
              styles.cookiesContainer,
              Platform.OS !== 'web' && { 
                marginBottom: 4,
                paddingVertical: 8,
                backgroundColor: 'rgba(255, 105, 180, 0.05)',
                borderRadius: 12,
                paddingHorizontal: 12
              }
            ]}>
              <View style={[
                styles.cookiesIconContainer,
                Platform.OS !== 'web' && {
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: 'rgba(255, 105, 180, 0.2)'
                }
              ]}>
                <MaterialCommunityIcons 
                  name="cake" 
                  size={Platform.OS === 'web' ? 20 : 18} 
                  color="#FF69B4" 
                />
              </View>
              <View style={styles.cookiesTextContainer}>
                <Text style={styles.cookiesLabel}>Total Cakes</Text>
                <Text style={[
                  styles.cookiesValue,
                  { color: '#FF69B4' },
                  Platform.OS !== 'web' && { fontSize: 18 }
                ]}>{totalCompletedQuizzes}</Text>
              </View>
            </View>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1929',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#1e3a5f',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  instructorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(25, 118, 210, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  instructorButtonText: {
    color: COLORS.primary,
    marginLeft: 4,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a1929',
  },
  loadingText: {
    marginTop: 16,
    color: '#ffffff',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a1929',
  },
  errorText: {
    color: '#ff6b6b',
    marginTop: 12,
    marginBottom: 24,
    fontSize: 16,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  mapContainer: {
    flex: 1,
  },
  mapContent: {
    position: 'relative',
  },
  player: {
    position: 'absolute',
    zIndex: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerImage: {
    resizeMode: 'contain',
    borderWidth: 2,
    borderColor: '#1976d2',
    backgroundColor: 'rgba(25, 118, 210, 0.2)',
  },
  svgPathContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 1,
  },
  selectedNode: {
    borderColor: '#8581f9ff',
    borderWidth: 3,
    backgroundColor: 'rgba(39, 104, 148, 0.3)',
    shadowColor: '#270453ff',
    transform: [{ scale: 1.1 }],
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  completedBadge: {
    position: 'absolute',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 2,
    zIndex: 15,
  },
  currentBadge: {
    position: 'absolute',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 2,
    zIndex: 15,
  },
  infoPanel: {
    position: 'absolute',
    backgroundColor: 'rgba(10, 25, 41, 0.9)',
    padding: 16,
    borderTopWidth: 2,
    borderTopColor: COLORS.primary,
    zIndex: 60,
    borderRadius: 8,
  },
  infoTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  infoDescription: {
    color: '#cccccc',
    marginBottom: 16,
  },
  startButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  startButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  instructorOptionsContainer: {
    position: 'absolute',
    zIndex: 30,
  },
  optionsButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffffff44',
  },
  optionsMenu: {
    position: 'absolute',
    top: 28,
    right: 0,
    backgroundColor: 'rgba(10, 25, 41, 0.95)',
    borderRadius: 8,
    width: 100,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#1976d2',
    zIndex: 50,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  optionsOverlay: {
    position: 'absolute',
    backgroundColor: 'transparent',
    zIndex: 45,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  optionText: {
    color: '#ffffff',
    marginLeft: 8,
    fontSize: 12,
  },
  deleteOption: {
    borderTopWidth: 1,
    borderTopColor: '#ffffff22',
  },
  emptyModulesTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyModulesText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    marginHorizontal: 32,
    lineHeight: 24,
  },
  userProfilePanel: {
    position: 'absolute',
    backgroundColor: 'rgba(10, 25, 41, 0.95)', // Make slightly more opaque
    borderRadius: 12,
    padding: 12,
    zIndex: 50, // Increase z-index to ensure it's on top
    borderWidth: 1,
    borderColor: '#1976d2',
    shadowColor: '#1976d2',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
    paddingBottom: Platform.OS === 'web' ? 12 : 16, // Add extra padding at bottom for mobile
  },
  userProfilePanelMobile: {
    marginVertical: 10,
    borderRadius: 16,
    padding: 16,
  },
  userProfileHeader: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    paddingBottom: 8,
    marginBottom: 12,
  },
  userProfileTitle: {
    color: '#cfb645ff',
    fontSize: 16,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  userProfileContent: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  userAvatarFallback: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1976d2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1976d2',
  },
  avatarLetterText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  roleBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 150, 255, 0.7)',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  userInfoBox: {
    flex: 1,
    justifyContent: 'center',
  },
  usernameText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoText: {
    color: '#cccccc',
    marginLeft: 4,
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#ffffff22',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#cccccc',
    fontSize: 12,
  },
  profileToggleButton: {
    marginRight: 8,
    backgroundColor: 'rgba(25, 118, 210, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  cookiesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  cookiesIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  cookiesTextContainer: {
    justifyContent: 'center',
  },
  cookiesLabel: {
    color: '#ffffff',
    fontSize: 12,
    marginBottom: 2,
  },
  cookiesValue: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Add these styles if you want to customize the cake display
  cakesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  cakesIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 105, 180, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  cakesTextContainer: {
    justifyContent: 'center',
  },
  cakesLabel: {
    color: '#ffffff',
    fontSize: 12,
    marginBottom: 2,
  },
  cakesValue: {
    color: '#FF69B4',
    fontSize: 16,
    fontWeight: 'bold',
  },
  rewardsContainer: {
    width: '100%',  // Ensure it takes full width
    paddingTop: 4,
    paddingBottom: 8,
  },
});