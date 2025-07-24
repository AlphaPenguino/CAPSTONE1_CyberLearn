// Sample questions for the relay race
const sampleQuestions = [
  {
    id: 1,
    question: "What does ICT stand for?",
    options: ["Information and Communication Technology", "International Communication Tool", "Internet and Computer Technology", "Information for Computer Training"],
    correct: 0,
    difficulty: "easy",
  },
  // ...all the other questions
];

class RelayGame {
  constructor(gameId, creatorId, creatorName) {
    this.id = gameId;
    this.creator = {
      id: creatorId,
      name: creatorName,
    };
    this.teams = new Map();
    this.questions = [...sampleQuestions];
    this.currentQuestionIndex = 0;
    this.status = "waiting"; // waiting, active, finished
    this.maxTeams = 4;
    this.questionsPerTeam = 5;
  }

  // Add method to check if player is creator
  isCreator(playerId) {
    return this.creator.id === playerId;
  }

  // Update getGameState method to include creator info
  getGameState() {
    return {
      id: this.id,
      creator: this.creator,
      status: this.status,
      teams: Array.from(this.teams.entries()).map(([name, team]) => ({
        name,
        members: team.members,
        currentPlayerIndex: team.currentPlayerIndex,
        questionsCompleted: team.questionsCompleted,
        helpUsed: team.helpUsed,
        maxHelp: team.maxHelp,
        isFinished: team.isFinished,
      })),
      totalQuestions: this.questionsPerTeam,
    };
  }

  addTeam(teamName) {
    if (this.teams.size >= this.maxTeams) {
      return { success: false, message: "Game is full" };
    }

    const team = {
      name: teamName,
      members: [],
      currentPlayerIndex: 0,
      questionsCompleted: 0,
      helpUsed: 0,
      maxHelp: 2,
      completedQuestions: [],
      isFinished: false,
    };

    this.teams.set(teamName, team);
    return { success: true, team };
  }

  addPlayerToTeam(playerId, playerName, teamName) {
    const team = this.teams.get(teamName);
    if (!team) {
      return { success: false, message: "Team not found" };
    }

    if (team.members.length >= 5) {
      return { success: false, message: "Team is full" };
    }

    const player = {
      id: playerId,
      name: playerName,
      teamName,
      questionsAnswered: 0,
      isActive: false,
    };

    team.members.push(player);

    // Set first player as active
    if (team.members.length === 1) {
      player.isActive = true;
    }

    return { success: true, player };
  }

  getCurrentQuestion(teamName) {
    const team = this.teams.get(teamName);
    if (!team || team.questionsCompleted >= this.questionsPerTeam) {
      return null;
    }

    return this.questions[team.questionsCompleted];
  }

  answerQuestion(teamName, playerId, answerIndex) {
    const team = this.teams.get(teamName);
    if (!team) {
      return { success: false, message: "Team not found" };
    }

    const currentPlayer = team.members[team.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.id !== playerId) {
      return { success: false, message: "Not your turn" };
    }

    const question = this.getCurrentQuestion(teamName);
    if (!question) {
      return { success: false, message: "No more questions" };
    }

    const isCorrect = answerIndex === question.correct;

    if (isCorrect) {
      // Correct answer - pass to next player
      currentPlayer.questionsAnswered++;
      team.questionsCompleted++;
      team.completedQuestions.push({
        questionId: question.id,
        playerId: currentPlayer.id,
        playerName: currentPlayer.name,
        correct: true,
      });

      // Move to next player
      currentPlayer.isActive = false;
      team.currentPlayerIndex = (team.currentPlayerIndex + 1) % team.members.length;

      if (team.currentPlayerIndex < team.members.length) {
        team.members[team.currentPlayerIndex].isActive = true;
      }

      // Check if team finished
      if (team.questionsCompleted >= this.questionsPerTeam) {
        team.isFinished = true;
        this.checkGameEnd();
      }

      return {
        success: true,
        correct: true,
        message: "Correct! Passing to next player.",
        nextPlayer: team.members[team.currentPlayerIndex]?.name,
        teamProgress: team.questionsCompleted,
        totalQuestions: this.questionsPerTeam,
      };
    } else {
      return {
        success: true,
        correct: false,
        message: "Incorrect answer. Try again or ask for help!",
        correctAnswer: question.options[question.correct],
      };
    }
  }

  requestHelp(teamName, playerId) {
    const team = this.teams.get(teamName);
    if (!team) {
      return { success: false, message: "Team not found" };
    }

    if (team.helpUsed >= team.maxHelp) {
      return { success: false, message: "No help remaining" };
    }

    const currentPlayer = team.members[team.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.id !== playerId) {
      return { success: false, message: "Not your turn" };
    }

    team.helpUsed++;
    return {
      success: true,
      helpRemaining: team.maxHelp - team.helpUsed,
      message: "Help request sent to team members!",
    };
  }

  checkGameEnd() {
    const finishedTeams = Array.from(this.teams.values()).filter((team) => team.isFinished);
    if (finishedTeams.length > 0) {
      this.status = "finished";
      return finishedTeams[0]; // Winner
    }
    return null;
  }
}

export { RelayGame, sampleQuestions };