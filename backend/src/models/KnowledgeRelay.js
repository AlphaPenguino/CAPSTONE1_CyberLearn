// Knowledge Relay Game Model - Team-based multiplayer quiz game

// Sample cybersecurity questions for Knowledge Relay
const knowledgeRelayQuestions = [
  {
    id: 1,
    question: "What does HTTPS stand for?",
    options: [
      "Hypertext Transfer Protocol Secure",
      "Hypertext Transport Protocol Safe",
      "High Transfer Text Protocol Secure",
      "Hyperlink Transfer Protocol Secure",
    ],
    correctAnswer: 0,
    category: "Web Security",
    difficulty: "Easy",
    points: 1,
  },
  {
    id: 2,
    question: "What is a firewall's primary function?",
    options: [
      "Speed up internet connection",
      "Filter network traffic based on security rules",
      "Store user passwords",
      "Encrypt data files",
    ],
    correctAnswer: 1,
    category: "Network Security",
    difficulty: "Easy",
    points: 1,
  },
  {
    id: 3,
    question: "What does 2FA stand for in cybersecurity?",
    options: [
      "Two-Factor Authentication",
      "Two-File Authorization",
      "Dual-Firewall Access",
      "Double-Function Algorithm",
    ],
    correctAnswer: 0,
    category: "Authentication",
    difficulty: "Medium",
    points: 2,
  },
  {
    id: 4,
    question: "Which of these is NOT a strong password practice?",
    options: [
      "Using a mix of letters, numbers, and symbols",
      "Making passwords at least 12 characters long",
      "Using the same password for multiple accounts",
      "Including both uppercase and lowercase letters",
    ],
    correctAnswer: 2,
    category: "Authentication",
    difficulty: "Easy",
    points: 1,
  },
  {
    id: 5,
    question: "What is phishing?",
    options: [
      "A type of computer virus",
      "A method of data encryption",
      "A social engineering attack to steal sensitive information",
      "A network monitoring tool",
    ],
    correctAnswer: 2,
    category: "Social Engineering",
    difficulty: "Medium",
    points: 2,
  },
  {
    id: 6,
    question: "What does DDoS stand for?",
    options: [
      "Data Denial of Service",
      "Distributed Denial of Service",
      "Digital Defense of Systems",
      "Direct Download of Software",
    ],
    correctAnswer: 1,
    category: "Network Security",
    difficulty: "Medium",
    points: 2,
  },
  {
    id: 7,
    question: "Which wireless security protocol is considered the most secure?",
    options: ["WEP", "WPA", "WPA2", "WPA3"],
    correctAnswer: 3,
    category: "Network Security",
    difficulty: "Hard",
    points: 3,
  },
  {
    id: 8,
    question: "What does S/MIME provide in email security?",
    options: [
      "Spam filtering only",
      "Digital signatures and encryption",
      "Faster email delivery",
      "Automatic backup of emails",
    ],
    correctAnswer: 1,
    category: "Email Security",
    difficulty: "Hard",
    points: 3,
  },
];

// Team configuration
const TEAMS = {
  A: { name: "Team Alpha", color: "#ef4444", icon: "alpha-a-circle" },
  B: { name: "Team Beta", color: "#3b82f6", icon: "alpha-b-circle" },
  C: { name: "Team Charlie", color: "#10b981", icon: "alpha-c-circle" },
  D: { name: "Team Delta", color: "#f59e0b", icon: "alpha-d-circle" },
};

// Game phases
const PHASES = {
  ROOM_SETUP: "room_setup",
  TEAM_SELECTION: "team_selection",
  GAME_RULES: "game_rules",
  PLAYING: "playing",
  FINISHED: "finished",
  INSTRUCTOR_EDITOR: "instructor_editor",
};

