// src/ChatRoom.js
import React, { useEffect, useRef, useState, useMemo } from "react";
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
  update,
  query,
  limitToLast,
} from "firebase/database";
import { v4 as uuidv4 } from "uuid";

// 🔹 extra (file/image sharing)
import { getStorage, ref as sRef, uploadBytes, getDownloadURL } from "firebase/storage";
// 🔹 extra (emoji picker)
import Picker from "emoji-picker-react"; // npm i emoji-picker-react

export default function ChatRoom({ roomCode, username }) {
  // ────────────────────────────────
  // STATE
  // ────────────────────────────────
  const [activeRoom, setActiveRoom] = useState(roomCode); // 🔥 Rooms List (Lobby) support
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [otherUser, setOtherUser] = useState("");
  const [typingMap, setTypingMap] = useState({}); // 👈 per-user typing
  const [lastSeen, setLastSeen] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [dark, setDark] = useState(true); // 🌙/☀️ toggle
  const [showEmoji, setShowEmoji] = useState(false);
  const [showLobby, setShowLobby] = useState(false); // 🏠 Rooms drawer
  const [rooms, setRooms] = useState([]);
  const [isAtBottom, setIsAtBottom] = useState(true); // ⬇ auto-scroll button
  const [unseenNew, setUnseenNew] = useState(0);
  const [uploading, setUploading] = useState(false);

  const messagesEndRef = useRef(null);
  const messagesBoxRef = useRef(null);
  const userId = useRef(uuidv4());
  const navigate = useNavigate();
  const storage = getStorage(); // uses default app config

  const db = database;

  // theme colors
  const theme = useMemo(
    () => ({
      bg: dark ? "#000" : "#fff",
      card: dark ? "#121212" : "#f5f5f5",
      text: dark ? "#fff" : "#111",
      sub: dark ? "#aaa" : "#555",
      bubbleMe: dark ? "#1e90ff" : "#d1f7c4",
      bubbleOther: dark ? "#1f1f1f" : "#f1f0f0",
      border: dark ? "#2a2a2a" : "#ddd",
      btn: dark ? "#222" : "#000",
      btnText: "#fff",
    }),
    [dark]
  );

  // ────────────────────────────────
  // SCROLL/ AUTO-SCROLL
  // ────────────────────────────────
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setUnseenNew(0);
  };

  useEffect(() => {
    if (isAtBottom) scrollToBottom();
    else setUnseenNew((n) => n + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  useEffect(() => {
    const el = messagesBoxRef.current;
    if (!el) return;
    const onScroll = () => {
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 20;
      setIsAtBottom(nearBottom);
      if (nearBottom) setUnseenNew(0);
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // ────────────────────────────────
  // NOTIFICATIONS 🔔
  // ────────────────────────────────
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  const notify = (title, body) => {
    if (!("Notification" in window)) return;
    if (document.hasFocus()) return; // only when tab not focused
    if (Notification.permission === "granted") {
      new Notification(title, { body });
    }
  };

  // ────────────────────────────────
  // AUTO SCROLL WHEN MESSAGES CHANGE
  // ────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ────────────────────────────────
  // PRESENCE + JOIN/LEAVE + USERS
  // ────────────────────────────────
  useEffect(() => {
    if (!db || !activeRoom) return;

    const userRef = ref(db, `rooms/${activeRoom}/users/${userId.current}`);
    const allUsersRef = ref(db, `rooms/${activeRoom}/users`);
    const typingRef = ref(db, `rooms/${activeRoom}/typing/${userId.current}`);
    const onlineRef = ref(db, `rooms/${activeRoom}/online/${userId.current}`);
    const lastSeenRef = ref(db, `rooms/${activeRoom}/lastSeen/${userId.current}`);
    const joinedRef = ref(db, `rooms/${activeRoom}/joined/${userId.current}`);
    const msgRef = ref(db, `rooms/${activeRoom}/messages`);

    // Add user + presence
    set(userRef, { name: username });
    set(onlineRef, true);
    set(lastSeenRef, Date.now());

    // Single-time joined message
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

    // Leave message on disconnect
    const disconnectMsgRef = push(msgRef);
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

    // Track other user name
    const unsubUsers = onValue(allUsersRef, (snapshot) => {
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
  }, [activeRoom, username, db]);

  // ────────────────────────────────
  // MESSAGES + SEEN/DELIVERED TICKS
  // ────────────────────────────────
  useEffect(() => {
    if (!db || !activeRoom) return;

    const messagesRef = query(ref(db, `rooms/${activeRoom}/messages`), limitToLast(200));
    const unsub = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val() || {};
      const msgList = Object.entries(data)
        .map(([key, value]) => ({ id: key, ...value }))
        .sort((a, b) => a.timestamp - b.timestamp);

      // push notification for others' new message
      const last = msgList[msgList.length - 1];
      if (last && last.senderId && last.senderId !== userId.current && !last.isSystem) {
        notify(last.senderName || "New message", last.text || "Sent a file");
      }

      setMessages(msgList);
    });

    return () => off(messagesRef);
  }, [activeRoom, db]);

  // Mark messages as seen by me
  useEffect(() => {
    if (!db || !activeRoom) return;
    const updates = {};
    messages.forEach((m) => {
      if (m.isSystem) return;
      if (!m.seenBy || !m.seenBy[userId.current]) {
        updates[`rooms/${activeRoom}/messages/${m.id}/seenBy/${userId.current}`] = true;
      }
      // delivered tick is implicit as soon as it exists in DB
    });
    if (Object.keys(updates).length) {
      update(ref(db), updates);
    }
  }, [messages, activeRoom, db]);

  // ────────────────────────────────
  // TYPING (PER-USER NAMES)
  // ────────────────────────────────
  useEffect(() => {
    if (!db || !activeRoom) return;
    const typingRef = ref(db, `rooms/${activeRoom}/typing`);
    return onValue(typingRef, (snapshot) => {
      const data = snapshot.val() || {};
      // remove myself
      const others = Object.fromEntries(
        Object.entries(data).filter(([k]) => k !== userId.current)
      );
      setTypingMap(others); // values are names
    });
  }, [activeRoom, db]);

  // ────────────────────────────────
  // ROOMS LIST (LOBBY)
  // ────────────────────────────────
  useEffect(() => {
    if (!db) return;
    const roomsRef = ref(db, "rooms");
    const unsub = onValue(roomsRef, (snap) => {
      const data = snap.val() || {};
      const list = Object.keys(data).map((code) => {
        const users = Object.keys(data[code]?.users || {}).length;
        const lastMsgTs = (() => {
          const msgs = data[code]?.messages || {};
          const arr = Object.values(msgs);
          if (!arr.length) return 0;
          return arr.reduce((mx, m) => Math.max(mx, m.timestamp || 0), 0);
        })();
        return { code, users, lastMsgTs };
      });
      list.sort((a, b) => (b.lastMsgTs || 0) - (a.lastMsgTs || 0));
      setRooms(list.slice(0, 30));
    });
    return () => off(roomsRef);
  }, [db]);

  // ────────────────────────────────
  // SEND MESSAGE
  // ────────────────────────────────
  const handleSend = () => {
    if (!message.trim() || !db || !activeRoom) return;
    const msgRef = ref(db, `rooms/${activeRoom}/messages`);
    push(msgRef, {
      text: message,
      timestamp: Date.now(),
      senderId: userId.current,
      senderName: username,
      seenBy: { [userId.current]: true }, // me seen at send time
      reactions: {}, // base
    });
    set(ref(db, `rooms/${activeRoom}/typing/${userId.current}`), null);
    setMessage("");
  };

  // message reactions (❤️ 👍 😂 etc.)
  const reactToMessage = (msgId, emoji) => {
    if (!db || !activeRoom) return;
    const path = `rooms/${activeRoom}/messages/${msgId}/reactions/${emoji}/${userId.current}`;
    set(ref(db, path), true);
  };

  // delete my message (optional utility)
  const deleteMessage = (msgId, senderId) => {
    if (senderId !== userId.current) return; // allow self-delete only
    if (!db || !activeRoom) return;
    remove(ref(db, `rooms/${activeRoom}/messages/${msgId}`));
  };

  // FILE / IMAGE SHARING
  const onPickFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const path = `rooms/${activeRoom}/${Date.now()}_${file.name}`;
      const fRef = sRef(storage, path);
      await uploadBytes(fRef, file);
      const url = await getDownloadURL(fRef);
      const msgRef = ref(db, `rooms/${activeRoom}/messages`);
      push(msgRef, {
        text: url, // will render as image/file
        fileName: file.name,
        fileType: file.type,
        timestamp: Date.now(),
        senderId: userId.current,
        senderName: username,
        seenBy: { [userId.current]: true },
      });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  // leave room
  const handleExitRoom = () => {
    if (window.confirm("Do you want to exit the room?")) {
      navigate("/");
    }
  };

  // Clear chat
  const handleClearChat = () => {
    if (!db || !activeRoom) return;
    if (window.confirm("Are you sure you want to clear the chat?")) {
      const msgRef = ref(db, `rooms/${activeRoom}/messages`);
      remove(msgRef);
    }
  };

  // Typing event from input
  const onTyping = (val) => {
    setMessage(val);
    if (!db || !activeRoom) return;
    const meTypingRef = ref(db, `rooms/${activeRoom}/typing/${userId.current}`);
    // store my name for per-user indicator
    set(meTypingRef, username);
    // stop typing after 2s of inactivity
    clearTimeout(onTyping._t);
    onTyping._t = setTimeout(() => set(meTypingRef, null), 2000);
  };

  // Small helpers
  const timeHHMM = (ts) =>
    new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const otherTypingNames = Object.values(typingMap);
  const isTyping = otherTypingNames.length > 0;

  // Derived UI: delivered/seen ticks
  const ticks = (msg) => {
    // delivered: message exists in DB (always ✅)
    // seen: any other user added to seenBy
    const seenCount = Object.keys(msg.seenBy || {}).length;
    const seenByOthers = seenCount > 1; // 2 users room -> seen if >=2
    // single grey tick + second grey tick; blue when seen
    const color = seenByOthers ? "#1DA1F2" : theme.sub;
    return (
      <span title={seenByOthers ? "Seen" : "Delivered"} style={{ color }}>
        ✅✅
      </span>
    );
  };

  // Avatar from name initial
  const Avatar = ({ name, self }) => (
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: "50%",
        background: self ? "#8B5CF6" : "#F59E0B",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 14,
        fontWeight: 700,
        flex: "0 0 28px",
        marginTop: 2,
      }}
      title={name}
    >
      {(name || "?")[0]?.toUpperCase()}
    </div>
  );

  // Render message bubble
  const MessageBubble = ({ msg }) => {
    const self = msg.senderId === userId.current;
    const isImage = (msg.fileType || "").startsWith("image/") || /\.(png|jpe?g|gif|webp)$/i.test(msg.text || "");
    const isVideo = (msg.fileType || "").startsWith("video/") || /\.(mp4|webm|ogg)$/i.test(msg.text || "");
    return (
      <div
        style={{
          display: "flex",
          flexDirection: self ? "row-reverse" : "row",
          alignItems: "flex-start",
          gap: 8,
        }}
      >
        <Avatar name={self ? username : msg.senderName} self={self} />
        <div
          style={{
            maxWidth: "75%",
            padding: "8px 12px",
            borderRadius: 10,
            background: self ? theme.bubbleMe : theme.bubbleOther,
            color: self ? "#fff" : theme.text,
            boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
            position: "relative",
          }}
        >
          {!self && (
            <div style={{ fontWeight: "bold", fontSize: 12, marginBottom: 4, color: self ? "#e6f7ff" : "#444" }}>
              {msg.senderName}
            </div>
          )}

          {isImage ? (
            <a href={msg.text} target="_blank" rel="noreferrer">
              <img src={msg.text} alt={msg.fileName || "image"} style={{ maxWidth: "100%", borderRadius: 8 }} />
            </a>
          ) : isVideo ? (
            <video src={msg.text} controls style={{ maxWidth: 240, borderRadius: 8 }} />
          ) : (
            <div>{msg.text}</div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
            <small style={{ color: self ? "#e8f2ff" : theme.sub }}>{timeHHMM(msg.timestamp)}</small>
            {!msg.isSystem && self && <span>{ticks(msg)}</span>}
          </div>

          {/* Reactions row */}
          {msg.reactions && (
            <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
              {Object.entries(msg.reactions).map(([emoji, users]) => (
                <span
                  key={emoji}
                  style={{
                    fontSize: 14,
                    padding: "2px 6px",
                    borderRadius: 12,
                    background: self ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.07)",
                    cursor: "pointer",
                  }}
                  title={`${Object.keys(users).length} reacted`}
                  onClick={() => reactToMessage(msg.id, emoji)}
                >
                  {emoji} {Object.keys(users).length}
                </span>
              ))}
            </div>
          )}

          {/* Reaction hover bar */}
          <div style={{ position: "absolute", right: self ? "auto" : -4, left: self ? -4 : "auto", top: -24, display: "flex", gap: 6, opacity: 0.9 }}>
            {["❤️", "👍", "😂", "🔥", "😮"].map((e) => (
              <button
                key={e}
                onClick={() => reactToMessage(msg.id, e)}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 18,
                }}
                title="React"
              >
                {e}
              </button>
            ))}
            {self && (
              <button
                onClick={() => deleteMessage(msg.id, msg.senderId)}
                title="Delete"
                style={{ border: "none", background: "transparent", cursor: "pointer" }}
              >
                🗑️
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ ...styles.chatContainer, background: theme.bg, color: theme.text }}>
      {/* Header */}
      <div style={{ ...styles.header, backgroundColor: theme.card, borderBottom: `1px solid ${theme.border}` }}>
        <div>
          <h2 style={styles.title}>
            💬 Room: <span style={{ color: "#fff" }}>{activeRoom}</span>
          </h2>
          <div style={{ fontSize: "0.8rem", color: "#fff" }}>
            {isOnline ? "🟢 Online" : `Last seen: ${lastSeen || "Unknown"}`}
          </div>
          {/* Per-user typing */}
          {otherTypingNames.length > 0 && (
            <div style={{ fontSize: 12, color: theme.sub, marginTop: 4 }}>
              {otherTypingNames.join(", ")} is typing…
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={() => setDark((d) => !d)}
            style={{ ...styles.iconBtn, color: "#fff" }}
            title="Toggle Dark/Light"
          >
            {dark ? "🌙" : "☀️"}
          </button>
          <button
            onClick={() => setShowLobby(true)}
            style={{ ...styles.iconBtn, color: "#fff" }}
            title="Rooms"
          >
            🏠
          </button>
          <button style={{ ...styles.clearButton, color: "#fff" }} onClick={handleClearChat} title="Clear Chat">
            🧹
          </button>
          <button style={{ ...styles.exitButton, color: "#fff" }} onClick={handleExitRoom} title="Exit Room">
            🚪
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={messagesBoxRef} style={{ ...styles.messages }}>
        {messages.map((msg) => {
          if (msg.isSystem) {
            return (
              <div
                key={msg.id}
                style={{ textAlign: "center", color: theme.sub, fontSize: "0.8rem", fontStyle: "italic", margin: "5px 0" }}
              >
                {msg.text}
              </div>
            );
          }
          return <MessageBubble key={msg.id} msg={msg} />;
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* New messages bubble */}
      {!isAtBottom && unseenNew > 0 && (
        <button
          onClick={scrollToBottom}
          style={{
            position: "absolute",
            right: 16,
            bottom: 90,
            padding: "6px 12px",
            borderRadius: 20,
            background: theme.card,
            color: theme.text,
            border: `1px solid ${theme.border}`,
            cursor: "pointer",
          }}
        >
          ⬇ New messages ({unseenNew})
        </button>
      )}

      {/* Input */}
      <div style={{ ...styles.inputContainer, borderTop: `1px solid ${theme.border}`, backgroundColor: dark ? "#0b0b0b" : "#fff" }}>
        <button
          onClick={() => setShowEmoji((s) => !s)}
          style={{ ...styles.iconBtn, background: "transparent", color: theme.text }}
          title="Emoji / GIF"
        >
          😊
        </button>

        {showEmoji && (
          <div style={{ position: "absolute", bottom: 70, left: 10, zIndex: 50 }}>
            <Picker onEmojiClick={(e) => setMessage((prev) => prev + e.emoji)} />
          </div>
        )}

        <input
          style={{ ...styles.input, color: theme.text, background: dark ? "#111" : "#fff", border: `1px solid ${theme.border}` }}
          value={message}
          onChange={(e) => onTyping(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Type your message..."
        />

        <label style={{ ...styles.iconBtn, cursor: "pointer" }} title="Attach file">
          📎
          <input type="file" onChange={onPickFile} style={{ display: "none" }} accept="image/*,video/*,.pdf,.doc,.docx,.zip" />
        </label>

        <button
          style={{
            ...styles.sendButton,
            backgroundColor: theme.btn,
            color: theme.btnText,
            opacity: message.trim() ? 1 : 0.5,
            cursor: message.trim() ? "pointer" : "not-allowed",
          }}
          onClick={handleSend}
          disabled={!message.trim() || uploading}
        >
          {uploading ? "Uploading…" : "Send"}
        </button>
      </div>

      {/* Rooms Lobby Drawer */}
      {showLobby && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "stretch",
            justifyContent: "flex-end",
            zIndex: 60,
          }}
          onClick={() => setShowLobby(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 360,
              height: "100%",
              background: theme.card,
              color: theme.text,
              padding: 12,
              borderLeft: `1px solid ${theme.border}`,
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>Rooms Lobby</h3>
              <button onClick={() => setShowLobby(false)} style={{ ...styles.iconBtn }}>
                ✖
              </button>
            </div>

            <div style={{ marginTop: 10 }}>
              <CreateJoinRoom
                onCreate={(code) => setActiveRoom(code)}
                onJoin={(code) => setActiveRoom(code)}
                theme={theme}
                db={db}
                username={username}
              />
            </div>

            <div style={{ marginTop: 16, fontSize: 12, color: theme.sub }}>Active rooms</div>
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
              {rooms.map((r) => (
                <button
                  key={r.code}
                  onClick={() => {
                    setActiveRoom(r.code);
                    setShowLobby(false);
                  }}
                  style={{
                    textAlign: "left",
                    padding: 10,
                    borderRadius: 10,
                    background: activeRoom === r.code ? theme.bubbleOther : "transparent",
                    color: theme.text,
                    border: `1px solid ${theme.border}`,
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{r.code}</div>
                  <div style={{ fontSize: 12, color: theme.sub }}>{r.users} user(s)</div>
                </button>
              ))}
              {rooms.length === 0 && <div style={{ color: theme.sub }}>No rooms yet. Create one!</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────
// SMALL ROOM CREATION/JOIN WIDGET (same file)
// ────────────────────────────────
function CreateJoinRoom({ onCreate, onJoin, theme, db, username }) {
  const [code, setCode] = useState("");

  const createRoom = () => {
    const newCode = `room-${Math.random().toString(36).slice(2, 7)}`;
    // pre-create node for visibility in lobby
    set(ref(db, `rooms/${newCode}`), {
      meta: { createdAt: Date.now(), creator: username || "user" },
    });
    onCreate(newCode);
  };

  const joinRoom = () => {
    if (!code.trim()) return;
    onJoin(code.trim());
  };

  return (
    <div style={{ display: "flex", gap: 6 }}>
      <button onClick={createRoom} style={{ padding: "8px 10px", borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.bubbleOther }}>
        ➕ Create
      </button>
      <input
        placeholder="Enter room code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        style={{ flex: 1, padding: 8, borderRadius: 8, border: `1px solid ${theme.border}`, background: "transparent", color: theme.text }}
      />
      <button onClick={joinRoom} style={{ padding: "8px 10px", borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.bubbleOther }}>
        🔑 Join
      </button>
    </div>
  );
}

const styles = {
  chatContainer: {
    height: "100vh",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    fontFamily: "Segoe UI, sans-serif",
    margin: 0,
    padding: 0,
    position: "relative",
  },
  header: {
    padding: "10px 15px",
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
    fontSize: "1rem",
    cursor: "pointer",
  },
  exitButton: {
    background: "none",
    border: "none",
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
    gap: "10px",
  },
  inputContainer: {
    display: "flex",
    gap: 8,
    padding: "8px",
    alignItems: "center",
  },
  input: {
    flex: 1,
    padding: "8px",
    borderRadius: "6px",
    fontSize: "0.95rem",
    outline: "none",
  },
  sendButton: {
    padding: "8px 16px",
    border: "none",
    borderRadius: "6px",
    fontWeight: "bold",
  },
  iconBtn: {
    background: "none",
    border: "none",
    fontSize: 18,
    cursor: "pointer",
  },
};
