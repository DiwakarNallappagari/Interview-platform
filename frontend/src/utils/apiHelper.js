import API from './api'

// Helper functions for interview operations
export const interviewAPI = {

  // =========================
  // Delete Interview
  // =========================
  deleteInterview: async (roomId) => {
    if (!roomId) {
      throw new Error('Room ID is required')
    }

    try {
      console.log(`🗑️ Deleting interview: ${roomId}`)

      const response = await API.delete(
        `/api/interviews/${roomId}`
      )

      console.log('✅ Interview deleted successfully')
      return response.data

    } catch (error) {
      console.error('❌ Delete interview error:', error.response?.data || error.message)
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

      const response = await API.patch(
        `/api/interviews/${roomId}/complete`
      )

      console.log('✅ Interview completed successfully')
      return response.data

    } catch (error) {
      console.error('❌ Complete interview error:', error.response?.data || error.message)
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

      const response = await API.get('/api/interviews')

      console.log('✅ Interviews fetched successfully')
      return response.data

    } catch (error) {
      console.error('❌ Fetch interviews error:', error.response?.data || error.message)
      throw new Error(
        error.response?.data?.message || 'Failed to fetch interviews'
      )
    }
  }

}

export default interviewAPI