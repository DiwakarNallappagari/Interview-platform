import Interview from '../models/Interview.js'
import Chat from '../models/Chat.js'

export const initializeSocketHandlers = (io) => {

  io.on('connection', (socket) => {

    console.log('New user connected:', socket.id)


    // ==============================
    // JOIN ROOM
    // ==============================
    socket.on('join-room', async (data) => {

      try {

        const { roomId, userId, userName } = data

        socket.join(roomId)

        socket.data = { userId, userName, roomId }

        const interview = await Interview.findOne({ roomId })

        if (interview && !interview.candidate && userId !== interview.interviewer.toString()) {
          interview.candidate = userId
          await interview.save()
        }

        socket.to(roomId).emit('user-joined', {
          socketId: socket.id,
          userId,
          userName
        })

        const roomSockets = io.sockets.adapter.rooms.get(roomId)

        const users = Array.from(roomSockets || []).map((socketId) => {

          const socketObj = io.sockets.sockets.get(socketId)

          return {
            socketId,
            userId: socketObj?.data?.userId,
            userName: socketObj?.data?.userName
          }

        })

        io.to(roomId).emit('room-joined', {
          users,
          message: `${userName} joined`
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

      socket.to(roomId).emit('offer', { offer })

    })


    // ==============================
    // WEBRTC ANSWER
    // ==============================
    socket.on('answer', ({ roomId, answer }) => {

      socket.to(roomId).emit('answer', { answer })

    })


    // ==============================
    // ICE CANDIDATE
    // ==============================
    socket.on('ice-candidate', ({ roomId, candidate }) => {

      socket.to(roomId).emit('ice-candidate', { candidate })

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

      const roomSockets = io.sockets.adapter.rooms.get(roomId)

      const users = Array.from(roomSockets || []).map((socketId) => {

        const socketObj = io.sockets.sockets.get(socketId)

        return {
          socketId,
          userId: socketObj?.data?.userId,
          userName: socketObj?.data?.userName
        }

      })

      io.to(roomId).emit('user-left', { users })

    })

  })

}