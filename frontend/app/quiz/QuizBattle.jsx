import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  Platform,
  ImageBackground
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import RPG_COLORS from '@/constants/rpg-theme-colors';
import rpgstyles from '../../assets/styles/quiz-rpg.styles.js';
import styles from '../../assets/styles/quiz.styles.js';
import CharacterSprite from '../../components/CharacterSprite.jsx';
import * as sprite from '../../components/spriteSets.js';

const battlefieldBg = require('../../assets/backgrounds/Battleground4.png');

const QuizBattle = ({
  quiz,
  currentQuestionIndex,
  timeRemaining,
  fadeAnim,
  slideAnim,
  isAnswerCorrect,
  attackAnim,
  werewolfAnim,
  formatTime,
  renderQuestionType,
  nextQuestion,
  previousQuestion,
  submitQuiz,
  getQuestionTypeIcon,
  getQuestionTypeLabel
}) => {
  const currentQuestion = quiz.questions[currentQuestionIndex];

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        {/* Quiz Header */}
        <View style={rpgstyles.quizProgressHeader}>
          <View style={rpgstyles.rpgStatusBars}>
            {/* Player Status */}
            <View style={rpgstyles.characterStatus}>
              <Text style={rpgstyles.statusName}>Adventurer</Text>
              <View style={rpgstyles.statusBars}>
                <View style={rpgstyles.barContainer}>
                  <View 
                    style={[
                      rpgstyles.barFill, 
                      rpgstyles.healthBarFill,
                      { 
                        // Player health decreases only when wrong answers are given
                        width: `${100 - Math.floor((
                          quiz.questions.slice(0, currentQuestionIndex).reduce((count, _, idx) => 
                            count + (isAnswerCorrect(idx) ? 0 : 1), 0
                          ) / quiz.questions.length) * 100)}%` 
                      }
                    ]} 
                  />
                  <Text style={rpgstyles.barText}>HP</Text>
                </View>
                <View style={rpgstyles.barContainer}>
                  <View 
                    style={[
                      rpgstyles.barFill,
                      rpgstyles.manaBarFill,
                      { width: `${(timeRemaining / quiz.timeLimit) * 100}%` }
                    ]} 
                  />
                  <Text style={rpgstyles.barText}>{formatTime(timeRemaining)}</Text>
                </View>
              </View>
            </View>
            
            {/* Enemy Status */}
            <View style={rpgstyles.characterStatus}>
              <Text style={rpgstyles.statusName}>Werewolf</Text>
              <View style={rpgstyles.statusBars}>
                <View style={rpgstyles.barContainer}>
                  <View 
                    style={[
                      rpgstyles.barFill, 
                      rpgstyles.enemyHealthBarFill,
                      { 
                        // Werewolf health decreases when correct answers are given
                        width: `${100 - Math.floor((
                          quiz.questions.slice(0, currentQuestionIndex).reduce((count, _, idx) => 
                            count + (isAnswerCorrect(idx) ? 1 : 0), 0
                          ) / quiz.questions.length) * 100)}%` 
                      }
                    ]} 
                  />
                  <Text style={rpgstyles.barText}>HP</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={rpgstyles.questProgress}>
            <Text style={rpgstyles.questText}>Quest Progress</Text>
            <View style={rpgstyles.progressBarContainer}>
              <View 
                style={[
                  rpgstyles.progressBar, 
                  { width: `${((currentQuestionIndex + 1) / quiz.questions.length) * 100}%` }
                ]} 
              />
            </View>
          </View>
        </View>

        <ImageBackground
          source={battlefieldBg}
          style={rpgstyles.battlefieldBackground}
          imageStyle={{
            resizeMode: Platform.OS === 'web' ? 'cover' : 'contain',
            width: '100%',
            height: '100%'
          }}
        >
          {/* Centered battle area with characters */}
          <View style={rpgstyles.rpgBattleArea}>
            <View style={rpgstyles.battleCharactersContainer}>
              {/* Wanderer Character */}
              <View style={rpgstyles.rpgSpriteWrapper}>
                {/* Wanderer Shadow */}
                <View style={rpgstyles.rpgShadow} />
                <CharacterSprite
                  action={
                    attackAnim === true
                      ? 'attack'
                      : attackAnim === 'hurt'
                      ? 'hurt'
                      : 'idle'
                  }
                  speed={128}
                  scale={Platform.OS === 'web' ? 2 : 1}
                  spriteSet={sprite.wanderer_sprites}
                  frames={sprite.wanderer_frames}
                />
                <Text style={rpgstyles.characterName}>Wanderer</Text>
              </View>
              
              {/* Werewolf Character */}
              <View style={[rpgstyles.rpgSpriteWrapper, { transform: [{ scaleX: -1 }] }]}>
                {/* Werewolf Shadow */}
                <View style={rpgstyles.rpgShadow} />
                <CharacterSprite
                  action={werewolfAnim}
                  speed={128}
                  scale={Platform.OS === 'web' ? 2 : 1}
                  spriteSet={sprite.black_werewolf_sprites}
                  frames={sprite.black_werewolf_frames}
                />
                {/* Flip text back */}
                <View style={{ transform: [{ scaleX: -1 }] }}>
                  <Text style={rpgstyles.characterName}>Werewolf</Text>
                </View>
              </View>
            </View>
          </View>
        </ImageBackground>

        {/* Question Content */}
        <Animated.View style={[rpgstyles.questionContainer, {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }]}>
          <View style={rpgstyles.rpgDialogHeader}>
            <MaterialCommunityIcons 
              name="sword-cross" 
              size={22} 
              color={RPG_COLORS.primaryLight} 
            />
            <Text style={rpgstyles.rpgDialogTitle}>Battle Challenge</Text>
          </View>
          
          <ScrollView style={rpgstyles.questionScrollContainer} showsVerticalScrollIndicator={false}>
            <View style={rpgstyles.questionHeader}>
              <View style={rpgstyles.questionTypeIndicator}>
                <MaterialCommunityIcons 
                  name={getQuestionTypeIcon(currentQuestion.questionType)} 
                  size={24} 
                  color={RPG_COLORS.primaryLight} 
                />
                <Text style={rpgstyles.questionTypeText}>
                  {getQuestionTypeLabel(currentQuestion.questionType)}
                </Text>
              </View>
              <Text style={rpgstyles.questionPoints}>
                {currentQuestion.points || 1} {(currentQuestion.points || 1) === 1 ? 'point' : 'points'}
              </Text>
            </View>
            
            <Text style={rpgstyles.questionText}>{currentQuestion.question}</Text>
            
            {renderQuestionType(currentQuestion, currentQuestionIndex)}
          </ScrollView>
        </Animated.View>

        {/* Navigation Buttons */}
        <View style={rpgstyles.navigationContainer}>
          <TouchableOpacity 
            style={[rpgstyles.navButton, currentQuestionIndex === 0 && rpgstyles.disabledButton]}
            onPress={previousQuestion}
            disabled={currentQuestionIndex === 0}
          >
            <MaterialCommunityIcons name="chevron-left" size={24} color="#ffffff" />
            <Text style={rpgstyles.navButtonText}>Previous</Text>
          </TouchableOpacity>
          
          {currentQuestionIndex === quiz.questions.length - 1 ? (
            <TouchableOpacity style={rpgstyles.submitButton} onPress={submitQuiz}>
              <LinearGradient
                colors={[RPG_COLORS.success, RPG_COLORS.success]}
                style={rpgstyles.submitButtonGradient}
              >
                <Text style={rpgstyles.submitButtonText}>Complete Quest</Text>
                <MaterialCommunityIcons name="flag-checkered" size={24} color="#ffffff" />
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={rpgstyles.navButton} onPress={nextQuestion}>
              <Text style={rpgstyles.navButtonText}>Attack</Text>
              <MaterialCommunityIcons name="sword" size={24} color="#ffffff" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaProvider>
  );
};

export default QuizBattle;