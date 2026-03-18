import Interview from "../models/Interview.js";
import Chat from "../models/Chat.js";

export const initializeSocketHandlers = (io) => {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // ==============================
    // JOIN ROOM
    // ==============================
    socket.on("join-room", async ({ roomId, userId, userName }) => {
      try {
        if (!roomId) return;

        const room = io.sockets.adapter.rooms.get(roomId);

        // limit to 2 participants
        if (room && room.size >= 2) {
          socket.emit("room-full");
          return;
        }

        socket.join(roomId);

        // ✅ FIX: ensure default values
        socket.data = {
          userId: userId || socket.id,
          userName: userName || "Guest",
          roomId,
        };

        console.log(`${socket.data.userName} joined room ${roomId}`);

        // Save candidate if missing
        try {
          const interview = await Interview.findOne({ roomId });

          if (
            interview &&
            !interview.candidate &&
            socket.data.userId !== interview.interviewer?.toString()
          ) {
            interview.candidate = socket.data.userId;
            await interview.save();
          }
        } catch {}

        // get all users in room
        const clients = await io.in(roomId).fetchSockets();

        const users = clients.map((s) => ({
          socketId: s.id,
          userId: s.data?.userId,
          userName: s.data?.userName,
        }));

        // ✅ SEND USERS LIST
        io.to(roomId).emit("room-joined", { users });

        // ==============================
        // START CALL
        // ==============================
        if (users.length === 2) {
          console.log("🔥 2 users joined → starting call");

          const offerCreator = clients[0]; // simpler + reliable
          if (offerCreator) {
            io.to(offerCreator.id).emit("start-call");
          }
        }
      } catch (err) {
        console.error("Join room error:", err);
      }
    });

    // ==============================
    // OFFER
    // ==============================
    socket.on("offer", ({ roomId, offer }) => {
      socket.to(roomId).emit("offer", { offer });
    });

    // ==============================
    // ANSWER
    // ==============================
    socket.on("answer", ({ roomId, answer }) => {
      socket.to(roomId).emit("answer", { answer });
    });

    // ==============================
    // ICE
    // ==============================
    socket.on("ice-candidate", ({ roomId, candidate }) => {
      socket.to(roomId).emit("ice-candidate", { candidate });
    });

    // ==============================
    // CHAT
    // ==============================
    socket.on("chat-message", async ({ roomId, message }) => {
      try {
        const chatObj = {
          roomId,
          sender: socket.data?.userId,
          senderName: socket.data?.userName,
          message,
        };

        try {
          await Chat.create(chatObj);
        } catch {}

        io.to(roomId).emit("chat-message", {
          ...chatObj,
          createdAt: new Date(),
        });
      } catch (err) {
        console.error("Chat error:", err);
      }
    });

    // ==============================
    // DISCONNECT
    // ==============================
    socket.on("disconnect", async () => {
      console.log("User disconnected:", socket.id);

      const roomId = socket.data?.roomId;
      if (!roomId) return;

      try {
        const clients = await io.in(roomId).fetchSockets();

        const users = clients.map((s) => ({
          socketId: s.id,
          userId: s.data?.userId,
          userName: s.data?.userName,
        }));

        io.to(roomId).emit("user-left", {
          socketId: socket.id,
          users,
        });
      } catch (err) {
        console.error("Disconnect error:", err);
      }
    });
  });
};