class KnowledgeRelayGame {
  constructor(roomId, creatorId, creatorName) {
    this.roomId = roomId;
    this.creator = {
      id: creatorId,
      name: creatorName,
    };
    this.phase = PHASES.TEAM_SELECTION;
    this.teams = {
      A: {
        name: "Team Alpha",
        color: "#ef4444",
        icon: "alpha-a-circle",
        players: [],
        score: 0,
        passesRemaining: 2,
        currentPlayerIndex: 0,
      },
      B: {
        name: "Team Beta",
        color: "#3b82f6",
        icon: "alpha-b-circle",
        players: [],
        score: 0,
        passesRemaining: 2,
        currentPlayerIndex: 0,
      },
      C: {
        name: "Team Charlie",
        color: "#10b981",
        icon: "alpha-c-circle",
        players: [],
        score: 0,
        passesRemaining: 2,
        currentPlayerIndex: 0,
      },
      D: {
        name: "Team Delta",
        color: "#f59e0b",
        icon: "alpha-d-circle",
        players: [],
        score: 0,
        passesRemaining: 2,
        currentPlayerIndex: 0,
      },
    };
    this.questions = [...knowledgeRelayQuestions];
    this.currentQuestionIndex = 0;
    this.currentTeam = "A"; // Which team's turn it is
    this.timer = 30;
    this.isTimerActive = false;
    this.timerInterval = null;
    this.gameStartTime = null;
    this.gameEndTime = null;
    this.disconnectedPlayers = new Set();
    this.createdAt = new Date();
  }

  // Check if player is the game creator
  isCreator(playerId) {
    return this.creator.id === playerId;
  }

  // Get complete game state
  getGameState() {
    const activePlayers = this.getAllActivePlayers();
    const currentTeamData = this.teams[this.currentTeam];
    const currentPlayer =
      currentTeamData &&
      currentTeamData.players &&
      currentTeamData.players.length > 0
        ? currentTeamData.players[currentTeamData.currentPlayerIndex]
        : null;

    return {
      roomId: this.roomId,
      creator: this.creator,
      phase: this.phase,
      teams: this.teams,
      questions: this.questions,
      currentQuestionIndex: this.currentQuestionIndex,
      totalQuestions: this.questions.length,
      currentTeam: this.currentTeam,
      currentPlayer: currentPlayer,
      timer: this.timer,
      isTimerActive: this.isTimerActive,
      playerCount: activePlayers.length,
      teamsWithPlayers: this.getTeamsWithPlayers(),
      gameStartTime: this.gameStartTime,
      gameEndTime: this.gameEndTime,
    };
  }

  // Add player to a team
  addPlayerToTeam(playerId, playerName, teamId) {
    if (!this.teams[teamId]) {
      return { success: false, message: "Invalid team" };
    }

    // Check if player already exists in any team
    for (const team of Object.values(this.teams)) {
      const existingPlayer = team.players.find((p) => p.id === playerId);
      if (existingPlayer) {
        return { success: false, message: "Player already in a team" };
      }
    }

    const player = {
      id: playerId,
      name: playerName,
      teamId: teamId,
      questionsAnswered: 0,
      correctAnswers: 0,
      joinedAt: new Date(),
    };

    this.teams[teamId].players.push(player);

    return { success: true, player, team: this.teams[teamId] };
  }

  // Remove player from their team
  removePlayer(playerId) {
    for (const teamId of Object.keys(this.teams)) {
      const team = this.teams[teamId];
      const playerIndex = team.players.findIndex((p) => p.id === playerId);

      if (playerIndex !== -1) {
        team.players.splice(playerIndex, 1);

        // Adjust current player index if needed
        if (team.currentPlayerIndex >= team.players.length) {
          team.currentPlayerIndex = 0;
        }

        return { success: true, teamId, removedPlayer: true };
      }
    }

    return { success: false, message: "Player not found" };
  }

  // Mark player as disconnected (they cannot rejoin)
  disconnectPlayer(playerId) {
    this.disconnectedPlayers.add(playerId);
    return this.removePlayer(playerId);
  }

  // Get all active (non-disconnected) players
  getAllActivePlayers() {
    const players = [];
    for (const team of Object.values(this.teams)) {
      for (const player of team.players) {
        if (!this.disconnectedPlayers.has(player.id)) {
          players.push(player);
        }
      }
    }
    return players;
  }

  // Get teams that have at least one player
  getTeamsWithPlayers() {
    const teamsWithPlayers = [];
    for (const [teamId, team] of Object.entries(this.teams)) {
      if (team.players.length > 0) {
        teamsWithPlayers.push(teamId);
      }
    }
    return teamsWithPlayers;
  }

