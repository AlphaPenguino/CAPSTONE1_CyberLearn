# Quiz Showdown Backend Implementation

## Overview

This document describes the backend implementation for the Quiz Showdown game mode - a competitive team-based quiz game where two teams compete to answer questions correctly and quickly.

## Architecture

### Core Components

1. **QuizShowdown Model** (`/models/QuizShowdown.js`)

   - `QuizShowdownGame`: Main game logic and state management
   - `Team`: Team management and scoring
   - `QuizShowdownQuestion`: MongoDB schema for questions
   - Sample questions for initial testing

2. **Controller** (`/controllers/quizShowdownController.js`)

   - Socket.IO event handlers for real-time gameplay
   - Game state management
   - Player and team management
   - Buzzer and answer mechanics

3. **Routes** (`/routes/quizShowdownRoutes.js`)

   - RESTful API for question CRUD operations
   - Question search and bulk operations
   - Authentication for instructor features

4. **Scripts**
   - `setup-quiz-showdown.js`: Initialize database with sample questions
   - `test-quiz-showdown.js`: Comprehensive testing suite

## Socket.IO Events

### Namespace: `/quiz-showdown`

#### Client to Server Events

| Event             | Data                                | Description                   |
| ----------------- | ----------------------------------- | ----------------------------- |
| `create-room`     | `{ playerName }`                    | Create a new game room        |
| `join-room`       | `{ roomId, playerName }`            | Join an existing room         |
| `join-team`       | `{ roomId, teamName }`              | Join Team A or Team B         |
| `start-game`      | `{ roomId }`                        | Start the game (creator only) |
| `buzz`            | `{ roomId, teamName }`              | Buzz in to answer             |
| `submit-answer`   | `{ roomId, teamName, answerIndex }` | Submit answer choice          |
| `get-game-state`  | `{ roomId }`                        | Request current game state    |
| `admin-get-games` | `{}`                                | Get all active games (admin)  |

#### Server to Client Events

| Event                 | Data                                                | Description                 |
| --------------------- | --------------------------------------------------- | --------------------------- |
| `room-created`        | `{ roomId, game, isCreator, playerName }`           | Room creation confirmation  |
| `room-joined`         | `{ roomId, game, isCreator, playerName }`           | Room join confirmation      |
| `player-joined`       | `{ playerName, game }`                              | New player joined room      |
| `team-updated`        | `{ game, playerName, teamName }`                    | Team composition changed    |
| `team-joined`         | `{ teamName, game }`                                | Player joined a team        |
| `game-started`        | `{ game }`                                          | Game has started            |
| `buzzer-activated`    | `{ game }`                                          | Buzzing phase activated     |
| `team-buzzed`         | `{ buzzedTeam, message, game }`                     | Team buzzed first           |
| `answer-submitted`    | `{ teamName, answerIndex, correct, message, game }` | Answer result               |
| `next-question`       | `{ game }`                                          | Moving to next question     |
| `team-turn`           | `{ answeringTeam, game }`                           | Other team's turn to answer |
| `game-finished`       | `{ winner, finalScores, game }`                     | Game completed              |
| `player-disconnected` | `{ playerName, teamName, game }`                    | Player left                 |
| `room-closed`         | `{ message }`                                       | Room was closed             |
| `error`               | `{ message }`                                       | Error occurred              |
| `buzz-failed`         | `{ message }`                                       | Buzz attempt failed         |
| `answer-failed`       | `{ message }`                                       | Answer submission failed    |

## REST API Endpoints

### Base URL: `/api/quiz-showdown`

#### Questions Management

| Method | Endpoint                 | Auth | Description               |
| ------ | ------------------------ | ---- | ------------------------- |
| GET    | `/questions`             | No   | Get all questions         |
| GET    | `/questions/:id`         | No   | Get specific question     |
| POST   | `/questions`             | Yes  | Create new question       |
| PUT    | `/questions/:id`         | Yes  | Update question           |
| DELETE | `/questions/:id`         | Yes  | Delete question           |
| POST   | `/questions/bulk`        | Yes  | Create multiple questions |
| GET    | `/questions/stats/count` | No   | Get questions count       |
| GET    | `/questions/search`      | No   | Search questions          |

#### Request/Response Examples

**Create Question:**

```json
POST /api/quiz-showdown/questions
Authorization: Bearer <token>

{
  "question": "What does HTML stand for?",
  "options": [
    "High Tech Modern Language",
    "Home Tool Markup Language",
    "HyperText Markup Language",
    "Hard To Make Language"
  ],
  "correct": 2
}

Response:
{
  "success": true,
  "message": "Question created successfully",
  "data": {
    "_id": "...",
    "question": "What does HTML stand for?",
    "options": [...],
    "correct": 2,
    "createdBy": {...},
    "createdAt": "..."
  }
}
```

**Search Questions:**

```json
GET /api/quiz-showdown/questions/search?query=HTML&limit=5

Response:
{
  "success": true,
  "data": {
    "questions": [...],
    "total": 3,
    "limit": 5,
    "skip": 0
  }
}
```

## Game Flow

