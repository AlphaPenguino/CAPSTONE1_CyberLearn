import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, TextInput, Modal, ActivityIndicator, Alert, Platform } from 'react-native'
import React, { useState, useEffect } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_URL } from '@/constants/api';
import { useAuthStore } from '@/store/authStore';
import COLORS from '@/constants/custom-colors';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

// Helper function to get a numerical order for roles
const getRoleOrder = (role) => {
  switch (role?.toLowerCase()) {
    case 'student':
      return 1;
    case 'instructor':
      return 2;
    case 'admin':
      return 3;
    default:
      return 4; // For any other roles
  }
};

export default function UsersScreen() {
  const { token } = useAuthStore();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    role: 'student', // Default role
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [imageErrors, setImageErrors] = useState({});
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'student', 'instructor', 'admin'

  // Function to handle image URLs for different platforms
  const getCompatibleImageUrl = (url) => {
    if (!url) return null;
    
    // Convert DiceBear SVGs to PNGs on Android
    if (url.includes('dicebear') && url.includes('/svg')) {
      if (Platform.OS === 'android') {
        return url.replace('/svg', '/png');
      }
    }
    return url;
  };

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  // Fetch users from API
  const fetchUsers = async () => {
    try {
      console.log(`Attempting to fetch users from: ${API_URL}/users`);
      
      setLoading(true);
      const response = await fetch(`${API_URL}/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch users');
      }

      const data = await response.json();
      
      // Use data.users instead of data directly
      if (data.success && data.users) {
        // Sort the users by role, then by username
        const sortedUsers = data.users.sort((a, b) => {
          const roleA = getRoleOrder(a.role || a.privilege);
          const roleB = getRoleOrder(b.role || b.privilege);
          
          // Primary sort by role order
          if (roleA !== roleB) {
            return roleA - roleB;
          }
          
          // Secondary sort by username alphabetically
          return a.username.localeCompare(b.username);
        });
        
        setUsers(sortedUsers);
        // Reset image errors when new users are loaded
        setImageErrors({});
      } else {
        throw new Error(data.message || 'Failed to get users');
      }
      
      setError(null);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Add new user
  const handleAddUser = async () => {
    // Validate input
    if (!newUser.username || !newUser.email || !newUser.password) {
      Alert.alert('Validation Error', 'Please fill all required fields');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newUser)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create user');
      }

      // Clear form and close modal
      setNewUser({
        username: '',
        email: '',
        password: '',
        role: 'student',
      });
      setModalVisible(false);
      
      // Refresh user list
      fetchUsers();
      Alert.alert('Success', 'User created successfully');
    } catch (err) {
      showAlert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete user
  const handleDeleteUser = async (userId, username) => {
    showAlert(
      'Confirm Delete',
      `Are you sure you want to delete ${username}? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const response = await fetch(`${API_URL}/users/${userId}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });

              if (!response.ok) {
                throw new Error('Failed to delete user');
              }

              // Remove user from list
              setUsers(users.filter(user => user._id !== userId));
              showAlert('Success', 'User deleted successfully');
            } catch (err) {
              showAlert('Error', err.message);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // Mark image as having error
  const handleImageError = (userId) => {
    setImageErrors(prev => ({
      ...prev,
      [userId]: true
    }));
  };

  // Filter users based on search query AND active filter
  const filteredUsers = users
    .filter(user => {
      const userRole = (user.role || user.privilege)?.toLowerCase();
      // Check if the user's role matches the active filter, or if the filter is 'all'
      const roleMatchesFilter = activeFilter === 'all' || userRole === activeFilter;

      // Check if the user matches the search query
      const searchMatchesUser = user.username?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        user.email?.toLowerCase().includes(searchQuery.toLowerCase());

      return roleMatchesFilter && searchMatchesUser;
    });


  // Get role-specific properties
  const getRoleColor = (role) => {
    switch(role?.toLowerCase()) {
      case 'instructor':
        return '#FF5722';
      case 'admin':
        return '#673AB7';
      default:
        return COLORS.primary;
    }
  };
  
  const getRoleIcon = (role) => {
    switch(role?.toLowerCase()) {
      
      case 'admin':
        return 'shield-crown-outline';
      case 'instructor':
        return 'school-outline';
      default:
        return 'account-outline';
    }
  };

  // Render item for FlatList
  const renderItem = ({ item }) => {
    // First check for profileImage (auth), then profilePicture (user route) for compatibility
    const userImage = item.profileImage || item.profilePicture;
    const hasImageError = imageErrors[item._id];
    const role = item.role || item.privilege || 'student';
    const roleColor = getRoleColor(role);
    
    return (
      <TouchableOpacity style={styles.userCard}>
        <View style={styles.userInfo}>
          {userImage && !hasImageError ? (
            <Image
              source={{ uri: getCompatibleImageUrl(userImage) }}
              style={[styles.avatar, { borderColor: roleColor }]}
              onError={() => handleImageError(item._id)}
            />
          ) : (
            <View style={[styles.avatarFallback, { borderColor: roleColor }]}>
              <MaterialCommunityIcons name={getRoleIcon(role)} size={28} color={roleColor} />
            </View>
          )}
          
          <View style={styles.userDetails}>
            <Text style={styles.username}>{item.username}</Text>
            <Text style={styles.email}>{item.email}</Text>
            <View style={[styles.roleBadge, { backgroundColor: roleColor }]}>
              <MaterialCommunityIcons name={getRoleIcon(role)} size={14} color="#FFF" style={styles.roleIcon} />
              <Text style={styles.roleText}>{role}</Text>
            </View>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.deleteButton} 
          onPress={() => handleDeleteUser(item._id, item.username)}
        >
          <MaterialCommunityIcons name="trash-can-outline" size={22} color={COLORS.error || '#F44336'} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  // Loading state
  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.centered}>
        <MaterialCommunityIcons name="alert-circle" size={50} color={COLORS.error || '#F44336'} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchUsers}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Manage Users</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <MaterialCommunityIcons name="account-plus" size={24} color="#FFF" />
          <Text style={styles.addButtonText}>Add User</Text>
        </TouchableOpacity>
      </View>

      {/* Main content container with max-width and centering */}
      <View style={styles.mainContent}>
        {/* Filter Buttons */}
        <View style={styles.filterContainer}>
          {['all', 'student', 'instructor', 'admin'].map(filter => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterButton,
                activeFilter === filter && styles.filterButtonActive
              ]}
              onPress={() => setActiveFilter(filter)}
            >
              <Text style={[
                styles.filterButtonText,
                activeFilter === filter && styles.filterButtonTextActive
              ]}>
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <MaterialCommunityIcons name="magnify" size={20} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            placeholderTextColor={COLORS.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialCommunityIcons name="close" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* User List */}
        <FlatList
          data={filteredUsers}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchUsers();
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="account-search" size={60} color={COLORS.textSecondary} />
              <Text style={styles.emptyText}>
                {searchQuery || activeFilter !== 'all' ? 'No users match your criteria' : 'No users found'}
              </Text>
            </View>
          }
        />
      </View>

      {/* Add User Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New User</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            
            
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={COLORS.textSecondary}
              keyboardType="email-address"
              value={newUser.email}
              onChangeText={(text) => setNewUser({...newUser, email: text})}
            />
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor={COLORS.textSecondary}
              value={newUser.username}
              onChangeText={(text) => setNewUser({...newUser, username: text})}
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={COLORS.textSecondary}
              secureTextEntry
              value={newUser.password}
              onChangeText={(text) => setNewUser({...newUser, password: text})}
            />

            <Text style={styles.roleLabel}>Role:</Text>
            <View style={styles.roleContainer}>
              {['student', 'instructor', 'admin'].map(role => (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.roleOption,
                    newUser.role === role && styles.roleOptionSelected,
                    { borderColor: getRoleColor(role) }
                  ]}
                  onPress={() => setNewUser({...newUser, role})}
                >
                  <MaterialCommunityIcons 
                    name={getRoleIcon(role)} 
                    size={22} 
                    color={newUser.role === role ? '#FFF' : getRoleColor(role)} 
                  />
                  <Text 
                    style={[
                      styles.roleOptionText,
                      newUser.role === role && styles.roleOptionTextSelected
                    ]}
                  >
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity 
              style={styles.submitButton}
              onPress={handleAddUser}
            >
              <Text style={styles.submitButtonText}>Create User</Text>
              <MaterialCommunityIcons name="account-plus" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  mainContent: {
    flex: 1,
    width: '100%',
    maxWidth: 800, // Max width for content on wider screens
    alignSelf: 'center', // Center the container horizontally
    paddingHorizontal: 16, // Add padding here for consistent spacing
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  errorText: {
    marginTop: 10,
    color: COLORS.error || '#F44336',
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.cardBackground,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBackground,
    marginBottom: 10,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    color: COLORS.textPrimary,
    fontSize: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    backgroundColor: COLORS.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterButtonText: {
    color: COLORS.textSecondary,
    fontWeight: 'bold',
  },
  filterButtonTextActive: {
    color: '#FFF',
  },
  listContainer: {
    paddingBottom: 16,
  },
  userCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  avatarFallback: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userDetails: {
    marginLeft: 14,
    flex: 1,
  },
  username: {
    fontSize: 17,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  email: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  roleBadge: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  roleIcon: {
    marginRight: 4,
  },
  roleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  deleteButton: {
    padding: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    marginTop: 20,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.cardBackground,
    width: '100%',
    maxWidth: 500,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  input: {
    backgroundColor: COLORS.inputBackground || COLORS.background,
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.textPrimary,
    fontSize: 16,
  },
  roleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 10,
    marginTop: 8,
  },
  roleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  roleOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 5,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    marginHorizontal: 4,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  roleOptionSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  roleOptionText: {
    color: COLORS.textPrimary,
    marginLeft: 6,
    fontWeight: '500',
  },
  roleOptionTextSelected: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 8,
  },
});

const showAlert = (title, message, buttons = [{ text: 'OK' }]) => {
  if (Platform.OS === 'web') {
    // For web, use the browser's built-in alert or a custom web dialog
    if (buttons.length <= 1) {
      // Simple alert
      window.alert(`${title}\n${message}`);
    } else {
      // Confirmation dialog with OK/Cancel
      const confirmed = window.confirm(`${title}\n${message}`);
      if (confirmed) {
        // Find the non-cancel button and trigger its onPress
        const confirmButton = buttons.find(button => button.style === 'destructive' || button.text === 'OK');
        confirmButton?.onPress?.();
      } else {
        // Find the cancel button and trigger its onPress
        const cancelButton = buttons.find(button => button.style === 'cancel');
        cancelButton?.onPress?.();
      }
    }
  } else {
    // For native platforms, use React Native's Alert
    Alert.alert(title, message, buttons);
  }
};