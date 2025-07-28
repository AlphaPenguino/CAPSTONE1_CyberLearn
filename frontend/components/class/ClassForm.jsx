import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
  StyleSheet,
  ScrollView,
  Platform,
  Modal,
  Alert,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { API_URL } from '@/constants/api';
import { useAuthStore } from '@/store/authStore';
import COLORS from '@/constants/custom-colors';
import Animated, { FadeIn } from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

export default function ClassForm() {
  const { token, user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [className, setClassName] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [classNameError, setClassNameError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [imageErrors, setImageErrors] = useState({});
  const [sections, setSections] = useState([]);
  const [sectionSearchQuery, setSectionSearchQuery] = useState('');
  const [fetchingSections, setFetchingSections] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState(null);
  const [viewStudentsModalVisible, setViewStudentsModalVisible] = useState(false);
  const [selectedSection, setSelectedSection] = useState(null);
  const [sectionStudents, setSectionStudents] = useState([]);
  const [loadingSectionStudents, setLoadingSectionStudents] = useState(false);
  
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

  // Fetch initial data on component mount
  useEffect(() => {
    fetchStudents();
    fetchSections();
  }, []);

  // Filter students when search changes
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredStudents(students);
    } else {
      const searchLower = searchQuery.toLowerCase();
      const filtered = students.filter(
        student => 
          student.username.toLowerCase().includes(searchLower) || 
          student.email.toLowerCase().includes(searchLower)
      );
      setFilteredStudents(filtered);
    }
  }, [searchQuery, students]);

  // Filter sections when search changes
  const getFilteredSections = () => {
    if (!sections.length) return [];
    if (sectionSearchQuery.trim() === '') {
      return sections;
    } else {
      const searchLower = sectionSearchQuery.toLowerCase();
      return sections.filter(
        section => section.name.toLowerCase().includes(searchLower)
      );
    }
  };

  // Mark image as having error
  const handleImageError = (userId) => {
    setImageErrors(prev => ({
      ...prev,
      [userId]: true
    }));
  };

  const fetchStudents = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Use the dedicated endpoint for unassigned students
      const response = await fetch(`${API_URL}/sections/unassigned-students?limit=100`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch students');
      }
      
      const data = await response.json();
      
      // The API returns data.students
      if (data.success && Array.isArray(data.students)) {
        setStudents(data.students);
        setFilteredStudents(data.students);
      } else {
        setStudents([]);
        setFilteredStudents([]);
      }
      
      setImageErrors({}); // Reset image errors when new students are loaded
    } catch (err) {
      setError(err.message || 'An error occurred while fetching students');
      console.error('Error fetching students:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchSections = async () => {

    if (user.privilege !== 'admin' && user.privilege !== 'superadmin') {
  console.error('User does not have permission to view sections');
  return;
}
    setFetchingSections(true);
    
    try {
      const response = await fetch(`${API_URL}/sections`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch classes');
      }
      
      const data = await response.json();
      
      if (data.success && Array.isArray(data.sections)) {
        setSections(data.sections);
      } else {
        setSections([]);
      }
    } catch (err) {
      console.error('Error fetching sections:', err);
      // We don't set the main error state here to not disrupt student list
    } finally {
      setFetchingSections(false);
    }
  };

  const handleToggleStudent = (student) => {
    setSelectedStudents(prevSelected => {
      // Check if student is already selected
      const isSelected = prevSelected.some(s => s._id === student._id);
      
      if (isSelected) {
        // Remove student from selected
        return prevSelected.filter(s => s._id !== student._id);
      } else {
        // Add student to selected
        return [...prevSelected, student];
      }
    });
  };

  const validateForm = () => {
    if (!className.trim()) {
      setClassNameError('Class name is required');
      return false;
    }
    
    if (className.trim().length < 3) {
      setClassNameError('Class name must be at least 3 characters');
      return false;
    }
    
    if (selectedStudents.length === 0) {
      showAlert('Validation Error', 'Select at least one student');
      return false;
    }
    
    setClassNameError(null);
    setError(null);
    return true;
  };

  const handleCreateClass = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // First, create the new section in the backend with required fields
      const createSectionResponse = await fetch(`${API_URL}/sections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: className,
          instructor: user._id, // Current user as instructor
          description: `Class for ${className}`,
          isActive: true,
          createdBy: user._id // Track who created the section
        })
        // No need to set sectionCode - it will be auto-generated
      });
      
      if (!createSectionResponse.ok) {
        const errorData = await createSectionResponse.json();
        throw new Error(errorData.message || 'Failed to create class');
      }
      
      const sectionData = await createSectionResponse.json();
      const sectionId = sectionData.section._id;
      
      // Then update all selected students to assign them to the section
      const studentIds = selectedStudents.map(s => s._id);
      
      const assignStudentsResponse = await fetch(`${API_URL}/sections/${sectionId}/students`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          studentIds,
          instructorId: user._id // Include instructor ID in the PUT request
        })
      });
      
      if (!assignStudentsResponse.ok) {
        const errorData = await assignStudentsResponse.json();
        throw new Error(errorData.message || 'Failed to assign students to class');
      }
      
      // Success - reset the form
      showAlert('Success', `Class "${className}" created successfully with ${selectedStudents.length} students`);
      setClassName('');
      setSelectedStudents([]);
      setModalVisible(false);
      
      // Refresh both lists
      fetchStudents();
      fetchSections();
      
    } catch (err) {
      showAlert('Error', err.message || 'An error occurred while creating the class');
      console.error('Error creating class:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSection = (section) => {
    setSectionToDelete(section);
    setDeleteModalVisible(true);
  };
  
  const confirmDeleteSection = async () => {
    if (!sectionToDelete) return;
    
    try {
      const response = await fetch(`${API_URL}/sections/${sectionToDelete._id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete class');
      }
      
      // Remove from local state and close modal
      setSections(prev => prev.filter(s => s._id !== sectionToDelete._id));
      setDeleteModalVisible(false);
      setSectionToDelete(null);
      
      showAlert('Success', `Class "${sectionToDelete.name}" was deleted successfully`);
      
      // Refresh students list as some might now be unassigned
      fetchStudents();
      
    } catch (err) {
      showAlert('Error', err.message || 'An error occurred while deleting the class');
      console.error('Error deleting section:', err);
    }
  };

  const handleViewStudents = async (section) => {
    setSelectedSection(section);
    setLoadingSectionStudents(true);
    
    try {
      const response = await fetch(`${API_URL}/sections/${section._id}/students`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch section students');
      }
      
      const data = await response.json();
      
      if (data.success && Array.isArray(data.students)) {
        setSectionStudents(data.students);
      } else {
        setSectionStudents([]);
      }
      
      setViewStudentsModalVisible(true);
    } catch (err) {
      showAlert('Error', err.message || 'An error occurred while fetching students for this class');
      console.error('Error fetching section students:', err);
    } finally {
      setLoadingSectionStudents(false);
    }
  };

  const fetchSectionStudents = async (sectionId) => {
    if (!sectionId) return;
    
    setLoadingSectionStudents(true);
    
    try {
      const response = await fetch(`${API_URL}/sections/${sectionId}/students`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch students for this class');
      }
      
      const data = await response.json();
      
      if (data.success && Array.isArray(data.students)) {
        setSectionStudents(data.students);
      } else {
        setSectionStudents([]);
      }
    } catch (err) {
      console.error('Error fetching section students:', err);
      showAlert('Error', 'Failed to load students for this class');
    } finally {
      setLoadingSectionStudents(false);
    }
  };

  // Render student item for list
  const renderItem = ({ item }) => {
    const isSelected = selectedStudents.some(s => s._id === item._id);
    const userImage = item.profileImage || item.profilePicture;
    const hasImageError = imageErrors[item._id];
    
    return (
      <TouchableOpacity 
        style={[styles.userCard, isSelected && styles.userCardSelected]}
        onPress={() => handleToggleStudent(item)}
      >
        <View style={styles.userInfo}>
          {isSelected && (
            <View style={styles.selectedIndicator}>
              <MaterialCommunityIcons name="check-circle" size={24} color={COLORS.primary} />
            </View>
          )}
          
          {userImage && !hasImageError ? (
            <Image
              source={{ uri: getCompatibleImageUrl(userImage) }}
              style={styles.avatar}
              onError={() => handleImageError(item._id)}
            />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarText}>
                {item.username?.charAt(0).toUpperCase() || 'S'}
              </Text>
            </View>
          )}
          
          <View style={styles.userDetails}>
            <Text style={styles.username}>{item.username}</Text>
            <Text style={styles.email}>{item.email}</Text>
          </View>
        </View>
        
        {isSelected ? (
          <TouchableOpacity onPress={() => handleToggleStudent(item)}>
            <MaterialCommunityIcons name="checkbox-marked-circle" size={28} color={COLORS.primary} />
          </TouchableOpacity>
        ) : (
          <MaterialCommunityIcons name="checkbox-blank-circle-outline" size={28} color={COLORS.textSecondary} />
        )}
      </TouchableOpacity>
    );
  };
  
  // Render section item for list
  const renderSectionItem = ({ item }) => {
    console.log("Rendering section:", item);
    
    // Check if the item exists
    if (!item || !item._id) {
      console.error("Invalid section data:", item);
      return null;
    }
    
    return (
      <View style={styles.sectionCard}>
        <View style={styles.sectionInfo}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionName}>{item.name || "Unnamed Class"}</Text>
            <Text style={styles.sectionStats}>
              {item.students?.length || 0} students
            </Text>
          </View>
          
          <View style={styles.sectionDetails}>
            <MaterialCommunityIcons name="account-tie" size={16} color={COLORS.textSecondary} />
            <Text style={styles.sectionInstructor}>
              {item.instructorName || "Unknown instructor"}
            </Text>
          </View>
        </View>
        
        <View style={styles.sectionActions}>
          <TouchableOpacity 
            style={styles.sectionActionButton}
            onPress={() => {
              setSelectedSection(item);
              fetchSectionStudents(item._id);
              setViewStudentsModalVisible(true);
            }}
          >
            <Ionicons name="eye-outline" size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.sectionActionButton}
            onPress={() => handleDeleteSection(item)}
          >
            <Ionicons name="trash-outline" size={22} color="#ff4b4b" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };
  
  // Loading state
  if (loading && !refreshing && !modalVisible) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading students...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Manage Classes</Text>
      </View>
      
      <View style={styles.contentContainer}>
        {/* Left side - Create Class */}
        <View style={styles.leftColumn}>
          <View style={styles.columnHeader}>
            <Text style={styles.columnTitle}>Create New Class</Text>
          </View>
          
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.formGroup}>
              <Text style={styles.label}>Class Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter class name"
                placeholderTextColor={COLORS.textSecondary}
                value={className}
                onChangeText={(text) => {
                  setClassName(text);
                  if (classNameError) setClassNameError(null);
                }}
              />
              {classNameError && (
                <Text style={styles.errorText}>{classNameError}</Text>
              )}
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Unassigned Students</Text>
              
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search students..."
                  placeholderTextColor={COLORS.textSecondary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
            </View>
            
            <View style={styles.studentsListContainer}>
              {filteredStudents.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="people" size={40} color={COLORS.textSecondary} />
                  <Text style={styles.emptyText}>
                    No unassigned students found
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={filteredStudents}
                  renderItem={renderItem}
                  keyExtractor={(item) => item._id}
                  style={styles.studentsList}
                  contentContainerStyle={styles.studentsListContent}
                  initialNumToRender={10}
                  maxToRenderPerBatch={10}
                  windowSize={5}
                />
              )}
            </View>
            
            {selectedStudents.length > 0 && (
              <View style={styles.selectedSummary}>
                <Text style={styles.selectedSummaryText}>
                  {selectedStudents.length} student{selectedStudents.length !== 1 ? 's' : ''} selected
                </Text>
              </View>
            )}
            
            <TouchableOpacity
              style={[
                styles.createClassButton,
                (!selectedStudents.length || !className) && styles.createButtonDisabled
              ]}
              onPress={() => selectedStudents.length > 0 && className ? setModalVisible(true) : null}
              disabled={!selectedStudents.length || !className}
            >
              <Text style={styles.createClassButtonText}>Create Class</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
        
        {/* Right side - Existing Classes */}
        <View style={styles.rightColumn}>
          <View style={styles.columnHeader}>
            <Text style={styles.columnTitle}>Existing Classes</Text>
          </View>
          
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search classes..."
              placeholderTextColor={COLORS.textSecondary}
              value={sectionSearchQuery}
              onChangeText={setSectionSearchQuery}
            />
          </View>
          
          {fetchingSections ? (
            <View style={styles.centeredContent}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading classes...</Text>
            </View>
          ) : (
            <FlatList
              data={getFilteredSections()}
              renderItem={renderSectionItem}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.sectionsListContent}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="school-outline" size={40} color={COLORS.textSecondary} />
                  <Text style={styles.emptyText}>
                    No classes found
                  </Text>
                </View>
              }
            />
          )}
        </View>
      </View>
      
      {/* Modal for class creation confirmation */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirm Class Creation</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to create the class &quot;{className}&quot; with {selectedStudents.length} students?
            </Text>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleCreateClass}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalButtonText}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Modal for class deletion confirmation */}
      <Modal
        visible={deleteModalVisible}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Class</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to delete the class &quot;{sectionToDelete?.name}&quot;?
              This will unassign all students from this class.
            </Text>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  setDeleteModalVisible(false);
                  setSectionToDelete(null);
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButton]}
                onPress={confirmDeleteSection}
              >
                <Text style={styles.modalButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Modal for viewing students in a class */}
      <Modal
        visible={viewStudentsModalVisible}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, styles.studentsModalContent]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Students in {selectedSection?.name || "Class"}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setViewStudentsModalVisible(false);
                  setSelectedSection(null);
                  setSectionStudents([]);
                }}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            {loadingSectionStudents ? (
              <View style={styles.centeredContent}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Loading students...</Text>
              </View>
            ) : sectionStudents.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="account-group" size={40} color={COLORS.textSecondary} />
                <Text style={styles.emptyText}>No students in this class</Text>
              </View>
            ) : (
              <FlatList
                data={sectionStudents}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                  <View style={styles.sectionStudentCard}>
                    {item.profileImage ? (
                      <Image
                        source={{ uri: getCompatibleImageUrl(item.profileImage) }}
                        style={styles.studentAvatar}
                        onError={() => console.log("Error loading image")}
                      />
                    ) : (
                      <View style={styles.studentAvatarFallback}>
                        <Text style={styles.avatarText}>
                          {item.username?.charAt(0).toUpperCase() || 'S'}
                        </Text>
                      </View>
                    )}
                    
                    <View style={styles.studentInfo}>
                      <Text style={styles.studentName}>{item.username}</Text>
                      <Text style={styles.studentEmail}>{item.email}</Text>
                    </View>
                  </View>
                )}
                contentContainerStyle={styles.sectionStudentsList}
              />
            )}
            
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                setViewStudentsModalVisible(false);
                setSelectedSection(null);
                setSectionStudents([]);
              }}
            >
              <Text style={styles.closeButtonText}>Close</Text>
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
    backgroundColor: '#0a192f',
  },
  header: {
    paddingTop: 24,
    paddingBottom: 16,
    backgroundColor: '#0a192f',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  contentContainer: {
    flex: 1,
    flexDirection: isWeb ? 'row' : 'column',
  },
  leftColumn: {
    flex: isWeb ? 1 : undefined,
    height: isWeb ? '100%' : '50%',
    borderRightWidth: isWeb ? 1 : 0,
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
    borderBottomWidth: isWeb ? 0 : 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  rightColumn: {
    flex: isWeb ? 1 : undefined,
    height: isWeb ? '100%' : '50%',
  },
  columnHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  columnTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    color: '#aaaaaa',
    marginBottom: 8,
    fontSize: 14,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    color: '#ffffff',
    fontSize: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 8,
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  searchIcon: {
    marginHorizontal: 8,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 16,
    padding: 4,
  },
  studentsListContainer: {
    flex: 1,
    minHeight: 200,
    maxHeight: 300,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#666',
    marginTop: 12,
    fontSize: 16,
    textAlign: 'center',
  },
  studentsList: {
    flex: 1,
  },
  studentsListContent: {
    paddingVertical: 4,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  userCardSelected: {
    backgroundColor: 'rgba(28, 176, 246, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(28, 176, 246, 0.3)',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1cb0f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userDetails: {
    marginLeft: 12,
    flex: 1,
  },
  username: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  email: {
    color: '#aaaaaa',
    fontSize: 14,
  },
  sectionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
    flexDirection: 'column',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionInfo: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionName: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  sectionStats: {
    color: '#aaaaaa',
    fontSize: 14,
  },
  sectionDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  sectionInstructor: {
    color: '#ffffff',
    fontSize: 14,
    marginLeft: 4,
  },
  sectionActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  sectionActionButton: {
    padding: 8,
    borderRadius: 8,
    marginLeft: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 0,
    padding: 0,
  },
  modalContent: {
    backgroundColor: '#0a192f',
    borderRadius: 8,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  modalMessage: {
    color: '#aaaaaa',
    fontSize: 14,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  modalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonConfirm: {
    backgroundColor: COLORS.primary,
  },
  deleteButton: {
    backgroundColor: '#ff4b4b',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff',
    marginTop: 12,
    fontSize: 16,
  },
  studentsModalContent: {
    maxHeight: '80%',
    width: '95%',
    maxWidth: 500,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionStudentsList: {
    paddingVertical: 8,
    width: '100%',
  },
  sectionStudentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginVertical: 4,
    borderRadius: 8,
    width: '100%',
  },
  studentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  studentAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  studentEmail: {
    color: '#aaaaaa',
    fontSize: 14,
  },
  closeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
    width: '100%',
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