### 1. Room Creation & Joining

```
Client → create-room → Server
Server → room-created → Client
Other Clients → join-room → Server
Server → room-joined → Client
Server → player-joined → All Clients
```

### 2. Team Selection

```
Client → join-team → Server
Server → team-updated → All Clients
Server → team-joined → Client
```

### 3. Game Start

```
Creator → start-game → Server
Server → game-started → All Clients
Server (after 3s) → buzzer-activated → All Clients
```

### 4. Question Round

```
Any Client → buzz → Server
Server → team-buzzed → All Clients
Buzzed Team → submit-answer → Server
Server → answer-submitted → All Clients

If Wrong:
  Other Team → submit-answer → Server
  Server → answer-submitted → All Clients

Server (after 2s) → next-question → All Clients
Server (after 3s) → buzzer-activated → All Clients
```

### 5. Game End

```
Server → game-finished → All Clients
```

## Game States

### Game State Values

- `waiting`: Lobby, waiting for players
- `countdown`: 3-2-1 countdown before buzzing
- `buzzer_active`: Teams can buzz in
- `team_answering`: Selected team is answering
- `finished`: Game completed

### Game Phases

- `lobby`: Pre-game team selection
- `playing`: Active gameplay
- `finished`: Post-game results

## Data Models

### QuizShowdownQuestion Schema

```javascript
{
  question: String (required),
  options: [String] (4 options required),
  correct: Number (0-3, required),
  createdBy: ObjectId (ref: Users),
  createdAt: Date
}
```

### Game State Object

```javascript
{
  id: String,
  creator: { id, name },
  status: String,
  gameState: String,
  teamA: {
    name: "Team A",
    members: [{ id, name }],
    score: Number,
    buzzedFirst: Boolean,
    hasAnswered: Boolean
  },
  teamB: { /* same as teamA */ },
  currentQuestionIndex: Number,
  totalQuestions: Number,
  buzzedTeam: String,
  answeringTeam: String,
  currentQuestion: {
    question: String,
    options: [String],
    // correct answer excluded in public state
  },
  roundResults: [...]
}
```

## Setup and Testing

### Initial Setup

```bash
# Install dependencies
npm install

# Setup Quiz Showdown with sample questions
npm run setup:quiz-showdown

# Run the server
npm run dev
```

### Testing

```bash
# Run comprehensive tests
npm run test:quiz-showdown

# Test Socket.IO connection
# Connect to http://localhost:3000/quiz-showdown
```

### Environment Variables

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/cyber-learn
JWT_SECRET=your-jwt-secret
```

## Security Features

### Authentication

- Question CRUD operations require JWT authentication
- Only authenticated instructors can manage questions
- Room creation and gameplay don't require authentication

### Validation

- All question fields validated before saving
- Answer indices must be 0-3
- All options must be non-empty
- Room IDs are validated
- Player permissions checked for each action

### Rate Limiting

- Buzzer actions are time-gated
- Multiple buzz attempts from same team ignored
- Answer timeouts prevent hanging games

## Error Handling

### Common Error Scenarios

1. **Room not found**: Invalid room ID
2. **Game in progress**: Cannot join started game
3. **Team full**: Maximum 4 players per team
4. **Invalid buzz**: Buzzing when not allowed
5. **Wrong team**: Player not in specified team
6. **Invalid answer**: Answer index out of range

### Error Response Format

```json
{
  "success": false,
  "message": "Error description",
  "error": "Technical details (dev mode)"
}
```

## Performance Considerations

### Memory Management

- Games auto-cleanup after 24 hours
- Player data cleaned on disconnect
- Efficient Map usage for game storage

### Scalability

- Namespaced Socket.IO for isolation
- Stateless question API
- Database indexing on search fields

### Real-time Performance

- Minimal data in socket events
- Public state excludes sensitive data
- Efficient team membership checks

## Integration Points

### Frontend Integration

```javascript
// Connect to Quiz Showdown namespace
const socket = io("/quiz-showdown");

// Create room
socket.emit("create-room", { playerName: "Alice" });

// Join team
socket.emit("join-team", { roomId: "123", teamName: "Team A" });

// Buzz in
socket.emit("buzz", { roomId: "123", teamName: "Team A" });

// Submit answer
socket.emit("submit-answer", {
  roomId: "123",
  teamName: "Team A",
  answerIndex: 2,
});
```

### Question Management

```javascript
// Fetch questions for instructor panel
fetch("/api/quiz-showdown/questions")
  .then((res) => res.json())
  .then((data) => console.log(data.data));

// Create new question
fetch("/api/quiz-showdown/questions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    question: "Your question here",
    options: ["A", "B", "C", "D"],
    correct: 2,
  }),
});
```

## Monitoring and Logging

### Logs Generated

- Room creation/joining events
- Game start/end events
- Player disconnections
- Error events with context
- Performance metrics

### Health Checks

- Active games count
- Connected players count
- Database connection status
- Memory usage monitoring

This implementation provides a robust, scalable backend for the Quiz Showdown game mode with real-time multiplayer support, comprehensive question management, and proper error handling.
