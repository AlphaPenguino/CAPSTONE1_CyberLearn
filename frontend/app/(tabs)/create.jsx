import { View, Text, StyleSheet, SafeAreaView } from 'react-native'
import React from 'react'
import { SegmentedButtons, TextInput } from 'react-native-paper'
import COLORS from '@/constants/custom-colors';
import styles from '../../assets/styles/acreate.styles.js';


export default function Create() {
  const [value, setValue] = React.useState('');
  const [title, setTitle] = React.useState('');

  const renderForm = () => {
    switch(value) {
      case 'module':
        return (
          <View style={styles.formContainer}>
            <TextInput
              label="Module Title"
              value={title}
              onChangeText={setTitle}
              mode="outlined"
              style={styles.input}
              outlineColor={COLORS.border}
              activeOutlineColor={COLORS.primary}
            />
            {/* Add more module form fields here */}
          </View>
        );
      case 'content':
        return (
          <View style={styles.formContainer}>
            <Text>Content Form</Text>
          </View>
        );
      case 'rewards':
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
      <SegmentedButtons
        value={value}
        onValueChange={setValue}
        style={styles.group}
        buttons={[
          {
            value: 'module',
            label: 'Module',
            style: styles.button,
            checkedColor: COLORS.white,
            uncheckedColor: COLORS.textSecondary,
          },
          {
            value: 'content',
            label: 'Content',
            style: styles.button,
            checkedColor: COLORS.white,
            uncheckedColor: COLORS.textSecondary,
          },
          {
            value: 'rewards',
            label: 'Rewards',
            style: styles.button,
            checkedColor: COLORS.white,
            uncheckedColor: COLORS.textSecondary,
          },
        ]}
      />
      {renderForm()}
    </SafeAreaView>
  )
}


