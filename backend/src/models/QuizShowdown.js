import mongoose from "mongoose";

// Sample questions for Quiz Showdown - Updated with comprehensive cybersecurity and ICT questions
const sampleQuestions = [
  {
    id: 1,
    question: "What does ICT stand for?",
    options: [
      "Information and Communication Technology",
      "International Communication Tool",
      "Internet and Computer Technology",
      "Information for Computer Training",
    ],
    correct: 0,
  },
  {
    id: 2,
    question: "Which port is commonly used for HTTPS communication?",
    options: ["80", "443", "8080", "3000"],
    correct: 1,
  },
  {
    id: 3,
    question: "What does DDoS stand for in cybersecurity?",
    options: [
      "Direct Denial of Service",
      "Distributed Denial of Service",
      "Dynamic Denial of Service",
      "Digital Denial of Service",
    ],
    correct: 1,
  },
  {
    id: 4,
    question: "What does HTML stand for?",
    options: [
      "High Tech Modern Language",
      "Home Tool Markup Language",
      "HyperText Markup Language",
      "Hard To Make Language",
    ],
    correct: 2,
  },
  {
    id: 5,
    question:
      "Which device is used to connect multiple computers in a network?",
    options: ["Monitor", "Keyboard", "Router", "Printer"],
    correct: 2,
  },
  {
    id: 6,
    question: "What is the primary purpose of a firewall in network security?",
    options: [
      "To cool down the computer",
      "To prevent unauthorized network access",
      "To speed up internet connection",
      "To store backup data",
    ],
    correct: 1,
  },
  {
    id: 7,
    question:
      "Which authentication method requires two different verification factors?",
    options: [
      "Single Sign-On (SSO)",
      "Two-Factor Authentication (2FA)",
      "Password Authentication",
      "Biometric Authentication",
    ],
    correct: 1,
  },
  {
    id: 8,
    question: "What is phishing in cybersecurity?",
    options: [
      "A type of computer virus",
      "A method of data encryption",
      "A social engineering attack to steal sensitive information",
      "A network monitoring tool",
    ],
    correct: 2,
  },
  {
    id: 9,
    question: "Which of the following is the most secure password practice?",
    options: [
      "Using the same password for all accounts",
      "Using a mix of uppercase, lowercase, numbers, and symbols",
      "Using only numbers for easy remembering",
      "Using personal information like birthdate",
    ],
    correct: 1,
  },
  {
    id: 10,
    question: "What does VPN stand for in network security?",
    options: [
      "Virtual Private Network",
      "Very Personal Network",
      "Verified Private Network",
      "Virtual Public Network",
    ],
    correct: 0,
  },
];

