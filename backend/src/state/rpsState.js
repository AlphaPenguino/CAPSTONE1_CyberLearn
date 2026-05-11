// Shared in-memory state for RPS game rooms
// Stores active games, players, and timers for real-time synchronization
// NOTE: This is volatile (resets on server restart). For production, use a persistent DB.

export const rpsGames = new Map(); // roomCode -> RPSGame object
export const rpsPlayers = new Map(); // userId -> { roomCode, teamCode, username }
export const rpsTimers = new Map(); // roomCode -> { voteTimer, stealTimer }

/**
 * RPSGame structure:
 * {
 *   roomCode: string (6-char alphanumeric)
 *   createdAt: Date
 *   createdBy: userId string
 *   status: "lobby" | "playing" | "finished"
 *   phase: "room_setup" | "team_selection" | "game_rules" | "playing" | "finished"
 *   playStage: "question_display" | "voting" | "reveal" | "answering" | "rebound"
 *   players: {
 *     A: [{ userId, username, joinedAt }],
 *     B: [{ userId, username, joinedAt }]
 *   }
 *   scores: { A: number, B: number }
 *   currentRoundIndex: number
 *   currentQuestion: { id, question, options, correct }
 *   voteTally: { A: { rock, paper, scissors }, B: { rock, paper, scissors } }
 *   teamVotes: { A: "rock"|"paper"|"scissors", B: "rock"|"paper"|"scissors" }
 *   rpsWinner: "A" | "B" | "tie"
 *   answeringTeam: "A" | "B"
 *   selectedAnswer: number (option index)
 *   isCorrect: boolean
 *   gameHistory: [{ round, question, teamAVote, teamBVote, winner, answeringTeam, isCorrect, points }]
 *   voteTimer: number (seconds remaining)
 *   stealTimer: number (seconds remaining)
 * }
 */

export function createRpsGame(roomCode, createdBy, username) {
  const game = {
    roomCode,
    createdAt: new Date(),
    createdBy,
    creatorName: username,
    status: "lobby",
    phase: "team_selection",
    playStage: null,
    players: {
        A: [],
        B: [],
    },
    scores: { A: 0, B: 0 },
    currentRoundIndex: 0,
    currentQuestion: null,
    voteTally: { A: { rock: 0, paper: 0, scissors: 0 }, B: { rock: 0, paper: 0, scissors: 0 } },
    teamVotes: { A: null, B: null },
    rpsWinner: null,
    answeringTeam: null,
    selectedAnswer: null,
    isCorrect: null,
    gameHistory: [],
    voteTimer: 0,
    stealTimer: 0,
  };

  rpsGames.set(roomCode, game);

  return game;
}

export function joinRpsGame(roomCode, userId, username, teamCode) {
  const game = rpsGames.get(roomCode);
  if (!game) throw new Error("Game room not found");

  const maxPlayersPerTeam = 3;
  const teamPlayers = game.players[teamCode];

  if (teamPlayers.length >= maxPlayersPerTeam) {
    throw new Error(`Team ${teamCode} is full (max ${maxPlayersPerTeam} players)`);
  }

  // Check if player already in a team in this game
  const existingTeam = Object.keys(game.players).find((team) =>
    game.players[team].some((p) => p.userId === userId)
  );

  if (existingTeam && existingTeam !== teamCode) {
    // Remove from old team
    game.players[existingTeam] = game.players[existingTeam].filter(
      (p) => p.userId !== userId
    );
  }

  // Add to new team if not already there
  if (!teamPlayers.some((p) => p.userId === userId)) {
    teamPlayers.push({ userId, username, joinedAt: new Date() });
  }

  rpsPlayers.set(userId, { roomCode, teamCode, username });

  return game;
}

export function leaveRpsGame(userId, roomCode) {
  const game = rpsGames.get(roomCode);
  if (!game) return;

  // Remove player from their team
  Object.keys(game.players).forEach((team) => {
    game.players[team] = game.players[team].filter((p) => p.userId !== userId);
  });

  rpsPlayers.delete(userId);

  // Delete room if empty
  if (
    game.players.A.length === 0 &&
    game.players.B.length === 0
  ) {
    rpsGames.delete(roomCode);
    rpsTimers.delete(roomCode);
  }

  return game;
}

export function getRpsGameState(roomCode) {
  return rpsGames.get(roomCode);
}

export function updateRpsGameState(roomCode, updates) {
  const game = rpsGames.get(roomCode);
  if (!game) throw new Error("Game room not found");

  Object.assign(game, updates);
  return game;
}

export function deleteRpsGame(roomCode) {
  rpsGames.delete(roomCode);
  rpsTimers.delete(roomCode);
}

export function getAllRpsGames() {
  return Array.from(rpsGames.values());
}
