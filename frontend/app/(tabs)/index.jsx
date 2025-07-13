import { 
  View, 
  Text, 
  TouchableOpacity, 
  Image, 
  ScrollView, 
  ActivityIndicator,
  RefreshControl  // Add this import
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
  const isAdmin = user?.privilege === 'admin';
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
  const router = useRouter();
  const playerPosition = useRef(new Animated.ValueXY({ x: 50, y: 100 })).current;
  
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
    const screenWidth = Dimensions.get('window').width;
    const modulePosition = {
      x: (index % 3) * (screenWidth / 3) + 50,
      y: Math.floor(index / 3) * 150 + 100
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
      setLoading(refreshing ? false : true); // Don't show full loading screen during pull-to-refresh
      
      // Build query parameters
      const queryParams = new URLSearchParams({
        page: pageNum,
        limit: 10,
        sort: sortOrder,
        // Add optional category filter if selected
        ...(selectedCategory && { category: selectedCategory })
      }).toString();
      
      const response = await fetch(`${API_URL}/modules?${queryParams}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      // Handle unauthorized or expired token
      if (response.status === 401) {
        logout();
        router.replace('/login');
        return;
      }
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch modules');
      }
      
      // Update state with pagination metadata
      setModules(data.modules || []);
      setCurrentPage(data.currentPage);
      setTotalPages(data.totalPages);
      setHasMore(data.hasMore);
      
      // Position player at first module if none selected
      if (modules.length > 0 && !selectedModule) {
        movePlayerToModule(modules[0], 0);
      }
      
      return true; // Successfully fetched
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
            style={styles.mapBackground}
            resizeMode="cover"
          />
          
          {/* Player Character */}
          <Animated.View style={[styles.player, playerPosition.getLayout()]}>
            <Image 
              source={require('../../assets/images/character1.png')} 
              style={styles.playerImage}
            />
          </Animated.View>
          
          {/* Module Locations */}
          {modules.map((module, index) => (
            <TouchableOpacity
              key={module._id}
              style={[
                styles.moduleNode,
                selectedModule?._id === module._id && styles.selectedNode,
                {
                  left: (index % 3) * (Dimensions.get('window').width / 3),
                  top: Math.floor(index / 3) * 150,
                }
              ]}
              onPress={() => movePlayerToModule(module, index)}
            >
              <Image 
                source={{ uri: module.image }} 
                style={styles.moduleImage} 
              />
              <Text style={styles.moduleName}>{module.title}</Text>
              <Text style={styles.moduleLevel}>Level {index + 1}</Text>
            </TouchableOpacity>
          ))}
          
          {/* Module Info Panel */}
          {selectedModule && (
            <View style={styles.infoPanel}>
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
          {hasMore && (
            <TouchableOpacity style={styles.loadMoreButton} onPress={loadMoreModules}>
              <Text style={styles.loadMoreText}>Load More Modules</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
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
    zIndex: 10,
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
    elevation: 5,
  },
  selectedNode: {
    borderColor: '#4caf50',
    borderWidth: 3,
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
    shadowColor: '#4caf50',
    transform: [{ scale: 1.1 }],
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
    backgroundColor: '#ff9800',
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
  }
});