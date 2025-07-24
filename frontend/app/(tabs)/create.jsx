import { 
  Platform,
  View, 
  Text,
  SafeAreaView, 
  ScrollView
  } from 'react-native'
import { useState } from 'react'

import { SegmentedButtons} from 'react-native-paper'
import COLORS from '@/constants/custom-colors';
import styles from '../../assets/styles/acreate.styles.js';


import { useAuthStore } from '@/store/authStore.js';

import QuizForm from '../../components/quiz/QuizForm.jsx';
import LevelForm from '../../components/level/LevelForm.jsx';

export default function Create() {
  const [value, setValue] = useState('');

  const { token } = useAuthStore();

  
  const renderForm = () => {
    
    switch(value) {
      case 'level':
        return <LevelForm token={token} />;
      case 'quiz':
        return <QuizForm token={token} />;
      case 'class':
        return (
          <View style={styles.formContainer}>
            <Text>Goals Form</Text>
          </View>
        );
      default:
        return null;
    }
    
  };
  return (
    <SafeAreaView style={styles.container }>
        <ScrollView
    contentContainerStyle={Platform.OS === 'web' ? { alignItems: 'center', width: '100%' } : undefined}
    style={{ flex: 1 }}
  >
      <SegmentedButtons
        value={value}
        onValueChange={setValue}
        style={[styles.group,
          Platform.OS === 'web' && { width: 500, borderRadius: 18 }
        ]}
        buttons={[
          {
            value: 'level',
            label: 'Level',
            style: styles.segmentButton,
            // This will style the selected button differently
            showSelectedCheck: false,
            // Apply conditional styling based on selection state
            buttonStyle: ({checked}) => ({
              backgroundColor: checked ? COLORS.primaryLight : 'transparent',
              borderColor: checked ? COLORS.primary : COLORS.border,
            }),
            checkedColor: COLORS.white,
            uncheckedColor: COLORS.textSecondary,
          },
          {
            value: 'quiz',
            label: 'Quiz',
            style: styles.segmentButton,
            showSelectedCheck: false,
            buttonStyle: ({checked}) => ({
              backgroundColor: checked ? COLORS.primaryLight : 'transparent',
              borderColor: checked ? COLORS.primary : COLORS.border,
            }),
            checkedColor: COLORS.white,
            uncheckedColor: COLORS.textSecondary,
          },
          
        ]}
      />
      {renderForm()}
      </ScrollView>
    </SafeAreaView>
  )
}


