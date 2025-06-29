
// src/ChatRoom.js
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { database } from "./firebase";
import {
  ref,
  push,
  onValue,
  remove,
  set,
  onDisconnect,
  off,
  serverTimestamp,
  get,
} from "firebase/database";
import { v4 as uuidv4 } from "uuid";

export default function ChatRoom({ roomCode, username }) {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [otherUser, setOtherUser] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [lastSeen, setLastSeen] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const messagesEndRef = useRef(null);
  const userId = useRef(uuidv4());
  const db = database;
  const navigate = useNavigate();

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // User join logic
  useEffect(() => {
    const userRef = ref(db, `rooms/${roomCode}/users/${userId.current}`);
    const allUsersRef = ref(db, `rooms/${roomCode}/users`);
    const typingRef = ref(db, `rooms/${roomCode}/typing/${userId.current}`);
    const onlineRef = ref(db, `rooms/${roomCode}/online/${userId.current}`);
    const lastSeenRef = ref(db, `rooms/${roomCode}/lastSeen/${userId.current}`);
    const joinedRef = ref(db, `rooms/${roomCode}/joined/${userId.current}`);
    const msgRef = ref(db, `rooms/${roomCode}/messages`);

    set(userRef, { name: username });
    set(onlineRef, true);
    set(lastSeenRef, Date.now());

    // Prevent duplicate "joined" messages
    get(joinedRef).then((snapshot) => {
      if (!snapshot.exists()) {
        push(msgRef, {
          text: `${username} joined the chat`,
          timestamp: Date.now(),
          senderId: "system",
          senderName: "System",
          isSystem: true,
        });
        set(joinedRef, true);
      }
    });

    const disconnectMsgRef = push(msgRef); // for user leave
    onDisconnect(disconnectMsgRef).set({
      text: `${username} left the chat`,
      timestamp: serverTimestamp(),
      senderId: "system",
      senderName: "System",
      isSystem: true,
    });

    // onDisconnect actions
    onDisconnect(userRef).remove();
    onDisconnect(typingRef).remove();
    onDisconnect(onlineRef).remove();
    onDisconnect(lastSeenRef).set(Date.now());

    // Track other user
    const unsubscribeUsers = onValue(allUsersRef, (snapshot) => {
      const users = snapshot.val() || {};
      const otherEntries = Object.entries(users).filter(
        ([key]) => key !== userId.current
      );
      if (otherEntries.length > 0) {
        setOtherUser(otherEntries[0][1].name);
      } else {
        setOtherUser("No one yet 😴");
      }
    });

    return () => {
      remove(userRef);
      remove(typingRef);
      remove(onlineRef);
      off(allUsersRef);
    };
  }, [roomCode, username, db]);

  // Message listener
  useEffect(() => {
    const messagesRef = ref(db, `rooms/${roomCode}/messages`);
    const unsubscribeMessages = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val() || {};
      const msgList = Object.entries(data)
        .map(([key, value]) => ({ id: key, ...value }))
        .sort((a, b) => a.timestamp - b.timestamp);
      setMessages(msgList);
    });

    return () => off(messagesRef);
  }, [roomCode, db]);

  // Typing indicator
  useEffect(() => {
    const typingRef = ref(db, `rooms/${roomCode}/typing`);
    return onValue(typingRef, (snapshot) => {
      const typingData = snapshot.val() || {};
      setIsTyping(
        Object.entries(typingData).some(
          ([key, value]) => key !== userId.current && value === true
        )
      );
    });
  }, [roomCode, db]);

  // Online + last seen tracker
  useEffect(() => {
    const onlineUsersRef = ref(db, `rooms/${roomCode}/online`);
    const lastSeenRef = ref(db, `rooms/${roomCode}/lastSeen`);

    onValue(onlineUsersRef, (snapshot) => {
      const data = snapshot.val() || {};
      const otherOnline = Object.keys(data).find(
        (key) => key !== userId.current
      );
      setIsOnline(!!otherOnline);
    });

    onValue(lastSeenRef, (snapshot) => {
      const data = snapshot.val() || {};
      const otherLastSeen = Object.entries(data).find(
        ([key]) => key !== userId.current
      );
      if (otherLastSeen)
        setLastSeen(new Date(otherLastSeen[1]).toLocaleTimeString());
    });
  }, [roomCode]);

  // Send message
  const handleSend = () => {
    if (!message.trim()) return;

    const msgRef = ref(db, `rooms/${roomCode}/messages`);
    push(msgRef, {
      text: message,
      timestamp: Date.now(),
      senderId: userId.current,
      senderName: username,
    });

    set(ref(db, `rooms/${roomCode}/typing/${userId.current}`), false);
    setMessage("");
  };

  // Clear messages
  const handleClearChat = () => {
    if (window.confirm("Are you sure you want to clear the chat?")) {
      const msgRef = ref(db, `rooms/${roomCode}/messages`);
      remove(msgRef);
    }
  };

  // Leave room
  const handleExitRoom = () => {
    if (window.confirm("Do you want to exit the room?")) {
      navigate("/");
    }
  };

  return (
    <div style={styles.chatContainer}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>
            💬 Chatting with:{" "}
            <span style={{ color: "#fff" }}>{otherUser}</span>
          </h2>
          <div style={{ fontSize: "0.8rem", color: "#fff" }}>
            {isOnline ? "🟢 Online" : `Last seen: ${lastSeen || "Unknown"}`}
          </div>
        </div>
        <div style={{ display: "flex", gap: "5px" }}>
          <button
            style={styles.clearButton}
            onClick={handleClearChat}
            title="Clear Chat"
          >
            🧹
          </button>
          <button
            style={styles.exitButton}
            onClick={handleExitRoom}
            title="Exit Room"
          >
            🚪
          </button>
        </div>
      </div>

      <div style={styles.messages}>
        {messages.map((msg) => {
          const isOwn = msg.senderId === userId.current;

          if (msg.isSystem) {
            return (
              <div
                key={msg.id}
                style={{
                  textAlign: "center",
                  color: "#aaa",
                  fontSize: "0.8rem",
                  fontStyle: "italic",
                  margin: "5px 0",
                }}
              >
                {msg.text}
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              style={{
                display: "flex",
                flexDirection: isOwn ? "row-reverse" : "row",
                alignItems: "flex-start",
                gap: "6px",
              }}
            >
              <div style={{ fontSize: "1.3rem", marginTop: "2px" }}>
                {isOwn ? "🧑" : "👤"}
              </div>
              <div
                style={{
                  ...styles.message,
                  alignSelf: isOwn ? "flex-end" : "flex-start",
                  backgroundColor: isOwn ? "#d1f7c4" : "#f1f0f0",
                }}
              >
                {!isOwn && (
                  <div style={styles.senderName}>{msg.senderName}</div>
                )}
                {msg.text}
                <div style={styles.timestamp}>
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          );
        })}
        {isTyping && (
          <div
            style={{ fontStyle: "italic", fontSize: "0.85rem", marginLeft: 10 }}
          >
            Typing...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div style={styles.inputContainer}>
        <input
          style={styles.input}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            const typingRef = ref(
              db,
              `rooms/${roomCode}/typing/${userId.current}`
            );
            set(typingRef, true);
            setTimeout(() => set(typingRef, false), 3000);
          }}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Type your message..."
        />
        <button
          style={{
            ...styles.sendButton,
            opacity: message.trim() ? 1 : 0.5,
            cursor: message.trim() ? "pointer" : "not-allowed",
          }}
          onClick={handleSend}
          disabled={!message.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}

const styles = {
  chatContainer: {
    height: "100vh",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    background: "black",
    fontFamily: "Segoe UI, sans-serif",
    margin: 0,
    padding: 0,
  },
  header: {
    padding: "10px 15px",
    backgroundColor: "rgba(25, 25, 25, 0.9)",
    color: "#fff",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "1rem",
  },
  title: {
    margin: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "100%",
  },
  clearButton: {
    background: "none",
    border: "none",
    color: "#fff",
    fontSize: "1rem",
    cursor: "pointer",
  },
  exitButton: {
    background: "none",
    border: "none",
    color: "#fff",
    fontSize: "1.1rem",
    cursor: "pointer",
    marginLeft: "10px",
  },
  messages: {
    flex: 1,
    padding: "8px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    borderRadius: "30px",
    gap: "8px",
  },
  message: {
    maxWidth: "100%",
    padding: "8px 12px",
    borderRadius: "10px",
    fontSize: "0.9rem",
    wordBreak: "break-word",
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
  },
  senderName: {
    fontWeight: "bold",
    fontSize: "0.75rem",
    marginBottom: "2px",
    color: "#444",
  },
  timestamp: {
    fontSize: "0.7rem",
    color: "#999",
    marginTop: "4px",
    textAlign: "right",
  },
  inputContainer: {
    display: "flex",
    padding: "8px",
    borderTop: "1px solid #ccc",
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    padding: "8px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    fontSize: "0.95rem",
  },
  sendButton: {
    marginLeft: "8px",
    padding: "8px 16px",
    backgroundColor: "black",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    fontWeight: "bold",
  },
};
