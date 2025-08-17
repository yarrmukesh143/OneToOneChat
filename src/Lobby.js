// src/Lobby.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { database } from "./firebase";
import { ref, onValue, remove } from "firebase/database";

export default function Lobby() {
  const [rooms, setRooms] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const roomsRef = ref(database, "rooms");
    const unsubscribe = onValue(roomsRef, (snapshot) => {
      setRooms(snapshot.val() || {});
    });
    return () => unsubscribe();
  }, []);

  // ✅ Room join
  const handleJoin = (roomCode) => {
    navigate(`/room/${roomCode}`);
  };

  // ✅ Room delete
  const handleDelete = (roomCode) => {
    if (window.confirm("Are you sure you want to delete this room?")) {
      const roomRef = ref(database, `rooms/${roomCode}`);
      remove(roomRef);
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>🏠 Chat Lobby</h1>
      {Object.keys(rooms).length === 0 ? (
        <p style={styles.empty}>No rooms created yet 🚪</p>
      ) : (
        <div style={styles.roomList}>
          {Object.keys(rooms).map((roomCode) => (
            <div key={roomCode} style={styles.roomCard}>
              <div>
                <h3 style={styles.roomName}>Room: {roomCode}</h3>
                <p style={styles.roomInfo}>
                  Users:{" "}
                  {rooms[roomCode].users
                    ? Object.keys(rooms[roomCode].users).length
                    : 0}
                </p>
              </div>
              <div style={styles.actions}>
                <button
                  style={styles.joinButton}
                  onClick={() => handleJoin(roomCode)}
                >
                  Join
                </button>
                <button
                  style={styles.deleteButton}
                  onClick={() => handleDelete(roomCode)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    width: "100%",
    padding: "20px",
    background: "black",
    color: "white",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  title: {
    fontSize: "1.8rem",
    marginBottom: "20px",
  },
  empty: {
    color: "#bbb",
    fontSize: "1rem",
  },
  roomList: {
    display: "flex",
    flexDirection: "column",
    gap: "15px",
    width: "100%",
    maxWidth: "500px",
  },
  roomCard: {
    background: "#1e1e1e",
    borderRadius: "10px",
    padding: "15px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
  },
  roomName: {
    margin: 0,
    fontSize: "1.2rem",
    color: "#fff",
  },
  roomInfo: {
    margin: 0,
    fontSize: "0.9rem",
    color: "#aaa",
  },
  actions: {
    display: "flex",
    gap: "10px",
  },
  joinButton: {
    background: "limegreen",
    border: "none",
    padding: "8px 14px",
    borderRadius: "6px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  deleteButton: {
    background: "crimson",
    border: "none",
    padding: "8px 14px",
    borderRadius: "6px",
    fontWeight: "bold",
    cursor: "pointer",
  },
};