  // Start the game (move to playing phase)
  startGame() {
    const teamsWithPlayers = this.getTeamsWithPlayers();

    if (teamsWithPlayers.length < 2) {
      return { success: false, message: "Need at least 2 teams to start" };
    }

    // Check that each team has at least one player
    for (const teamId of teamsWithPlayers) {
      if (this.teams[teamId].players.length === 0) {
        return {
          success: false,
          message: `Team ${this.teams[teamId].name} needs at least one player`,
        };
      }
    }

    this.phase = PHASES.PLAYING;
    this.gameStartTime = new Date();
    this.currentTeam = teamsWithPlayers[0]; // Start with first team that has players
    this.startTimer();

    return { success: true, message: "Game started!" };
  }

  // Get current question
  getCurrentQuestion() {
    if (this.currentQuestionIndex >= this.questions.length) {
      return null;
    }
    return this.questions[this.currentQuestionIndex];
  }

  // Start the 30-second timer
  startTimer() {
    this.timer = 30;
    this.isTimerActive = true;
  }

  // Stop the timer
  stopTimer() {
    this.isTimerActive = false;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  // Handle timer tick (should be called every second)
  tickTimer() {
    if (!this.isTimerActive) return false;

    this.timer--;

    if (this.timer <= 0) {
      return this.handleTimeout();
    }

    return { timerTick: true, timer: this.timer };
  }

  // Handle timeout (30 seconds elapsed)
  handleTimeout() {
    const currentTeamData = this.teams[this.currentTeam];

    // If team has passes remaining, auto-pass
    if (currentTeamData.passesRemaining > 0) {
      return this.usePass(this.currentTeam);
    } else {
      // Treat as wrong answer and move to next player
      return this.moveToNextPlayer(false);
    }
  }

  // Process answer to current question
  answerQuestion(playerId, answerIndex) {
    const currentTeamData = this.teams[this.currentTeam];
    const currentPlayer =
      currentTeamData.players[currentTeamData.currentPlayerIndex];

    // Verify it's the correct player's turn
    if (!currentPlayer || currentPlayer.id !== playerId) {
      return { success: false, message: "Not your turn" };
    }

    // Check if player is disconnected
    if (this.disconnectedPlayers.has(playerId)) {
      return { success: false, message: "Disconnected players cannot answer" };
    }

    const question = this.getCurrentQuestion();
    if (!question) {
      return { success: false, message: "No current question" };
    }

    const isCorrect = answerIndex === question.correctAnswer;

    // Stop timer
    this.stopTimer();

    // Update player stats
    currentPlayer.questionsAnswered++;
    if (isCorrect) {
      currentPlayer.correctAnswers++;
      currentTeamData.score += question.points;
    }

    if (isCorrect) {
      // Move to next question
      this.currentQuestionIndex++;

      // Check if game is finished
      if (this.currentQuestionIndex >= this.questions.length) {
        this.endGame();
        return {
          success: true,
          correct: true,
          question,
          correctAnswer: question.correctAnswer,
          pointsEarned: question.points,
          gameFinished: true,
          finalResults: this.getFinalResults(),
        };
      }

      // Move to next team's turn
      this.moveToNextTeam();
      this.startTimer();

      return {
        success: true,
        correct: true,
        question,
        correctAnswer: question.correctAnswer,
        pointsEarned: question.points,
        newScore: currentTeamData.score,
        nextTeam: this.currentTeam,
        currentQuestion: this.getCurrentQuestion(),
      };
    } else {
      // Wrong answer - same question goes to next player
      const nextPlayerResult = this.moveToNextPlayer(false);
      this.startTimer();

      return {
        success: true,
        correct: false,
        question,
        correctAnswer: question.correctAnswer,
        pointsEarned: 0,
        ...nextPlayerResult,
      };
    }
  }

  // Use a pass (skip current question)
  usePass(teamId) {
    const team = this.teams[teamId];

    if (team.passesRemaining <= 0) {
      return { success: false, message: "No passes remaining" };
    }

    team.passesRemaining--;
    this.stopTimer();

    // Move to next player
    const nextPlayerResult = this.moveToNextPlayer(true);
    this.startTimer();

    return {
      success: true,
      passed: true,
      passesRemaining: team.passesRemaining,
      ...nextPlayerResult,
    };
  }

  // Move to next player in rotation
  moveToNextPlayer(wasPass) {
    const teamsWithPlayers = this.getTeamsWithPlayers();
    const currentTeamIndex = teamsWithPlayers.indexOf(this.currentTeam);
    const nextTeamIndex = (currentTeamIndex + 1) % teamsWithPlayers.length;
    const nextTeamId = teamsWithPlayers[nextTeamIndex];

    this.currentTeam = nextTeamId;
    const nextTeam = this.teams[nextTeamId];

    // Move to next player in the team
    nextTeam.currentPlayerIndex =
      (nextTeam.currentPlayerIndex + 1) % nextTeam.players.length;

    const currentPlayer = nextTeam.players[nextTeam.currentPlayerIndex];

    return {
      nextTeam: nextTeamId,
      currentPlayer: currentPlayer,
      currentQuestion: this.getCurrentQuestion(),
      message: wasPass ? "Question passed" : "Wrong answer",
    };
  }

  // Move to next team (after correct answer)
  moveToNextTeam() {
    const teamsWithPlayers = this.getTeamsWithPlayers();
    const currentTeamIndex = teamsWithPlayers.indexOf(this.currentTeam);
    const nextTeamIndex = (currentTeamIndex + 1) % teamsWithPlayers.length;

    this.currentTeam = teamsWithPlayers[nextTeamIndex];
  }

  // End the game
  endGame() {
    this.phase = PHASES.FINISHED;
    this.gameEndTime = new Date();
    this.stopTimer();
  }

  // Get final game results
  getFinalResults() {
    const results = [];

    for (const [teamId, team] of Object.entries(this.teams)) {
      if (team.players.length > 0) {
        results.push({
          teamId,
          teamName: team.name,
          color: team.color,
          score: team.score,
          players: team.players,
          passesUsed: 2 - team.passesRemaining,
        });
      }
    }

    // Sort by score (highest first)
    results.sort((a, b) => b.score - a.score);

    return {
      rankings: results,
      winner: results[0],
      gameStats: {
        totalQuestions: this.questions.length,
        questionsAnswered: this.currentQuestionIndex,
        gameDuration: this.gameEndTime - this.gameStartTime,
        totalPlayers: this.getAllActivePlayers().length,
      },
    };
  }

  // Update game questions (for instructor mode)
  updateQuestions(newQuestions) {
    if (!Array.isArray(newQuestions) || newQuestions.length === 0) {
      return { success: false, message: "Invalid questions array" };
    }

    // Validate question format
    for (const question of newQuestions) {
      if (
        !question.question ||
        !question.options ||
        !Array.isArray(question.options) ||
        question.options.length < 2 ||
        typeof question.correctAnswer !== "number" ||
        question.correctAnswer < 0 ||
        question.correctAnswer >= question.options.length
      ) {
        return { success: false, message: "Invalid question format" };
      }
    }

    this.questions = newQuestions.map((q, index) => ({
      ...q,
      id: q.id || index + 1,
      points:
        q.points ||
        (q.difficulty === "Hard" ? 3 : q.difficulty === "Medium" ? 2 : 1),
    }));

    return {
      success: true,
      message: "Questions updated",
      questionCount: this.questions.length,
    };
  }

  // Check if game can be started
  canStartGame() {
    const teamsWithPlayers = this.getTeamsWithPlayers();
    return teamsWithPlayers.length >= 2;
  }

  // Get leaderboard data
  getLeaderboard() {
    const leaderboard = [];

    for (const [teamId, team] of Object.entries(this.teams)) {
      if (team.players.length > 0) {
        leaderboard.push({
          teamId,
          teamName: team.name,
          color: team.color,
          score: team.score,
          playerCount: team.players.length,
          passesRemaining: team.passesRemaining,
        });
      }
    }

    // Sort by score (highest first)
    leaderboard.sort((a, b) => b.score - a.score);

    return leaderboard;
  }
}

export { KnowledgeRelayGame, knowledgeRelayQuestions, TEAMS, PHASES };
