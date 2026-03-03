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
        `/interviews/${roomId}`   // ✅ NO /api here
      )

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
        `/interviews/${roomId}/complete`   // ✅ NO /api here
      )

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

      const response = await API.get('/interviews')  // ✅ NO /api here

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