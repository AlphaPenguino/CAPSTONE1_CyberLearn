import { 
  View, 
  Text, 
  TouchableOpacity, 
  Image, 
  ScrollView, 
  ActivityIndicator,
  RefreshControl, 
  Alert,
  Platform
} from 'react-native';
import React ,{ useEffect, useState, useRef, useCallback } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useRouter } from 'expo-router';
import { API_URL } from '../../constants/api';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Dimensions, Animated } from 'react-native';
import COLORS from '@/constants/custom-colors';
import { useFocusEffect } from '@react-navigation/native';


export default function Home() {
  const { user, token, checkAuth, logout } = useAuthStore();
  const isinstructor = user?.privilege === 'instructor' || user?.privilege === 'admin';
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedModule, setSelectedModule] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [sortOrder, setSortOrder] = useState('order');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(null);
  const router = useRouter();
  const playerPosition = useRef(new Animated.ValueXY({ x: 50, y: 100 })).current;
  const [profileImageError, setProfileImageError] = useState(false);
  
  // Fetch modules data
  useFocusEffect(
    React.useCallback(() => {
      checkAuth();
      fetchModules();
      
      return () => {
        // Any cleanup code here
      };
    }, [selectedCategory, sortOrder])
  );

  // Move player animation
  const movePlayerToModule = (module, index) => {
  // Close any open menu when selecting a module
  if (menuVisible) {
    setMenuVisible(null);
  }
  
  const screenWidth = Dimensions.get('window').width;
  const modulePosition = Platform.OS === 'web' 
    ? {
        // For web: calculate position based on centered grid
        x: (index % 3) * 200 + (screenWidth / 2 - 300) + 40, // Add 40 to center on the module
        y: Math.floor(index / 3) * 180 + 40 // Add 40 to center on the module
      }
    : {
        // For mobile: use the existing calculation
        x: (index % 3) * (screenWidth / 3) + 60,
        y: Math.floor(index / 3) * 180 + 120
      };
  
  Animated.spring(playerPosition, {
    toValue: modulePosition,
    friction: 6,
    useNativeDriver: false,
  }).start();
  
  setSelectedModule(module);
};
  
  // Enhanced fetchModules with pagination, sorting and filtering
  const fetchModules = async (pageNum = 1, sortOrder = 'order') => {
    try {
      setLoading(refreshing ? false : true);
      
      // Use the progress endpoint
      const response = await fetch(`${API_URL}/progress/modules`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.status === 401) {
        logout();
        router.replace('/login');
        return;
      }
      
      const modulesData = await response.json();
      
      if (!response.ok) {
        throw new Error(modulesData.message || 'Failed to fetch modules');
      }
      
      // ✅ The progress endpoint returns modules with unlock status
      setModules(modulesData || []);
      
      // Position player at first unlocked module
      const firstUnlockedModule = modulesData.find(m => m.isUnlocked);
      if (firstUnlockedModule && !selectedModule) {
        const moduleIndex = modulesData.findIndex(m => m._id === firstUnlockedModule._id);
        movePlayerToModule(firstUnlockedModule, moduleIndex);
      }
      
      return true;
    } catch (err) {
      console.error('Error fetching modules:', err);
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  // Navigate to module details
  const navigateToModule = (moduleId) => {
    router.push(`/module/${moduleId}`);
  };

  // Add pagination controls to your UI
  const loadMoreModules = () => {
    if (hasMore && !loading) {
      fetchModules(currentPage + 1, sortOrder);
    }
  };

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchModules().then(() => {
      setRefreshing(false);
    });
  }, [selectedCategory, sortOrder]);

  // Add this function to handle module deletion
  const handleDeleteModule = (moduleId) => {
    // Show confirmation dialog
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

  // Function to actually delete the module
  const deleteModule = async (moduleId) => {
    try {
      const response = await fetch(`${API_URL}/modules/${moduleId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        // Remove module from state
        setModules(modules.filter(m => m._id !== moduleId));
        // If deleted module was selected, clear selection
        if (selectedModule?._id === moduleId) {
          setSelectedModule(null);
        }
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

    if (user?.profileImage) {
      //console.log("Attempting to load profile image:", user.profileImage);
      
      // Test if the URL is accessible
      fetch(user.profileImage)
        .then(response => {
          //console.log("Profile image response:", response.status);
        })
        .catch(error => {
          //console.log("Profile image fetch error:", error);
        });
    }
  }, [user?.profileImage], [user?.privilege, router]);

    
  // Add this helper function to your Home component
  const getCompatibleImageUrl = (url) => {
    if (!url) return null;
    
    // Check if it's a Dicebear SVG URL
    if (url.includes('dicebear') && url.includes('/svg')) {
      // For Android or iOS, convert to PNG
      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        return url.replace('/svg', '/png');
      }
    }
    return url;
  };

  return (
    <View style={styles.container}>
      {/* RPG Map Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cyber Quest Map</Text>
        {isinstructor && (
          <TouchableOpacity 
            style={styles.instructorButton}
            onPress={() => router.push('/(tabs)/create')}>
            <Ionicons name="add-circle" size={24} color={COLORS.primary} />
            <Text style={styles.instructorButtonText}>Create</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading your adventure map...</Text>
        </View>
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
        <ScrollView 
          style={styles.mapContainer} 
          contentContainerStyle={styles.mapContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[COLORS.primary]}
              tintColor="#ffffff"
              title="Refreshing map..."
              titleColor="#ffffff"
            />
          }
        >
          {/* Map Background */}
          <Image 
  source={require('../../assets/images/background1.jpg')} 
  style={[
    styles.mapBackground,
    { minHeight: Dimensions.get('window').height, height: '100%', bottom: 0 }
  ]}
  resizeMode="cover"
/>
          
          {/* Player Character */}
          <Animated.View style={[styles.player, playerPosition.getLayout()]}>
            {(user?.profileImage && !profileImageError) ? (
              <Image 
                source={{ uri: getCompatibleImageUrl(user.profileImage) }} 
                style={[styles.playerImage, styles.playerImageWithBorder]}
                onError={() => {
                  console.log("Profile image failed to load, using default");
                  setProfileImageError(true);
                }}
              />
            ) : (
              <Image 
                source={require('../../assets/images/character1.png')} 
                style={styles.playerImage}
              />
            )}
          </Animated.View>
          
          {/* Module Locations */}
          {modules.map((module, index) => (
            <TouchableOpacity
              key={module._id}
              style={[
                styles.moduleNode,
                selectedModule?._id === module._id && styles.selectedNode,
                !module.isUnlocked && styles.lockedNode,
                {
                  left: Platform.OS === 'web' 
                    ? (index % 3) * 200 + (Dimensions.get('window').width / 2 - 300) 
                    : (index % 3) * (Dimensions.get('window').width / 3) - 10,
                  top: Math.floor(index / 3) * 180,
                }
              ]}
              onPress={() => module.isUnlocked ? movePlayerToModule(module, index) : null}
              disabled={!module.isUnlocked}
            >
              {/* Lock overlay for locked modules */}
              {!module.isUnlocked && (
                <View style={styles.lockOverlay}>
                  <Ionicons name="lock-closed" size={30} color="#ffffff" />
                </View>
              )}
              
              <Image 
                source={{ uri: module.image }} 
                style={[
                  styles.moduleImage,
                  !module.isUnlocked && styles.lockedImage
                ]} 
              />
              <Text style={[
                styles.moduleName,
                !module.isUnlocked && styles.lockedText
              ]}>
                {module.title}
              </Text>
              <Text style={styles.moduleLevel}>Level {index + 1}</Text>
              
              {/* Progress indicator */}
              {module.isCompleted && (
                <View style={styles.completedBadge}>
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                </View>
              )}
              
              {module.isCurrent && !module.isCompleted && (
                <View style={styles.currentBadge}>
                  <Ionicons name="play-circle" size={20} color="#FF9800" />
                </View>
              )}
              
              {/* instructor Options Button */}
              {isinstructor && (
                <View style={styles.instructorOptionsContainer}>
                  <TouchableOpacity
                    style={styles.optionsButton}
                    onPress={(e) => {
                      e.stopPropagation(); 
                      setMenuVisible(menuVisible === module._id ? null : module._id);
                    }}
                  >
                    <Ionicons name="ellipsis-vertical" size={18} color="#ffffff" />
                  </TouchableOpacity>
                  
                  {/* Options Menu Popup */}
                  {menuVisible === module._id && (
                    <>
                      <TouchableOpacity 
                        style={styles.optionsOverlay}
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
                          <Text style={[styles.optionText, {color: '#ff4d4f'}]}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              )}
            </TouchableOpacity>
          ))}
                    
                    {selectedModule && (
                    <View
                      style={[
                        styles.infoPanel,
                        Platform.OS === 'web' && {
                          left: '50%',
                          right: 'auto',
                          transform: [{ translateX: -250 }],
                          width: 500,
                          marginBottom: 20,
                          borderRadius: 18,
                          alignSelf: 'center',
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
                    </View>
                  )}
                    
                    {/* Pagination Controls */}
                    
                  </ScrollView>
                )}
                
                {/* User Profile Panel */}
                {!loading && (
                  <View
                    style={[
                      styles.userProfilePanel,
                      Platform.OS === 'web'
                        ? {
                            position: 'absolute',
                            top: 70,
                            left: 16,
                            width: 260,
                            zIndex: 10,
                          }
                        : {
                            position: 'relative',
                            margin: 16,
                            alignSelf: 'stretch',
                          },
                    ]}
                  >
                    {/* Fantasy background overlay */}
                    <Image
                      source={require('../../assets/backgrounds/Battleground4.png')}
                      style={styles.userProfileBackground}
                      resizeMode="cover"
                    />
                    <View style={styles.userProfileHeader}>
                      <Text style={styles.userProfileTitle}>{'Profile'}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={styles.levelBadge}>
                          <Text style={styles.levelBadgeText}>
                            Lv. {user?.level || 1}
                          </Text>
                        </View>
                        {/* Sparkle/star icon next to level badge */}
                        <Ionicons name="star" size={18} color="#FFD700" style={styles.sparkleIcon} />
                      </View>
                    </View>
                    <View style={styles.userProfileContent}>
                      {/* User Avatar */}
                      <View style={styles.avatarContainer}>
                        {(user?.profileImage && !profileImageError) ? (
                          <Image
                            source={{ uri: getCompatibleImageUrl(user?.profileImage) }}
                            style={styles.userAvatar}
                            onError={() => setProfileImageError(true)}
                          />
                        ) : (
                          <View style={styles.userAvatarFallback}>
                            <Text style={styles.avatarLetterText}>
                              {user?.username?.charAt(0).toUpperCase() || '?'}
                            </Text>
                          </View>
                        )}
                        {/* User Role Badge */}
                        <View style={styles.roleBadge}>
                          <Ionicons
                            name={
                              user?.privilege === 'instructor' ? 'school' :
                              user?.privilege === 'admin' ? 'star' :
                              'person'
                            }
                            size={14}
                            color="#222"
                          />
                          <Text style={styles.roleBadgeText}>
                            {user?.privilege === 'instructor' ? 'Instructor' :
                             user?.privilege === 'admin' ? 'Admin' :
                             'Student'}
                          </Text>
                        </View>
                      </View>
                      {/* User Info */}
                      <View style={styles.userInfoBox}>
                        <Text style={styles.usernameText}>{user?.username || 'Unknown Hero'}</Text>
                        <View style={styles.infoRow}>
                          <Ionicons
                            name="ribbon-outline"
                            size={16}
                            color="#FFD700"
                          />
                          <Text style={styles.infoText}>
                            {user?.privilege === 'instructor' ? 'Instructor' :
                             user?.privilege === 'admin' ? 'Admin' :
                             'Student'}
                          </Text>
                        </View>
                        
                        <View style={styles.infoRow}>
                          <Ionicons
                            name={user?.section === 'no_section' ? 'school-outline' : 'school'}
                            size={16}
                            color={user?.section === 'no_section' ? '#aaa' : '#4CAF50'}
                          />
                          <Text style={[
                            styles.infoText,
                            user?.section === 'no_section' && { color: '#aaa', fontStyle: 'italic' }
                          ]}>
                            {user?.section === 'no_section' ? 'No Class Assigned' : user?.section}
                          </Text>
                        </View>
                      </View>
                    </View>
                    {/* XP Bar with icon */}
                    <View style={[styles.infoRow, { marginBottom: 0, marginTop: 4 }]}> 
      <Ionicons name="flame" size={16} color="#FFD700" style={styles.xpIcon} />
      <View style={[styles.xpBarBackground, { flex: 1 }]}> 
        <View style={[styles.xpBarFill, { width: `${user?.xpPercent || 0}%` }]} />
      </View>
      <Text style={styles.xpText}>{user?.xpPercent || 0}%</Text>
    </View>
                    {/* Stats Section */}
                    <View style={styles.statsContainer}>
                      <View style={styles.statItem}>
                        <Ionicons name="checkmark-circle" size={16} color="#FFD700" />
                        <Text style={styles.statValue}>
                          {modules?.filter(m => m.isCompleted)?.length || 0}
                        </Text>
                        <Text style={styles.statLabel}>Completed</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Ionicons name="trophy" size={16} color="#FFD700" />
                        <Text style={styles.statValue}>
                          {modules?.filter(m => m.isUnlocked && !m.isCompleted)?.length || 0}
                        </Text>
                        <Text style={styles.statLabel}>Available</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Ionicons name="lock-closed" size={16} color="#FFD700" />
                        <Text style={styles.statValue}>
                          {modules?.filter(m => !m.isUnlocked)?.length || 0}
                        </Text>
                        <Text style={styles.statLabel}>Locked</Text>
                      </View>
                    </View>
                  </View>
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
    textShadowColor: 'rgba(0, 150, 255, 0.7)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
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
    minHeight: 600,
    paddingBottom: 100,
  },
  mapBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.7,
  },
  player: {
    position: 'absolute',
    width: 40,
    height: 40,
    zIndex: 5, // Reduced from 10 to 5
  },
  playerImage: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  moduleNode: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 40,
    backgroundColor: 'rgba(25, 118, 210, 0.3)',
    borderWidth: 2,
    borderColor: '#1976d2',
    shadowColor: '#1976d2',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 1,
    zIndex: 4, // Add this line
  },
  selectedNode: {
    borderColor: '#cfb645ff',
    borderWidth: 3,
    backgroundColor: 'rgba(199, 255, 94, 0.3)',
    shadowColor: '#b9ee56ff',
    transform: [{ scale: 1.1 }],
  },
  lockedNode: {
    opacity: 0.5,
  },
  moduleImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  moduleName: {
    color: '#ffffff',
    fontWeight: 'bold',
    textAlign: 'center',
    position: 'absolute',
    bottom: -25,
    width: 100,
    fontSize: 12,
  },
  moduleLevel: {
    position: 'absolute',
    top: -20,
    backgroundColor: '#247f9bff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  infoPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(10, 25, 41, 0.9)',
    padding: 16,
    borderTopWidth: 2,
    borderTopColor: COLORS.primary,
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
  loadMoreButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  loadMoreText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  instructorOptionsContainer: {
    position: 'absolute',
    top: -6,
    right: -6,
    zIndex: 30, // Increased from 20 to 30
  },
  optionsButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    width: 24,
    height: 24,
    borderRadius: 12,
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
    zIndex: 50, // This is already good
    elevation: 6, // Add elevation for Android
    // Add shadow for better visibility
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  optionsOverlay: {
    position: 'absolute',
    top: -10,
    right: -10,
    padding: 10,
    backgroundColor: 'transparent',
    zIndex: 45, // Add this line
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
    borderRadius: 10,
  },
  lockedImage: {
    opacity: 0.3,
  },
  lockedText: {
    opacity: 0.5,
  },
  completedBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 2,
  },
  currentBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 2,
  },
  lockedChallenge: {
    opacity: 0.6,
  },
  quizLockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderRadius: 15,
  },
  lockText: {
    color: '#ffffff',
    marginTop: 8,
    textAlign: 'center',
    fontSize: 14,
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
  backgroundColor: 'rgba(10, 25, 41, 0.95)',
  borderRadius: 16,
  padding: 16,
  borderWidth: 2,
  borderColor: '#FFD700',
  shadowColor: '#FFD700',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.7,
  shadowRadius: 16,
  elevation: 8,
  overflow: 'hidden',
},
userProfileBackground: {
  ...StyleSheet.absoluteFillObject,
  opacity: 0.18,
  zIndex: -1,
},
sparkleIcon: {
  marginLeft: 4,
  marginTop: -2,
},
xpIcon: {
  marginRight: 4,
  marginTop: 1,
},
userProfileHeader: {
  borderBottomWidth: 1,
  borderBottomColor: 'rgba(255, 215, 0, 0.2)',
  paddingBottom: 8,
  marginBottom: 12,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
},
userProfileTitle: {
  color: '#FFD700',
  fontSize: 15, // reduced from 18
  fontWeight: 'bold',
  fontFamily: 'PixeloidSans-Bold',
  textShadowColor: '#000',
  textShadowOffset: { width: 1, height: 1 },
  textShadowRadius: 2,
  lineHeight: 18, // add lineHeight for better spacing
},
levelBadge: {
  backgroundColor: '#222',
  borderRadius: 12,
  minWidth: 48,
  minHeight: 28,
  paddingHorizontal: 14,
  paddingVertical: 4,
  borderWidth: 2,
  borderColor: '#FFD700',
  marginLeft: 8,
  justifyContent: 'center',
  alignItems: 'center',
  alignSelf: 'flex-start',
},
levelBadgeText: {
  color: '#FFD700',
  fontWeight: 'bold',
  fontSize: 13, // reduced from 15
  fontFamily: 'PixeloidSans-Bold',
  textAlign: 'center',
  includeFontPadding: false,
  textAlignVertical: 'center',
  lineHeight: 16, // add lineHeight
},
userProfileContent: {
  flexDirection: 'row',
  marginBottom: 12,
  alignItems: 'flex-start',
  flexWrap: 'wrap',
},
avatarContainer: {
  position: 'relative',
  marginRight: 12,
  minWidth: 64,
  minHeight: 64,
  justifyContent: 'center',
  alignItems: 'center',
},
userAvatar: {
  width: 64,
  height: 64,
  borderRadius: 32,
  borderWidth: 3,
  borderColor: '#FFD700',
  backgroundColor: '#222',
  marginBottom: 8,
},
userAvatarFallback: {
  width: 64,
  height: 64,
  borderRadius: 32,
  backgroundColor: '#1976d2',
  justifyContent: 'center',
  alignItems: 'center',
  borderWidth: 3,
  borderColor: '#FFD700',
  marginBottom: 8,
},
avatarLetterText: {
  color: '#fff',
  fontSize: 28,
  fontWeight: 'bold',
  fontFamily: 'PixeloidSans-Bold',
},
roleBadge: {
  position: 'absolute',
  bottom: -8,
  right: -8,
  backgroundColor: '#FFD700',
  borderRadius: 12,
  paddingHorizontal: 7,
  paddingVertical: 3,
  flexDirection: 'row',
  alignItems: 'center',
  borderWidth: 2,
  borderColor: '#fff',
  shadowColor: '#FFD700',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.7,
  shadowRadius: 6,
  zIndex: 2,
},
roleBadgeText: {
  color: '#222',
  fontWeight: 'bold',
  marginLeft: 4,
  fontSize: 10, // reduced from 12
  fontFamily: 'PixeloidSans-Bold',
  lineHeight: 12, // add lineHeight
},
userInfoBox: {
  flex: 1,
  minWidth: 120,
  justifyContent: 'center',
  flexShrink: 1,
},
usernameText: {
  color: '#FFD700',
  fontSize: 15, // reduced from 18
  fontWeight: 'bold',
  fontFamily: 'PixeloidSans-Bold',
  marginBottom: 4,
  textShadowColor: '#000',
  textShadowOffset: { width: 1, height: 1 },
  textShadowRadius: 2,
  lineHeight: 18, // add lineHeight
  flexShrink: 1, // allow shrinking
},
infoRow: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 4,
},
infoText: {
  color: '#fff',
  marginLeft: 4,
  fontSize: 12, // reduced from 14
  fontFamily: 'PixeloidSans-Bold',
  lineHeight: 15, // add lineHeight
  flexShrink: 1, // allow shrinking
},
xpBarBackground: {
  height: 10,
  backgroundColor: '#333',
  borderRadius: 5,
  overflow: 'hidden',
  marginTop: 8,
  marginBottom: 2,
},
xpBarFill: {
  height: 10,
  backgroundColor: '#FFD700',
  borderRadius: 5,
},
xpText: {
  fontSize: 10, // reduced from 11
  color: '#FFD700',
  fontFamily: 'PixeloidSans-Bold',
  marginBottom: 4,
  lineHeight: 12, // add lineHeight
},
statsContainer: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  paddingVertical: 8,
  borderTopWidth: 1,
  borderTopColor: '#FFD70044',
},
statItem: {
  flex: 1,
  alignItems: 'center',
},
statValue: {
  color: '#FFD700',
  fontSize: 16, // reduced from 20
  fontWeight: 'bold',
  fontFamily: 'PixeloidSans-Bold',
  textShadowColor: '#000',
  textShadowOffset: { width: 1, height: 1 },
  textShadowRadius: 2,
  lineHeight: 18, // add lineHeight
},
statLabel: {
  color: '#fff',
  fontSize: 10, // reduced from 12
  fontFamily: 'PixeloidSans-Bold',
  lineHeight: 12, // add lineHeight
},
  
});