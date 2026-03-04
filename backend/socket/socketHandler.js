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

        // store user data
        socket.data = { userId, userName, roomId }

        // update interview candidate if needed
        const interview = await Interview.findOne({ roomId })

        if (interview && !interview.candidate && userId !== interview.interviewer.toString()) {
          interview.candidate = userId
          await interview.save()
        }

        // notify others that user joined (IMPORTANT for WebRTC)
        socket.to(roomId).emit('user-joined', {
          socketId: socket.id,
          userId,
          userName
        })

        // get users in room
        const roomSockets = io.sockets.adapter.rooms.get(roomId)

        const users = Array.from(roomSockets || []).map((socketId) => {

          const socketObj = io.sockets.sockets.get(socketId)

          return {
            socketId,
            userId: socketObj?.data?.userId,
            userName: socketObj?.data?.userName,
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
    socket.on('code-change', (data) => {

      const { roomId, code } = data

      socket.to(roomId).emit('receive-code', {
        code,
        from: socket.data?.userId
      })

    })


    // ==============================
    // CURSOR UPDATE
    // ==============================
    socket.on('cursor-update', (data) => {

      const { roomId, cursor } = data

      socket.to(roomId).emit('cursor-update', {
        socketId: socket.id,
        userId: socket.data?.userId,
        cursor
      })

    })


    // ==============================
    // TYPING INDICATOR
    // ==============================
    socket.on('typing', (data) => {

      const { roomId, typing } = data

      socket.to(roomId).emit('typing', {
        socketId: socket.id,
        userId: socket.data?.userId,
        typing
      })

    })


    // ==============================
    // CHAT MESSAGES
    // ==============================
    socket.on('chat-message', async (data) => {

      try {

        const { roomId, message } = data

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
    socket.on('language-change', (data) => {

      const { roomId, language } = data

      socket.to(roomId).emit('language-change', { language })

    })


    // ==============================
    // WEBRTC OFFER
    // ==============================
    socket.on('offer', (data) => {

      const { roomId, offer } = data

      socket.to(roomId).emit('offer', {
        offer,
        socketId: socket.id
      })

    })


    // ==============================
    // WEBRTC ANSWER
    // ==============================
    socket.on('answer', (data) => {

      const { roomId, answer } = data

      socket.to(roomId).emit('answer', {
        answer,
        socketId: socket.id
      })

    })


    // ==============================
    // ICE CANDIDATE
    // ==============================
    socket.on('ice-candidate', (data) => {

      const { roomId, candidate } = data

      socket.to(roomId).emit('ice-candidate', {
        candidate,
        socketId: socket.id
      })

    })


    // ==============================
    // END INTERVIEW
    // ==============================
    socket.on('end-interview', async (data) => {

      try {

        const { roomId } = data

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