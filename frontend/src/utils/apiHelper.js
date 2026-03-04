import API from './api'

// ==============================
// Interview API Helper
// ==============================

const interviewAPI = {

  // =========================
  // Create Interview Room
  // =========================
  createRoom: async (roomData) => {
    if (!roomData) {
      throw new Error('Room data is required')
    }

    try {
      console.log('🏢 Creating interview room:', roomData)

      const response = await API.post('/interviews/create-room', roomData)

      console.log('✅ Interview room created successfully')

      return response.data

    } catch (error) {
      console.error(
        '❌ Create room error:',
        error.response?.data || error.message
      )

      throw new Error(
        error.response?.data?.message || 'Failed to create room'
      )
    }
  },

  // =========================
  // Delete Interview
  // =========================
  deleteInterview: async (roomId) => {
    if (!roomId) {
      throw new Error('Room ID is required')
    }

    try {
      console.log(`🗑️ Deleting interview: ${roomId}`)

      const response = await API.delete(`/interviews/${roomId}`)

      console.log('✅ Interview deleted successfully')

      return response.data

    } catch (error) {
      console.error(
        '❌ Delete interview error:',
        error.response?.data || error.message
      )

      throw new Error(
        error.response?.data?.message || 'Failed to delete interview'
      )
    }
  },

  // =========================
  // Complete Interview
  // =========================
  completeInterview: async (roomId) => {
    if (!roomId) {
      throw new Error('Room ID is required')
    }

    try {
      console.log(`✅ Completing interview: ${roomId}`)

      const response = await API.patch(`/interviews/${roomId}/complete`)

      console.log('🎉 Interview completed')

      return response.data

    } catch (error) {
      console.error(
        '❌ Complete interview error:',
        error.response?.data || error.message
      )

      throw new Error(
        error.response?.data?.message || 'Failed to complete interview'
      )
    }
  },

  // =========================
  // Get All Interviews
  // =========================
  getInterviews: async () => {
    try {
      console.log('📋 Fetching all interviews')

      const response = await API.get('/interviews')

      return response.data

    } catch (error) {
      console.error(
        '❌ Fetch interviews error:',
        error.response?.data || error.message
      )

      throw new Error(
        error.response?.data?.message || 'Failed to fetch interviews'
      )
    }
  }

}

export default interviewAPI