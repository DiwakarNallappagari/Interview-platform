import Interview from '../models/Interview.js'
import Chat from '../models/Chat.js'

export const initializeSocketHandlers = (io) => {

  io.on('connection', (socket) => {

    console.log('User connected:', socket.id)

    // ==============================
    // JOIN ROOM
    // ==============================
    socket.on('join-room', async ({ roomId, userId, userName }) => {

      try {

        const room = io.sockets.adapter.rooms.get(roomId)

        // Limit room to 5 users
        if (room && room.size >= 5) {
          socket.emit('room-full')
          return
        }

        socket.join(roomId)

        socket.data = { userId, userName, roomId }

        // Save candidate in DB
        const interview = await Interview.findOne({ roomId })

        if (
          interview &&
          !interview.candidate &&
          userId !== interview.interviewer.toString()
        ) {
          interview.candidate = userId
          await interview.save()
        }

        // Get all users currently in room
        const clients = await io.in(roomId).fetchSockets()

        const users = clients.map(s => ({
          socketId: s.id,
          userId: s.data?.userId,
          userName: s.data?.userName
        }))

        // Send existing users to new user
        socket.emit('existing-users', users)

        // Notify others
        socket.to(roomId).emit('user-joined', {
          socketId: socket.id,
          userId,
          userName
        })

      } catch (err) {
        console.error('Join room error:', err)
      }

    })


    // ==============================
    // CODE COLLABORATION
    // ==============================
    socket.on('code-change', ({ roomId, code }) => {

      socket.to(roomId).emit('receive-code', {
        code,
        from: socket.data?.userId
      })

    })


    // ==============================
    // CURSOR UPDATE
    // ==============================
    socket.on('cursor-update', ({ roomId, cursor }) => {

      socket.to(roomId).emit('cursor-update', {
        socketId: socket.id,
        userId: socket.data?.userId,
        cursor
      })

    })


    // ==============================
    // TYPING INDICATOR
    // ==============================
    socket.on('typing', ({ roomId, typing }) => {

      socket.to(roomId).emit('typing', {
        socketId: socket.id,
        userId: socket.data?.userId,
        typing
      })

    })


    // ==============================
    // CHAT MESSAGE
    // ==============================
    socket.on('chat-message', async ({ roomId, message }) => {

      try {

        const chatObj = {
          roomId,
          sender: socket.data?.userId,
          senderName: socket.data?.userName,
          message
        }

        try {
          await Chat.create(chatObj)
        } catch (e) {}

        io.to(roomId).emit('chat-message', {
          ...chatObj,
          createdAt: new Date()
        })

      } catch (err) {
        console.error('Chat message error:', err)
      }

    })


    // ==============================
    // LANGUAGE CHANGE
    // ==============================
    socket.on('language-change', ({ roomId, language }) => {

      socket.to(roomId).emit('language-change', { language })

    })


    // ==============================
    // WEBRTC OFFER
    // ==============================
    socket.on('offer', ({ roomId, offer }) => {

      socket.to(roomId).emit('offer', {
        offer,
        from: socket.id
      })

    })


    // ==============================
    // WEBRTC ANSWER
    // ==============================
    socket.on('answer', ({ roomId, answer }) => {

      socket.to(roomId).emit('answer', {
        answer,
        from: socket.id
      })

    })


    // ==============================
    // ICE CANDIDATE
    // ==============================
    socket.on('ice-candidate', ({ roomId, candidate }) => {

      socket.to(roomId).emit('ice-candidate', {
        candidate,
        from: socket.id
      })

    })


    // ==============================
    // END INTERVIEW
    // ==============================
    socket.on('end-interview', async ({ roomId }) => {

      try {

        await Interview.findOneAndUpdate(
          { roomId },
          {
            status: 'completed',
            endTime: new Date()
          }
        )

        io.to(roomId).emit('interview-ended', {
          message: 'Interview has ended'
        })

        socket.leave(roomId)

      } catch (err) {
        console.error('End interview error:', err)
      }

    })


    // ==============================
    // DISCONNECT
    // ==============================
    socket.on('disconnect', () => {

      console.log('User disconnected:', socket.id)

      const { roomId } = socket.data || {}

      if (!roomId) return

      socket.to(roomId).emit('user-left', {
        socketId: socket.id
      })

    })

  })

}