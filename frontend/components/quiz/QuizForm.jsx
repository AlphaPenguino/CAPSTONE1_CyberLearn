import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Modal
} from 'react-native';
import { TextInput, Checkbox } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { API_URL } from '@/constants/api';
import COLORS from '@/constants/custom-colors';
import styles from '../../assets/styles/quizform.styles';
import { useRouter } from 'expo-router';

const QuizForm = ({ token }) => {



  const [modules, setModules] = useState([]);
  const [selectedModule, setSelectedModule] = useState(null);
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDescription, setQuizDescription] = useState('');
  const [quizDifficulty, setQuizDifficulty] = useState('medium');
  const [quizTimeLimit, setQuizTimeLimit] = useState('300');
  const [quizImage, setQuizImage] = useState(null);
  const [quizImageBase64, setQuizImageBase64] = useState('');
  const [questions, setQuestions] = useState([]);
  const [currentQuestionType, setCurrentQuestionType] = useState('multipleChoice');
  const [quizLoading, setQuizLoading] = useState(false);
  const [passingScore, setPassingScore] = useState('70');
  const router = useRouter();
  
  // Fetch modules when component mounts
  useEffect(() => {
    fetchModules();
  }, []);
  
  const showAlert = (title, message) => {
    if (Platform.OS === 'web') {
      alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  }
  
  const fetchModules = async () => {
    try {
      // Use the /modules/instructor endpoint instead of /modules
      const response = await fetch(`${API_URL}/modules/instructor`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch modules');
      }
      
      const data = await response.json();
      setModules(data.modules || []);
      
      // Add debug message to confirm only instructor's modules are fetched
      console.log(`📚 Fetched ${data.modules?.length || 0} modules created by this instructor`);
    } catch (error) {
      console.error('Error fetching modules:', error);
      showAlert('Error', 'Failed to load modules. Please try again.');
    }
  };
  
  const pickQuizImage = async () => {
    try {
      // For web platform
      if (Platform.OS === 'web') {
        // Create an input element
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          
          // Check file size - reject if too large
          if (file.size > 5000000) { // 5MB
            alert("Image too large. Please select a smaller image or compress it first.");
            return;
          }
          
          // Compress image using canvas before converting to base64
          const img = Platform.OS === 'web' 
          ? new window.Image() 
          : null;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 800;
            const scaleSize = MAX_WIDTH / img.width;
            canvas.width = MAX_WIDTH;
            canvas.height = img.height * scaleSize;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            // Get compressed data URL
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.6);
            
            // Set image for preview
            setQuizImage(compressedDataUrl);
            
            // Extract base64 without prefix
            const base64data = compressedDataUrl.split(',')[1];
            setQuizImageBase64(base64data);
            
            console.log("Web quiz image compressed and converted, length:", base64data.length);
          };
          
          img.src = URL.createObjectURL(file);
        };
        input.click();
      } else {
        if (Platform.OS !== 'web') {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

          console.log("Media Library Permission Status: ", status);
          if (status !== 'granted') {
            Alert.alert('Permission to access camera roll is required!');
            return;
          }
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: "images",
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.5,
          base64: true,
        });

        if (!result.canceled) {
          // Compress image before using it
          const asset = result.assets[0];
          
          try {
            // Use ImageManipulator for additional compression
            const compressedImage = await ImageManipulator.manipulateAsync(
              asset.uri,
              [{ resize: { width: 800 } }],
              { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
            );
            
            setQuizImage(compressedImage.uri);
            
            // Get base64 of compressed image
            const base64 = await FileSystem.readAsStringAsync(
              compressedImage.uri, 
              { encoding: FileSystem.EncodingType.Base64 }
            );
            
            setQuizImageBase64(base64);
            console.log("Quiz image compressed and converted to base64, length:", base64.length);
          } catch (compressionError) {
            console.error("Error compressing quiz image:", compressionError);
            // Fallback to original image
            setQuizImage(asset.uri);
            setQuizImageBase64(asset.base64);
          }
        } else {
          console.log("Quiz image picking was canceled");
        }
      }
    } catch (error) {
      console.error("Error picking quiz image: ", error);
      if (Platform.OS === 'web') {
        alert("Failed to pick image.");
      } else {
        Alert.alert("Error", "Failed to pick image.");
      }
    }
  };
  
  const handleQuizSubmit = async () => {
    // Validation
    if (!selectedModule) {
        if (Platform.OS === 'web') {
          alert("Error", "Please select a module");
        }
      showAlert("Error", "Please select a module");
      return;
    }
    
    if (!quizTitle) {
      showAlert("Error", "Quiz title is required");
      return;
    }
    
    if (!quizDescription) {
      showAlert("Error", "Quiz description is required");
      return;
    }
    
    if (questions.length === 0) {
      showAlert("Error", "Add at least one question");
      return;
    }
    
    try {
      setQuizLoading(true);
      
      // Prepare quiz data
      const quizData = {
        title: quizTitle,
        description: quizDescription,
        module: selectedModule,
        difficulty: quizDifficulty,
        timeLimit: parseInt(quizTimeLimit),
        passingScore: parseInt(passingScore),
        questions: questions
      };
      
      // Add image if available - Match LevelForm's approach
      if (quizImageBase64) {
        // Add safety check for image
        if (!quizImage) {
          throw new Error("Image not found. Please select an image again.");
        }
        
        const uriParts = quizImage.split('.');
        const fileType = uriParts[uriParts.length - 1];
        const imageType = fileType ? `image/${fileType.toLowerCase()}` : "image/jpeg";

        const imageDataUrl = quizImageBase64.startsWith('data:image') 
        ? quizImageBase64 
        : `data:image/jpeg;base64,${quizImageBase64}`;
        
        quizData.image = imageDataUrl;
      }
      
      console.log("Preparing to upload quiz to:", `${API_URL}/quiz`);
      
      // Submit to API
      const response = await fetch(`${API_URL}/quiz`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(quizData),
      });
      
      // Safer JSON parsing with error handling
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error("Failed to parse response:", parseError);
        throw new Error("Server returned an invalid response");
      }
      
      if (!response.ok) {
        throw new Error(data?.message || 'Failed to create quiz');
      }
      
      // Success
      showAlert("Success", "Quiz created successfully!");
      
      // Reset form - including image states
      setSelectedModule(null);
      setQuizTitle('');
      setQuizDescription('');
      setQuizDifficulty('medium');
      setQuizTimeLimit('300');
      setQuizImage(null);
      setQuizImageBase64(''); // Make sure this resets properly
      setPassingScore('70');
      setQuestions([]);
      
      // Navigate back
      router.push('/(tabs)');
      
    } catch (error) {
      console.error("Error creating quiz:", error);
      
      const errorMessage = error && typeof error.message === 'string' 
        ? error.message 
        : "Failed to create quiz. Please try again.";
        
      showAlert("Error", errorMessage);
    } finally {
      setQuizLoading(false);
    }
  };
  
  // Cross-platform dropdown component
  const DropdownSelector = ({ items, selectedValue, onValueChange, placeholder }) => {
    const [modalVisible, setModalVisible] = useState(false);
    const modalRef = React.useRef(null);
    
    // Get the selected item's label
    const selectedItem = items.find(item => item.value === selectedValue);
    const displayText = selectedItem ? selectedItem.label : placeholder || "Select...";
    
    // Handle modal open
    const openModal = () => {
      setModalVisible(true);
      // Focus trap for web accessibility
      if (Platform.OS === 'web') {
        setTimeout(() => {
          if (modalRef.current) {
            modalRef.current.focus();
          }
        }, 100);
      }
    };
    
    // Handle modal close
    const closeModal = () => {
      setModalVisible(false);
    };

    // Handle keyboard navigation for web
    const handleKeyDown = (e) => {
      if (Platform.OS === 'web' && e.key === 'Escape') {
        closeModal();
      }
    };
    
    if (Platform.OS === 'web') {
      return (
        <View style={styles.selectContainer}>
          <select
            value={selectedValue || ""}
            onChange={e => onValueChange(e.target.value)}
            style={styles.webSelect}
            aria-label={placeholder}
          >
            <option value="" disabled>{placeholder || "Select..."}</option>
            {items.map((item, index) => (
              <option key={index} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </View>
      );
    }
    
    // Mobile implementation
    return (
      <TouchableOpacity 
        style={styles.dropdownButton}
        onPress={openModal}
        accessibilityRole="button"
        accessibilityLabel={`Select ${placeholder || "option"}. Current selection: ${displayText}`}
        accessibilityHint="Double tap to open dropdown menu"
      >
        <Text style={[
          styles.dropdownButtonText, 
          !selectedValue && { color: COLORS.textSecondary }
        ]}>
          {displayText}
        </Text>
        <Ionicons name="chevron-down" size={20} color={COLORS.text} />
        
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={closeModal}
          supportedOrientations={['portrait', 'landscape']}
        >
          <View 
            style={styles.modalOverlay}
            onKeyDown={handleKeyDown}
          >
            <View 
              style={styles.modalView}
              ref={modalRef}
              tabIndex={-1} // Makes div focusable without affecting tab order
              accessibilityViewIsModal={true}
              accessibilityLiveRegion="polite"
            >
              <Text style={styles.modalTitle}>{placeholder || "Select an option"}</Text>
              <ScrollView>
                {items.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.modalItem,
                      selectedValue === item.value && styles.selectedModalItem
                    ]}
                    onPress={() => {
                      onValueChange(item.value);
                      closeModal();
                    }}
                    accessibilityRole="menuitem"
                    accessibilityState={{ selected: selectedValue === item.value }}
                  >
                    <Text style={styles.modalItemText}>{item.label}</Text>
                    {selectedValue === item.value && (
                      <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={closeModal}
                accessibilityRole="button"
                accessibilityLabel="Close dropdown menu"
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </TouchableOpacity>
    );
  };

  // Question Builder Component
  const QuestionBuilder = () => {
    const [showQuestionForm, setShowQuestionForm] = useState(false);
    const [questionText, setQuestionText] = useState('');
    const [options, setOptions] = useState([
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false }
    ]);
    const [blanks, setBlanks] = useState([{ answer: '' }]);
    const [codeTemplate, setCodeTemplate] = useState('');
    const [correctAnswer, setCorrectAnswer] = useState('');
    const [expectedOutput, setExpectedOutput] = useState('');
    const [codeBlocks, setCodeBlocks] = useState([
      { code: '', correctPosition: 0 },
      { code: '', correctPosition: 1 }
    ]);
    
    // Question type options
    const questionTypes = [
      { label: 'Multiple Choice', value: 'multipleChoice' },
      { label: 'Fill in the Blanks', value: 'fillInBlanks' },
      { label: 'Code Simulation', value: 'codeSimulation' },
      { label: 'Code Implementation', value: 'codeImplementation' },
      { label: 'Code Ordering', value: 'codeOrdering' }
    ];
    
    const resetQuestionForm = () => {
      setQuestionText('');
      setOptions([
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false }
      ]);
      setBlanks([{ answer: '' }]);
      setCodeTemplate('');
      setCorrectAnswer('');
      setExpectedOutput('');
      setCodeBlocks([
        { code: '', correctPosition: 0 },
        { code: '', correctPosition: 1 }
      ]);
    };
    
    const addOption = () => setOptions([...options, { text: '', isCorrect: false }]);
    
    const removeOption = (index) => {
      if (options.length <= 2) return;
      setOptions(options.filter((_, i) => i !== index));
    };
    
    const toggleCorrect = (index) => {
      const newOptions = [...options];
      newOptions[index].isCorrect = !newOptions[index].isCorrect;
      setOptions(newOptions);
    };
    
    const addBlank = () => setBlanks([...blanks, { answer: '' }]);
    
    const removeBlank = (index) => {
      if (blanks.length <= 1) return;
      setBlanks(blanks.filter((_, i) => i !== index));
    };
    
    const addCodeBlock = () => {
      setCodeBlocks([
        ...codeBlocks, 
        { code: '', correctPosition: codeBlocks.length }
      ]);
    };
    
    const removeCodeBlock = (index) => {
      if (codeBlocks.length <= 2) return;
      const newCodeBlocks = codeBlocks.filter((_, i) => i !== index);
      newCodeBlocks.forEach((block, i) => {
        block.correctPosition = i;
      });
      setCodeBlocks(newCodeBlocks);
    };
    
    const addQuestion = () => {
      if (!questionText) {
        showAlert("Error", "Question text is required");
        return;
      }
      
      let newQuestion = {
        questionType: currentQuestionType,
        question: questionText,
        points: 10 // Default points
      };
      
      switch (currentQuestionType) {
        case 'multipleChoice':
          // Validate
          if (options.filter(opt => opt.text).length < 2) {
            showAlert("Error", "Add at least two options");
            return;
          }
          if (!options.some(opt => opt.isCorrect)) {
            showAlert("Error", "Select at least one correct answer");
            return;
          }
          newQuestion.options = options.filter(opt => opt.text);
          break;
          
        case 'fillInBlanks':
          if (blanks.filter(blank => blank.answer).length === 0) {
            showAlert("Error", "Add at least one blank answer");
            return;
          }
          newQuestion.blanks = blanks
            .filter(blank => blank.answer)
            .map((blank, i) => ({
              position: i,
              answer: blank.answer
            }));
          break;
          
        case 'codeSimulation':
        case 'codeImplementation':
          if (!codeTemplate) {
            showAlert("Error", "Code template is required");
            return;
          }
          if (!correctAnswer) {
            showAlert("Error", "Correct answer is required");
            return;
          }
          newQuestion.codeTemplate = codeTemplate;
          newQuestion.correctAnswer = correctAnswer;
          if (expectedOutput) {
            newQuestion.expectedOutput = expectedOutput;
          }
          break;
          
        case 'codeOrdering':
          if (codeBlocks.filter(block => block.code).length < 2) {
            showAlert("Error", "Add at least two code blocks");
            return;
          }
          newQuestion.codeBlocks = codeBlocks.filter(block => block.code);
          break;
      }
      
      setQuestions([...questions, newQuestion]);
      setShowQuestionForm(false);
      resetQuestionForm();
    };
    
    const removeQuestion = (index) => {
      setQuestions(questions.filter((_, i) => i !== index));
    };
    
    // Render form based on question type
    const renderQuestionTypeForm = () => {
      switch (currentQuestionType) {
        case 'multipleChoice':
          return (
            <View>
              {options.map((option, index) => (
                <View key={index} style={styles.optionContainer}>
                  <TextInput
                    label={`Option ${index + 1}`}
                    value={option.text}
                    onChangeText={(text) => {
                      const newOptions = [...options];
                      newOptions[index].text = text;
                      setOptions(newOptions);
                    }}
                    mode="outlined"
                    style={styles.optionInput}
                    outlineColor={COLORS.border}
                    activeOutlineColor={COLORS.primary}
                  />
                  <View style={styles.optionActions}>
                    <Checkbox
                      status={option.isCorrect ? 'checked' : 'unchecked'}
                      onPress={() => toggleCorrect(index)}
                      color={COLORS.primary}
                    />
                    {options.length > 2 && (
                      <TouchableOpacity onPress={() => removeOption(index)}>
                        <Ionicons name="close-circle" size={24} color={COLORS.error} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
              <TouchableOpacity style={styles.addButton} onPress={addOption}>
                <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
                <Text style={styles.addButtonText}>Add Option</Text>
              </TouchableOpacity>
            </View>
          );
          
        case 'fillInBlanks':
          return (
            <View>
              <Text style={styles.helperText}>
                Use ____ (4 underscores) in your question text to indicate blank spaces
              </Text>
              {blanks.map((blank, index) => (
                <View key={index} style={styles.optionContainer}>
                  <TextInput
                    label={`Blank ${index + 1} Answer`}
                    value={blank.answer}
                    onChangeText={(text) => {
                      const newBlanks = [...blanks];
                      newBlanks[index].answer = text;
                      setBlanks(newBlanks);
                    }}
                    mode="outlined"
                    style={styles.optionInput}
                    outlineColor={COLORS.border}
                    activeOutlineColor={COLORS.primary}
                  />
                  {blanks.length > 1 && (
                    <TouchableOpacity onPress={() => removeBlank(index)}>
                      <Ionicons name="close-circle" size={24} color={COLORS.error} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              <TouchableOpacity style={styles.addButton} onPress={addBlank}>
                <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
                <Text style={styles.addButtonText}>Add Blank</Text>
              </TouchableOpacity>
            </View>
          );
          
        case 'codeSimulation':
        case 'codeImplementation':
          return (
            <View>
              <TextInput
                label="Code Template (with blanks to fill)"
                value={codeTemplate}
                onChangeText={setCodeTemplate}
                mode="outlined"
                style={styles.codeInput}
                multiline
                numberOfLines={6}
                outlineColor={COLORS.border}
                activeOutlineColor={COLORS.primary}
              />
              <TextInput
                label="Correct Answer (full code)"
                value={correctAnswer}
                onChangeText={setCorrectAnswer}
                mode="outlined"
                style={styles.codeInput}
                multiline
                numberOfLines={6}
                outlineColor={COLORS.border}
                activeOutlineColor={COLORS.primary}
              />
              <TextInput
                label="Expected Output (optional)"
                value={expectedOutput}
                onChangeText={setExpectedOutput}
                mode="outlined"
                style={styles.input}
                multiline
                numberOfLines={3}
                outlineColor={COLORS.border}
                activeOutlineColor={COLORS.primary}
              />
            </View>
          );
          
        case 'codeOrdering':
          return (
            <View>
              {codeBlocks.map((block, index) => (
                <View key={index} style={styles.codeBlockContainer}>
                  <View style={styles.codeBlockOrder}>
                    <Text style={styles.codeBlockOrderText}>{index + 1}</Text>
                  </View>
                  <TextInput
                    label={`Code Block ${index + 1}`}
                    value={block.code}
                    onChangeText={(text) => {
                      const newBlocks = [...codeBlocks];
                      newBlocks[index].code = text;
                      setCodeBlocks(newBlocks);
                    }}
                    mode="outlined"
                    style={styles.codeBlockInput}
                    multiline
                    numberOfLines={3}
                    outlineColor={COLORS.border}
                    activeOutlineColor={COLORS.primary}
                  />
                  {codeBlocks.length > 2 && (
                    <TouchableOpacity onPress={() => removeCodeBlock(index)}>
                      <Ionicons name="close-circle" size={24} color={COLORS.error} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              <TouchableOpacity style={styles.addButton} onPress={addCodeBlock}>
                <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
                <Text style={styles.addButtonText}>Add Code Block</Text>
              </TouchableOpacity>
            </View>
          );
          
        default:
          return null;
      }
    };
    
    return (
      <View style={styles.questionsContainer}>
        <Text style={styles.sectionTitle}>Questions ({questions.length})</Text>
        
        {/* List existing questions */}
        {questions.map((question, index) => (
          <View key={index} style={styles.questionItem}>
            <View style={styles.questionHeader}>
              <Text style={styles.questionType}>
                {questionTypes.find(t => t.value === question.questionType)?.label || question.questionType}
              </Text>
              <TouchableOpacity onPress={() => removeQuestion(index)}>
                <Ionicons name="trash-outline" size={20} color={COLORS.error} />
              </TouchableOpacity>
            </View>
            <Text style={styles.questionText} numberOfLines={2}>{question.question}</Text>
          </View>
        ))}
        
        {/* Add new question button or form */}
        {!showQuestionForm ? (
          <TouchableOpacity style={styles.addQuestionButton} onPress={() => setShowQuestionForm(true)}>
            <Ionicons name="add-circle-outline" size={24} color={COLORS.primary} />
            <Text style={styles.addQuestionText}>Add Question</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.questionForm}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Question Type</Text>
              <DropdownSelector 
                items={questionTypes} 
                selectedValue={currentQuestionType}
                onValueChange={setCurrentQuestionType}
                placeholder="Select question type"
              />
            </View>
            
            <TextInput
              label="Question Text"
              value={questionText}
              onChangeText={setQuestionText}
              mode="outlined"
              style={styles.input}
              multiline
              numberOfLines={2}
              outlineColor={COLORS.border}
              activeOutlineColor={COLORS.primary}
            />
            
            <View style={styles.questionTypeForm}>
              {renderQuestionTypeForm()}
            </View>
            
            <View style={styles.questionFormActions}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => {
                  setShowQuestionForm(false);
                  resetQuestionForm();
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.saveButton} 
                onPress={addQuestion}
              >
                <Text style={styles.saveButtonText}>Add Question</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView 
    style={styles.scrollView}
    contentContainerStyle={{paddingBottom: 80, alignItems: Platform.OS === 'web' ? 'center' : undefined}}
  >
        
        <View style={[
      styles.formContainer,
      Platform.OS === 'web' && { width: 500, borderRadius: 18 }
    ]}>
          <View style={styles.card}>
            <View style={styles.header}>
              <Text style={styles.title}>Create Quiz</Text>
            </View>
            
            {/* Module Selector */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Select Module</Text>
              <DropdownSelector 
                items={modules.map(module => ({
                  label: module.title,
                  value: module._id
                }))} 
                placeholder="Select a module"
                selectedValue={selectedModule}
                onValueChange={setSelectedModule}
              />
            </View>
            
            {/* Quiz Basic Information */}
            <View style={styles.inputContainer}>
              <TextInput
                label="Quiz Title"
                value={quizTitle}
                onChangeText={setQuizTitle}
                mode="outlined"
                style={styles.input}
                outlineColor={COLORS.border}
                activeOutlineColor={COLORS.primary}
                textColor={COLORS.primary}
              />
              
              <TextInput
                label="Description"
                value={quizDescription}
                onChangeText={setQuizDescription}
                mode="outlined"
                style={styles.input}
                multiline
                numberOfLines={3}
                outlineColor={COLORS.border}
                activeOutlineColor={COLORS.primary}
                textColor={COLORS.primary}
              />
              
              <View style={styles.row}>
                <View style={{flex: 1, marginRight: 8}}>
                  <Text style={styles.label}>Difficulty</Text>
                  <DropdownSelector 
                    items={[
                      { label: 'Easy', value: 'easy' },
                      { label: 'Medium', value: 'medium' },
                      { label: 'Hard', value: 'hard' }
                    ]} 
                    selectedValue={quizDifficulty}
                    onValueChange={setQuizDifficulty}
                  />
                </View>
                
                <View style={{flex: 1, marginLeft: 8}}>
                  <Text style={styles.label}>Time Limit (seconds)</Text>
                  <TextInput
                    value={quizTimeLimit}
                    onChangeText={setQuizTimeLimit}
                    mode="outlined"
                    keyboardType="numeric"
                    style={styles.input}
                    outlineColor={COLORS.border}
                    activeOutlineColor={COLORS.primary}
                    textColor={COLORS.primary}
                  />
                </View>

                
              </View>
              <View style={styles.formGroup}>
                    <Text style={styles.label}>Passing Score (%)</Text>
                    <TextInput
                        value={passingScore}
                        onChangeText={setPassingScore}
                        mode="outlined"
                        keyboardType="numeric"
                        style={styles.input}
                        outlineColor={COLORS.border}
                        activeOutlineColor={COLORS.primary}
                        textColor={COLORS.primary}
                    />
                </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Quiz Image (Optional)</Text>
                <TouchableOpacity 
                  style={styles.imagePicker} 
                  onPress={pickQuizImage}
                >
                  {quizImage ? (
                    <Image source={{ uri: quizImage }} style={styles.previewImage} />
                  ) : (
                    <View style={styles.placeholderContainer}>
                      <Ionicons name="image-outline" size={24} color={COLORS.textSecondary} />
                      <Text style={styles.placeholderText}>Pick an image</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Question Builder Section */}
            <QuestionBuilder />
            
            {/* Submit Button */}
            <TouchableOpacity 
              style={styles.button} 
              onPress={handleQuizSubmit}
              disabled={quizLoading}
            >
              {quizLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={styles.buttonContent}>
                  <Ionicons 
                    name="save-outline" 
                    size={24} 
                    color={COLORS.white} 
                    style={styles.buttonIcon} 
                  />
                  <Text style={styles.buttonText}>Create Quiz</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default QuizForm;