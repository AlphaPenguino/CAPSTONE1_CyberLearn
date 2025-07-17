// Create app/admin/quiz/edit.jsx
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/constants/api';
import QuizForm from '@/components/quiz/QuizForm'; // Reuse your existing form

export default function EditQuiz() {
  const { quizId, moduleId, returnTo } = useLocalSearchParams();
  const { token } = useAuthStore();
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchQuizData();
  }, [quizId]);

  const fetchQuizData = async () => {
    try {
      const response = await fetch(`${API_URL}/quiz/edit/${quizId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch quiz data');
      }

      const quizData = await response.json();
      setQuiz(quizData);
    } catch (error) {
      console.error('Error fetching quiz:', error);
      Alert.alert('Error', 'Failed to load quiz data');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuiz = async (updatedQuizData) => {
    try {
      const response = await fetch(`${API_URL}/quiz/${quizId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedQuizData),
      });

      if (!response.ok) {
        throw new Error('Failed to update quiz');
      }

      Alert.alert('Success', 'Quiz updated successfully!');
      router.back();
    } catch (error) {
      console.error('Error updating quiz:', error);
      Alert.alert('Error', 'Failed to update quiz');
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading quiz...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1 }}>
      <QuizForm 
        token={token}
        initialData={quiz}
        isEditing={true}
        onSubmit={handleUpdateQuiz}
      />
    </ScrollView>
  );
}