// MongoDB schema for Quiz Showdown questions
const quizShowdownQuestionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
  },
  options: [
    {
      type: String,
      required: true,
    },
  ],
  correct: {
    type: Number,
    required: true,
    min: 0,
    max: 3,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const QuizShowdownQuestion = mongoose.model(
  "QuizShowdownQuestion",
  quizShowdownQuestionSchema
);

// Team class for managing team state
class Team {
  constructor(name) {
    this.name = name;
    this.members = [];
    this.score = 0;
    this.buzzedFirst = false;
    this.hasAnswered = false;
  }

  addPlayer(playerId, playerName) {
    if (this.members.length >= 4) {
      return { success: false, message: "Team is full (max 4 players)" };
    }

    // Check if player already exists
    const existingPlayer = this.members.find(
      (member) => member.id === playerId
    );
    if (existingPlayer) {
      return { success: false, message: "Player already in this team" };
    }

    const player = { id: playerId, name: playerName };
    this.members.push(player);
    return { success: true, player };
  }

  removePlayer(playerId) {
    const index = this.members.findIndex((member) => member.id === playerId);
    if (index !== -1) {
      this.members.splice(index, 1);
      return true;
    }
    return false;
  }

  reset() {
    this.buzzedFirst = false;
    this.hasAnswered = false;
  }

  addPoint() {
    this.score++;
  }
}

// Quiz Showdown game class
class QuizShowdownGame {
  constructor(gameId, creatorId, creatorName) {
    this.id = gameId;
    this.creator = {
      id: creatorId,
      name: creatorName,
    };
    this.teamA = new Team("Team A");
    this.teamB = new Team("Team B");
    this.questions = [...sampleQuestions]; // Will be replaced by loadQuestions()
    this.currentQuestionIndex = 0;
    this.status = "waiting"; // waiting, countdown, buzzer_active, team_answering, showing_results, finished
    this.gameState = "lobby"; // lobby, playing, finished
    this.buzzedTeam = null;
    this.answeringTeam = null;
    this.bothTeamsAnswered = false;
    this.countdownTimer = null;
    this.roundResults = [];
    this.createdAt = new Date();
  }

  // Check if player is creator
  isCreator(playerId) {
    return this.creator.id === playerId;
  }

  // Load questions from database
  async loadQuestions() {
    try {
      const dbQuestions = await QuizShowdownQuestion.find().limit(20); // Get up to 20 questions

      if (dbQuestions.length > 0) {
        // Convert database questions to game format
        this.questions = dbQuestions.map((q, index) => ({
          id: q._id.toString(),
          question: q.question,
          options: q.options,
          correct: q.correct,
        }));

        // Shuffle questions to make each game different
        this.questions = this.shuffleArray(this.questions);

        console.log(`Loaded ${this.questions.length} questions from database`);
        return { success: true, count: this.questions.length };
      } else {
        // Fallback to sample questions if no DB questions found
        console.log("No questions in database, using sample questions");
        this.questions = [...sampleQuestions];
        return { success: true, count: this.questions.length, fallback: true };
      }
    } catch (error) {
      console.error("Error loading questions from database:", error);
      // Fallback to sample questions on error
      this.questions = [...sampleQuestions];
      return { success: false, error: error.message, fallback: true };
    }
  }

  // Utility method to shuffle array
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Add player to team
  addPlayerToTeam(playerId, playerName, teamName) {
    // Remove player from other team first
    this.removePlayerFromAllTeams(playerId);

    const team = teamName === "Team A" ? this.teamA : this.teamB;
    return team.addPlayer(playerId, playerName);
  }

  // Remove player from all teams
  removePlayerFromAllTeams(playerId) {
    this.teamA.removePlayer(playerId);
    this.teamB.removePlayer(playerId);
  }

  // Check if both teams have players
  canStartGame() {
    return this.teamA.members.length > 0 && this.teamB.members.length > 0;
  }

  // Start the game
  startGame() {
    if (!this.canStartGame()) {
      return {
        success: false,
        message: "Both teams must have at least one player",
      };
    }

    this.gameState = "playing";
    this.status = "countdown";
    this.currentQuestionIndex = 0;
    return { success: true };
  }

  // Get current question
  getCurrentQuestion() {
    if (this.currentQuestionIndex >= this.questions.length) {
      return null;
    }
    return this.questions[this.currentQuestionIndex];
  }

  // Handle buzzer press
  handleBuzz(playerId, teamName) {
    if (this.status !== "buzzer_active") {
      return { success: false, message: "Buzzing not allowed right now" };
    }

    // Check if player is in the specified team
    const team = teamName === "Team A" ? this.teamA : this.teamB;
    const isPlayerInTeam = team.members.some(
      (member) => member.id === playerId
    );

    if (!isPlayerInTeam) {
      return { success: false, message: "Player not in this team" };
    }

    // First team to buzz gets to answer
    if (!this.buzzedTeam) {
      this.buzzedTeam = teamName;
      this.answeringTeam = teamName;
      this.status = "team_answering";
      team.buzzedFirst = true;

      return {
        success: true,
        buzzedTeam: teamName,
        message: `${teamName} buzzed first!`,
      };
    }

    return { success: false, message: "Another team already buzzed" };
  }

  // Handle answer submission
  submitAnswer(playerId, teamName, answerIndex) {
    if (this.status !== "team_answering") {
      return { success: false, message: "Not in answering phase" };
    }

    if (this.answeringTeam !== teamName) {
      return { success: false, message: "It's not your team's turn to answer" };
    }

    // Check if player is in the team
    const team = teamName === "Team A" ? this.teamA : this.teamB;
    const isPlayerInTeam = team.members.some(
      (member) => member.id === playerId
    );

    if (!isPlayerInTeam) {
      return { success: false, message: "Player not in this team" };
    }

    const currentQuestion = this.getCurrentQuestion();
    if (!currentQuestion) {
      return { success: false, message: "No current question" };
    }

    const isCorrect = answerIndex === currentQuestion.correct;
    team.hasAnswered = true;

    if (isCorrect) {
      // Correct answer - team gets point, move to next question
      team.addPoint();
      this.roundResults.push({
        questionIndex: this.currentQuestionIndex,
        question: currentQuestion.question,
        correctAnswer: currentQuestion.correct,
        teamAAnswer: teamName === "Team A" ? answerIndex : null,
        teamBAnswer: teamName === "Team B" ? answerIndex : null,
        winner: teamName,
        bothAnswered: false,
      });

      return this.nextQuestion(true, teamName, answerIndex);
    } else {
      // Wrong answer - give other team a chance
      const otherTeam = teamName === "Team A" ? this.teamB : this.teamA;
      const otherTeamName = teamName === "Team A" ? "Team B" : "Team A";

      if (otherTeam.hasAnswered || this.bothTeamsAnswered) {
        // Both teams have answered incorrectly
        this.roundResults.push({
          questionIndex: this.currentQuestionIndex,
          question: currentQuestion.question,
          correctAnswer: currentQuestion.correct,
          teamAAnswer:
            teamName === "Team A"
              ? answerIndex
              : otherTeam.hasAnswered
              ? "incorrect"
              : null,
          teamBAnswer:
            teamName === "Team B"
              ? answerIndex
              : otherTeam.hasAnswered
              ? "incorrect"
              : null,
          winner: null,
          bothAnswered: true,
        });

        return this.nextQuestion(false, null, answerIndex);
      } else {
        // Give other team a chance
        this.answeringTeam = otherTeamName;
        this.bothTeamsAnswered = false;

        return {
          success: true,
          correct: false,
          nextTeam: otherTeamName,
          message: `${teamName} answered incorrectly. ${otherTeamName}'s turn!`,
          teamAnswer: answerIndex,
        };
      }
    }
  }

  // Move to next question or finish game
  nextQuestion(wasCorrect, winningTeam, lastAnswer) {
    this.currentQuestionIndex++;

    // Reset team states
    this.teamA.reset();
    this.teamB.reset();
    this.buzzedTeam = null;
    this.answeringTeam = null;
    this.bothTeamsAnswered = false;

    if (this.currentQuestionIndex >= this.questions.length) {
      // Game finished
      this.status = "finished";
      this.gameState = "finished";

      const winner = this.getWinner();
      return {
        success: true,
        correct: wasCorrect,
        gameFinished: true,
        winner,
        finalScores: {
          teamA: this.teamA.score,
          teamB: this.teamB.score,
        },
        teamAnswer: lastAnswer,
      };
    } else {
      // Next question
      this.status = "countdown";
      return {
        success: true,
        correct: wasCorrect,
        nextQuestion: true,
        winningTeam,
        teamAnswer: lastAnswer,
      };
    }
  }

  // Get game winner
  getWinner() {
    if (this.teamA.score > this.teamB.score) {
      return "Team A";
    } else if (this.teamB.score > this.teamA.score) {
      return "Team B";
    } else {
      return "Tie";
    }
  }

  // Activate buzzer phase
  activateBuzzer() {
    this.status = "buzzer_active";
    this.buzzedTeam = null;
    this.answeringTeam = null;
  }

  // Reset the current match while keeping the room and players.
  restartGame() {
    this.gameState = "lobby";
    this.status = "waiting";
    this.currentQuestionIndex = 0;
    this.buzzedTeam = null;
    this.answeringTeam = null;
    this.bothTeamsAnswered = false;
    this.roundResults = [];

    this.teamA.score = 0;
    this.teamB.score = 0;
    this.teamA.reset();
    this.teamB.reset();

    // Shuffle for a fresh rematch experience.
    this.questions = this.shuffleArray(this.questions);

    return { success: true };
  }

  // Get game state for clients
  getGameState() {
    return {
      id: this.id,
      creator: this.creator,
      status: this.status,
      gameState: this.gameState,
      teamA: {
        name: this.teamA.name,
        members: this.teamA.members,
        score: this.teamA.score,
        buzzedFirst: this.teamA.buzzedFirst,
        hasAnswered: this.teamA.hasAnswered,
      },
      teamB: {
        name: this.teamB.name,
        members: this.teamB.members,
        score: this.teamB.score,
        buzzedFirst: this.teamB.buzzedFirst,
        hasAnswered: this.teamB.hasAnswered,
      },
      currentQuestionIndex: this.currentQuestionIndex,
      totalQuestions: this.questions.length,
      buzzedTeam: this.buzzedTeam,
      answeringTeam: this.answeringTeam,
      currentQuestion: this.getCurrentQuestion(),
      questions: this.questions, // Include all questions for frontend
      roundResults: this.roundResults,
    };
  }

  // Get public game state (without correct answers)
  getPublicGameState() {
    const state = this.getGameState();

    // Remove correct answers from all questions for security
    if (state.questions) {
      state.questions = state.questions.map((question) => ({
        ...question,
        correct: undefined,
      }));
    }

    // Also remove correct answer from current question
    if (state.currentQuestion) {
      state.currentQuestion = {
        ...state.currentQuestion,
        correct: undefined,
      };
    }

    return state;
  }
}

export { QuizShowdownGame, QuizShowdownQuestion, sampleQuestions };
