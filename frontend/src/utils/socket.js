import { io } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

const socket = io(SOCKET_URL, {
  // Start with polling so Render's proxy can establish the connection,
  // then upgrade to WebSocket automatically
  transports: ["polling", "websocket"],
  upgrade: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 30000,         // longer timeout for Render cold-start
  autoConnect: false,     // connect manually from InterviewRoom
  withCredentials: true,  // required for CORS with credentials
});

socket.on("connect", () => {
  console.log("✅ Socket connected:", socket.id);
});

socket.on("disconnect", (reason) => {
  console.log("❌ Socket disconnected:", reason);
});

socket.on("connect_error", (err) => {
  console.error("🔌 Socket connection error:", err.message);
});

export default socket;