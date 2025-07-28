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
import {Easing} from 'react-native';


export default function Home() {
  const { user, token, checkAuth, logout } = useAuthStore();
  const isAdmin = user?.privilege === 'admin' || user?.privilege === 'superadmin';
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
  const [scrollY, setScrollY] = useState(0);
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
    if (menuVisible) {
      setMenuVisible(null);
    }
    
    const screenWidth = Dimensions.get('window').width;
    const modulePosition = {
      x: screenWidth / 2 + (index % 2 === 0 ? -150 : 150) - 15, // Adjust by -15 to center horizontally
      y: index * 300 + 15 // Adjust by +15 to center vertically
    };
    
    Animated.spring(playerPosition, {
      toValue: modulePosition,
      friction: 6,
      tension: 40,
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

    if (user?.privilege === 'superadmin') {
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
        {isAdmin && (
          <TouchableOpacity 
            style={styles.adminButton}
            onPress={() => router.push('/(tabs)/create')}>
            <Ionicons name="add-circle" size={24} color={COLORS.primary} />
            <Text style={styles.adminButtonText}>Create</Text>
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
            Your instructor hasn't created any modules for your class yet.
          </Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.mapContainer} 
          contentContainerStyle={styles.mapContent}
          onScroll={(event) => {
            const offsetY = event.nativeEvent.contentOffset.y;
            setScrollY(offsetY);
          }}
          scrollEventThrottle={16} // Optimize scroll event firing
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
  source={require('../../assets/images/BG5.jpg')} 
  style={[
    styles.mapBackground,
    { 
      minHeight: Math.max(
        Dimensions.get('window').height,
        modules.length * 300 + 600
      ),
      height: '100%',
      width: '100%',
    }
  ]}
  resizeMode="cover"
  fadeDuration={0}
  loading="eager"
  // Add these quality settings
  resizeMethod="scale"
  progressiveRenderingEnabled={true}
  defaultSource={require('../../assets/images/BG5.jpg')}
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
            <React.Fragment key={`module-group-${module._id}`}>
              {index > 0 && (
                <ModulePath
                  startX={Dimensions.get('window').width / 2 + (index % 2 === 0 ? 150 : -150)}
                  startY={(index - 1) * 300 + 40} // Add offset to align with module center
                  endX={Dimensions.get('window').width / 2 + (index % 2 === 0 ? -150 : 150)}
                  endY={index * 300 + 40} // Add offset to align with module center
                  completed={module.isCompleted}
                  locked={!module.isUnlocked}
                />
              )}
              <TouchableOpacity
                key={module._id}
                style={[
                  styles.moduleNode,
                  selectedModule?._id === module._id && styles.selectedNode,
                  !module.isUnlocked && styles.lockedNode,
                  {
                    position: 'absolute',
                    left: Platform.OS === 'web'
                      ? Dimensions.get('window').width / 2 - 40
                      : Dimensions.get('window').width / 2 - 40,
                    top: index * 300, // Match with path coordinates
                    transform: [
                      { translateX: index % 2 === 0 ? -150 : 150 }, // Match with path coordinates
                    ],
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
                  !module.isUnlocked && styles.lockedText,
                  index % 2 === 0 ? styles.moduleNameLeft : styles.moduleNameRight
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
                
                {/* Admin Options Button */}
                {isAdmin && (
                  <View style={styles.adminOptionsContainer}>
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
            </React.Fragment>
          ))}
                    <View
      style={[
        styles.infoPanel,
        Platform.OS === 'web' && {
          position: 'absolute',
          left: '50%',
          top: Math.max(scrollY + 100, 100),
          transform: [
            {translateX: -700},
            {translateY: 0}
          ],
          width: 300,
          marginBottom: 20,
          borderRadius: 18,
          alignSelf: 'center',
          zIndex: 10,
        }
      ]}
    >
      <Text style={styles.infoTitle}>Player Status</Text>
      <Text style={styles.infoDescription}>Your progress details will appear here</Text>
    </View>

                    {selectedModule && (
                      
                    <View
                      style={[
                        styles.infoPanel,
                        Platform.OS === 'web' && {
                          position: 'absolute',
                          left: '50%',
                          top: Math.max(scrollY + 100, 100), // Keep panel visible but follow scroll
                          transform: [
                            {translateX: 400},
                            {translateY: 0} // Remove fixed translateY
                          ],
                          width: 300,
                          marginBottom: 20,
                          borderRadius: 18,
                          alignSelf: 'center',
                          zIndex: 10,
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
                  <View style={styles.userProfilePanel}>
                    <View style={styles.userProfileHeader}>
                      <Text style={styles.userProfileTitle}>Profile</Text>
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
                              user?.privilege === 'admin' ? 'shield' : 
                              user?.privilege === 'superadmin' ? 'star' : 
                              'person'
                            } 
                            size={12} 
                            color="#fff" 
                          />
                        </View>
                      </View>
                      
                      {/* User Info */}
                      <View style={styles.userInfoBox}>
                        <Text style={styles.usernameText}>{user?.username || 'Unknown Hero'}</Text>
                        
                        <View style={styles.infoRow}>
                          <Ionicons 
                            name="ribbon-outline" 
                            size={16} 
                            color={COLORS.primary} 
                          />
                          <Text style={styles.infoText}>
                            {user?.privilege === 'admin' ? 'Instructor' : 
                             user?.privilege === 'superadmin' ? 'Master' : 
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
                    
                    {/* Stats Section */}
                    <View style={styles.statsContainer}>
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>
                          {modules?.filter(m => m.isCompleted)?.length || 0}
                        </Text>
                        <Text style={styles.statLabel}>Completed</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>
                          {modules?.filter(m => m.isUnlocked && !m.isCompleted)?.length || 0}
                        </Text>
                        <Text style={styles.statLabel}>Available</Text>
                      </View>
                      <View style={styles.statItem}>
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

const ModulePath = ({ startX, startY, endX, endY, completed, locked }) => {
  // Calculate the line properties
  const deltaX = endX - startX;
  const deltaY = endY - startY;
  const length = Math.sqrt(Math.pow(deltaX, 2) + Math.pow(deltaY, 2));
  const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

  return (
    <View
      style={[
        styles.pathLine,
        completed && styles.pathLineCompleted,
        locked && styles.pathLineLocked,
        {
          position: 'absolute',
          left: startX,
          top: startY,
          width: length,
          height: 18,
          transform: [
            { translateY: 40 }, // Center with module
            { rotate: `${angle}deg` },
          ],
          transformOrigin: 'left',
        }
      ]}
    />
  );
};

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
  adminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(25, 118, 210, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  adminButtonText: {
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
    minHeight: 1000,
    paddingTop: 50, // Reduced top padding
    paddingBottom: 300,
  },
  mapBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.7,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backfaceVisibility: 'hidden',
    imageRendering: 'crisp-edges', // Add this line
    objectFit: 'fill', // Change from 'repeat' to 'fill'
    quality: 1, // Add this line
  },
  player: {
    position: 'absolute',
    width: 40, // Reduce from 50 to 40
    height: 40, // Reduce from 50 to 40
    zIndex: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerImage: {
    width: 35, // Reduce from 45 to 35
    height: 35, // Reduce from 45 to 35
    borderRadius: 17.5, // Half of width/height
    resizeMode: 'contain',
    borderWidth: 2,
    borderColor: '#1976d2',
    backgroundColor: 'rgba(25, 118, 210, 0.2)',
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
    zIndex: 2, // Add this line
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
    fontSize: 12,
    top: '50%', // Center vertically with the circle
    transform: [{ translateY: -6 }], // Fine-tune vertical alignment
  },
  moduleNameLeft: {
    right: 'auto',
    left: -170,
    width: 150,
    textAlign: 'right',
  },
  moduleNameRight: {
    left: 'auto',
    right: -170,
    width: 150,
    textAlign: 'left',
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
    backgroundColor: 'rgba(10, 25, 41, 0.95)',
    padding: 16,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 18,
    backdropFilter: 'blur(10px)',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    maxHeight: '80vh',
    overflowY: 'auto',
    zIndex: 1000,
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
  adminOptionsContainer: {
    position: 'absolute',
    top: -6,
    right: -6, // Keep this as is
    zIndex: 60, // Increased to be above player
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
    right: -80, // Change from 0 to -80 to shift menu to the right
    backgroundColor: 'rgba(10, 25, 41, 0.95)',
    borderRadius: 8,
    width: 100,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#1976d2',
    zIndex: 60, // Increased to be above player
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },

  optionsOverlay: {
    position: 'absolute',
    top: -10,
    right: -90, // Adjust to match new menu position
    padding: 10,
    backgroundColor: 'transparent',
    zIndex: 55,
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
    backgroundColor: 'rgba(10, 25, 41, 0.9)',
    padding: 16,
    borderTopWidth: 2,
    borderTopColor: COLORS.primary,
    borderRadius: 18,
    marginTop: 16,
    marginBottom: 32,
    marginHorizontal: 16,
    ...Platform.select({
      web: {
        position: 'relative',
        left: '50%',
        transform: [{ translateX: -250 }],
        width: 500,
      },
      default: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
      },
    }),
    zIndex: 20,
  },
 userProfilePanel: {
  position: 'absolute',
  top: 70,
  left: 16,
  width: 220,
  backgroundColor: 'rgba(10, 25, 41, 0.9)',
  borderRadius: 12,
  padding: 12,
  zIndex: 10,
  borderWidth: 1,
  borderColor: '#1976d2',
  shadowColor: '#1976d2',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.5,
  shadowRadius: 10,
  elevation: 5,
  // Responsive display
  display: Platform.OS !== 'web' && Dimensions.get('window').width < 600 ? 'none' : 'flex',
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
  
  pathLine: {
    position: 'absolute',
    backgroundColor: '#1976d2',
    height: 50,
    borderRadius: 2,
    zIndex: 1,
    shadowColor: '#1976d2',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 0.10,
    transformOrigin: 'left',
  },
  pathLineCompleted: {
    backgroundColor: '#4CAF50',
    shadowColor: '#4CAF50',
  },
  pathLineLocked: {
    backgroundColor: '#666666',
    opacity: 0.5,
    shadowOpacity: 0.2,
  },
});