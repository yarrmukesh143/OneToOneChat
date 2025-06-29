// src/App.js
import React, { useState } from "react";
import ChatRoom from "./ChatRoom";
import Header from "./Header";
import Footer from "./Footer";

export default function App() {
  const [roomCode, setRoomCode] = useState("");
  const [username, setUsername] = useState("");
  const [joined, setJoined] = useState(false);

  const handleJoin = () => {
    if (roomCode.trim() && username.trim()) {
      setJoined(true);
    } else {
      alert("Please enter both username and room code!");
    }
  };

  return (
    <div style={styles.wrapper}>
      <Header />

      <main style={styles.main}>
        {!joined ? (
          <div style={styles.joinContainer}>
            <h2 style={styles.heading}>🖤 Join Chat Room 🖤</h2>

            <input
              type="text"
              placeholder="Enter Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={styles.input}
            />

            <input
              type="text"
              placeholder="Enter Room Code"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              style={styles.input}
            />

            <button onClick={handleJoin} style={styles.button}>
              Join Now
            </button>

            <button
              onClick={() => alert("Feature coming soon!")}
              style={styles.secondaryButton}
            >
              + Create New Room
            </button>
          </div>
        ) : (
          <ChatRoom roomCode={roomCode} username={username} />
        )}
      </main>

      <Footer />
    </div>
  );
}



// ✅ Inline styles
const styles = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
    fontFamily: "Segoe UI, sans-serif",
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    backgroundSize: "800% 800%",
  
  },
  main: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "5px",
  },
  heading: {
    textAlign: "center",
    marginBottom: "20px",
    fontSize: "1.6rem",
    color: "#ffffff",
  },
  joinContainer: {
    maxWidth: "400px",
    width: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    padding: "30px 25px",
    borderRadius: "12px",
    boxShadow: "0 8px 20px rgba(0, 0, 0, 0.1)",
  },
  input: {
    width: "100%",
    padding: "12px",
    margin: "0 auto 15px auto",
    display: "block",
    borderRadius: "8px",
    border: "1px solid #ccc",
    fontSize: "1rem",
    boxSizing: "border-box",
  },
  button: {
    width: "100%",
    padding: "12px",
    backgroundColor: "#6c5ce7",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "1rem",
    fontWeight: "bold",
    cursor: "pointer",
    marginBottom: "10px",
  },
  secondaryButton: {
    width: "100%",
    padding: "12px",
    backgroundColor: "#fff",
    color: "#6c5ce7",
    border: "2px solid #6c5ce7",
    borderRadius: "8px",
    fontSize: "1rem",
    fontWeight: "bold",
    cursor: "pointer",
  },
};
