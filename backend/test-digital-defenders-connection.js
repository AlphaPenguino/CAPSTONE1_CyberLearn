import { io } from "socket.io-client";

// Simple test to verify Digital Defenders socket connection and room creation/joining
const API_URL = process.env.API_URL || "http://localhost:5001";

function testDigitalDefendersConnection() {
  console.log("Testing Digital Defenders socket connection...");

  // Connect to the digital defenders namespace
  const socket = io(`${API_URL}/digital-defenders`, {
    transports: ["websocket", "polling"],
    forceNew: false,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 10,
    timeout: 20000,
  });

  let roomCode = null;
  let testPassed = false;

  socket.on("connect", () => {
    console.log("✅ Connected to Digital Defenders namespace:", socket.id);

    // Test room creation
    console.log("Creating room with test player...");
    socket.emit("create-room", {
      playerName: "Test Player",
      maxPlayers: 4,
    });
  });

  socket.on("room-created", (data) => {
    console.log("✅ Room created successfully:", data);
    roomCode = data.roomCode;

    // Test that room data is properly structured
    if (
      data.room &&
      data.room.id &&
      data.room.players &&
      data.playerId &&
      data.playerName
    ) {
      console.log("✅ Room creation response has all required fields");

      // Now test joining with another socket
      testJoinRoom();
    } else {
      console.log("❌ Room creation response missing required fields");
      socket.disconnect();
    }
  });

  socket.on("error", (error) => {
    console.log("❌ Socket error:", error);
    socket.disconnect();
  });

  socket.on("disconnect", (reason) => {
    console.log("Socket disconnected:", reason);
    if (testPassed) {
      console.log("✅ Test completed successfully!");
    } else {
      console.log("❌ Test failed");
    }
  });

  socket.on("connect_error", (error) => {
    console.log("❌ Connection error:", error.message);
  });

  function testJoinRoom() {
    if (!roomCode) {
      console.log("❌ No room code available for join test");
      socket.disconnect();
      return;
    }

    // Create second socket to test joining
    const socket2 = io(`${API_URL}/digital-defenders`, {
      transports: ["websocket", "polling"],
      forceNew: true,
      reconnection: true,
      timeout: 20000,
    });

    socket2.on("connect", () => {
      console.log("✅ Second socket connected:", socket2.id);
      console.log("Attempting to join room:", roomCode);

      socket2.emit("join-room", {
        roomCode: roomCode,
        playerName: "Test Player 2",
      });
    });

    socket2.on("room-joined", (data) => {
      console.log("✅ Successfully joined room:", data);

      if (
        data.room &&
        data.room.id === roomCode &&
        data.room.players &&
        data.room.players.length === 2
      ) {
        console.log("✅ Join room response has correct data");
        testPassed = true;
      } else {
        console.log("❌ Join room response has incorrect data");
      }

      // Clean up
      socket2.disconnect();
      setTimeout(() => {
        socket.disconnect();
      }, 1000);
    });

    socket2.on("error", (error) => {
      console.log("❌ Socket2 error:", error);
      socket2.disconnect();
      socket.disconnect();
    });

    socket2.on("connect_error", (error) => {
      console.log("❌ Socket2 connection error:", error.message);
      socket.disconnect();
    });
  }

  // Timeout after 30 seconds
  setTimeout(() => {
    if (!testPassed) {
      console.log("❌ Test timed out");
      socket.disconnect();
    }
  }, 30000);
}

// Run the test
testDigitalDefendersConnection();
