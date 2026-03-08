// Shared in-memory state for Knowledge Relay so routes and controllers can coordinate
// NOTE: This is volatile (resets on server restart). For production, replace with a DB.

export const knowledgeRelayGames = new Map(); // roomId -> KnowledgeRelayGame
export const knowledgeRelayPlayers = new Map(); // socketId -> { gameId, playerName, isCreator, teamId? }
export const knowledgeRelayGameTimers = new Map(); // roomId -> setInterval timer
