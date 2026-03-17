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

        socket.data = {
          userId,
          userName,
          roomId
        };

        console.log(`${userName} joined room ${roomId}`);

        // Save candidate if missing
        try {

          const interview = await Interview.findOne({ roomId });

          if (
            interview &&
            !interview.candidate &&
            userId !== interview.interviewer?.toString()
          ) {
            interview.candidate = userId;
            await interview.save();
          }

        } catch {}

        const clients = await io.in(roomId).fetchSockets();

        const users = clients.map(s => ({
          socketId: s.id,
          userId: s.data?.userId,
          userName: s.data?.userName
        }));

        io.to(roomId).emit("room-joined", { users });

        // START CALL when 2 users present
        if (users.length === 2) {

          // choose the other socket to start the offer
          const offerCreator = clients.find(s => s.id !== socket.id);

          if (offerCreator) {
            io.to(offerCreator.id).emit("start-call");
          }

        }

      } catch (err) {

        console.error("Join room error:", err);

      }

    });


    // ==============================
    // CODE COLLABORATION
    // ==============================
    socket.on("code-change", ({ roomId, code }) => {

      socket.to(roomId).emit("receive-code", {
        code,
        from: socket.data?.userId
      });

    });


    // ==============================
    // CURSOR UPDATE
    // ==============================
    socket.on("cursor-update", ({ roomId, cursor }) => {

      socket.to(roomId).emit("cursor-update", {
        socketId: socket.id,
        userId: socket.data?.userId,
        cursor
      });

    });


    // ==============================
    // TYPING
    // ==============================
    socket.on("typing", ({ roomId, typing }) => {

      socket.to(roomId).emit("typing", {
        socketId: socket.id,
        userId: socket.data?.userId,
        typing
      });

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
          message
        };

        try {
          await Chat.create(chatObj);
        } catch {}

        io.to(roomId).emit("chat-message", {
          ...chatObj,
          createdAt: new Date()
        });

      } catch (err) {

        console.error("Chat error:", err);

      }

    });


    // ==============================
    // LANGUAGE CHANGE
    // ==============================
    socket.on("language-change", ({ roomId, language }) => {

      socket.to(roomId).emit("language-change", { language });

    });


    // ==============================
    // WEBRTC OFFER
    // ==============================
    socket.on("offer", ({ roomId, offer }) => {

      console.log("Forwarding offer");

      socket.to(roomId).emit("offer", { offer });

    });


    // ==============================
    // WEBRTC ANSWER
    // ==============================
    socket.on("answer", ({ roomId, answer }) => {

      console.log("Forwarding answer");

      socket.to(roomId).emit("answer", { answer });

    });


    // ==============================
    // ICE CANDIDATE
    // ==============================
    socket.on("ice-candidate", ({ roomId, candidate }) => {

      socket.to(roomId).emit("ice-candidate", { candidate });

    });


    // ==============================
    // END INTERVIEW
    // ==============================
    socket.on("end-interview", async ({ roomId }) => {

      console.log("end-interview received for room:", roomId);

      // Always notify all participants — DB update is best-effort
      io.to(roomId).emit("interview-ended", {
        message: "Interview ended"
      });

      // Update DB in background (don't block the emit above)
      try {
        await Interview.findOneAndUpdate(
          { roomId },
          { status: "completed", endTime: new Date() }
        );
      } catch (err) {
        console.error("DB update error on end-interview (non-fatal):", err);
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

        const users = clients.map(s => ({
          socketId: s.id,
          userId: s.data?.userId,
          userName: s.data?.userName
        }));

        io.to(roomId).emit("user-left", {
          socketId: socket.id,
          users
        });

      } catch (err) {

        console.error("Disconnect error:", err);

      }

    });

  });

};