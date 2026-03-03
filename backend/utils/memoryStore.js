// In-memory storage fallback when MongoDB is not available
const memoryStore = {
  users: new Map(),
  interviews: new Map(),
  
  // User operations
  saveUser(userId, userData) {
    this.users.set(userId, { _id: userId, ...userData })
    return this.users.get(userId)
  },

  getUser(userId) {
    return this.users.get(userId)
  },

  findUserByEmail(email) {
    for (const user of this.users.values()) {
      if (user.email === email) return user
    }
    return null
  },

  // Interview operations
  saveInterview(interview) {
    const id = interview._id || interview.roomId
    interview._id = id
    this.interviews.set(id, interview)
    return { ...interview }
  },

  findInterviewByRoomId(roomId) {
    for (const interview of this.interviews.values()) {
      if (interview.roomId === roomId) return { ...interview }
    }
    return null
  },

  findInterviewsByUserId(userId) {
    const results = []
    for (const interview of this.interviews.values()) {
      if (interview.interviewer === userId || interview.candidate === userId) {
        results.push({ ...interview })
      }
    }
    return results
  },

  updateInterview(roomId, updates) {
    for (const [key, interview] of this.interviews.entries()) {
      if (interview.roomId === roomId) {
        const updated = { ...interview, ...updates }
        this.interviews.set(key, updated)
        return { ...updated }
      }
    }
    return null
  },

  deleteInterview(roomId) {
    for (const [key, interview] of this.interviews.entries()) {
      if (interview.roomId === roomId) {
        this.interviews.delete(key)
        return true
      }
    }
    return false
  },

  findAllInterviews() {
    return Array.from(this.interviews.values()).map(i => ({ ...i }))
  },
}

export default memoryStore
