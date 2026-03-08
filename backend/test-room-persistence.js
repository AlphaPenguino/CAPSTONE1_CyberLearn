import { io } from "socket.io-client";

// Test script to verify room persistence fix
async function testRoomPersistence() {
  console.log("🧪 Testing Digital Defenders room persistence fix...\n");

  // Create first client (room creator)
  const client1 = io("http://localhost:3000/digital-defenders");

  await new Promise((resolve) => {
    client1.on("connect", () => {
      console.log("✅ Client 1 connected:", client1.id);
      resolve();
    });
  });

  // Create room
  let roomCode;
  await new Promise((resolve) => {
    client1.emit("create-room", {
      playerName: "John Doe",
      maxPlayers: 4,
    });

    client1.on("room-created", (data) => {
      roomCode = data.roomCode;
      console.log("✅ Room created:", roomCode);
      console.log("   Players in room:", data.room.players.length);
      resolve();
    });
  });

  // Wait a moment, then disconnect client 1 (simulating network issue)
  await new Promise((resolve) => setTimeout(resolve, 1000));
  console.log("\n🔌 Disconnecting Client 1 (simulating network issue)...");
  client1.disconnect();

  // Wait 2 seconds (should be less than our 5-minute cleanup timer)
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Create second client and try to join the room
  const client2 = io("http://localhost:3000/digital-defenders");

  await new Promise((resolve) => {
    client2.on("connect", () => {
      console.log("✅ Client 2 connected:", client2.id);
      resolve();
    });
  });

  // Try to join the room (using the room code from earlier)
  console.log("\n🎯 Client 2 attempting to join room:", roomCode);

  client2.emit("join-room", {
    roomCode: roomCode,
    playerName: "Prof. Emily Davis",
  });

  // Listen for success or error
  client2.on("room-joined", (data) => {
    console.log("✅ SUCCESS! Room joined successfully:");
    console.log("   Room ID:", data.roomCode);
    console.log("   Player name:", data.playerName);
    console.log("   Players in room:", data.room.players.length);
    console.log(
      "\n🎉 Fix is working! Room persisted after creator disconnect."
    );
    process.exit(0);
  });

  client2.on("error", (error) => {
    console.log("❌ ERROR:", error.message);
    if (error.message === "Room not found") {
      console.log(
        "🚫 Room was cleaned up too early - fix not working properly."
      );
    }
    process.exit(1);
  });

  // Timeout after 10 seconds
  setTimeout(() => {
    console.log("⏰ Test timed out");
    process.exit(1);
  }, 10000);
}

testRoomPersistence().catch(console.error);
