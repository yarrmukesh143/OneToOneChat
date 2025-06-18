// src/JoinRoom.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function JoinRoom() {
  const [username, setUsername] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const navigate = useNavigate();

  const handleJoin = () => {
    if (!username || !roomCode) return alert("Enter username and room code");
    navigate(`/chat/${roomCode}?username=${encodeURIComponent(username)}`);
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>🚪 Join a Chat Room</h1>
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        style={{ display: "block", margin: "10px 0" }}
      />
      <input
        type="text"
        placeholder="Room Code"
        value={roomCode}
        onChange={(e) => setRoomCode(e.target.value)}
        style={{ display: "block", margin: "10px 0" }}
      />
      <button onClick={handleJoin}>Join</button>
    </div>
  );
}
