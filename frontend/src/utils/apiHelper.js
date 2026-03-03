import API from './api'

// Helper functions for interview operations
export const interviewAPI = {
  // Delete interview with proper error handling
  deleteInterview: async (roomId) => {
    if (!roomId) {
      throw new Error('Room ID is required')
    }
    
    try {
      console.log(`🗑️ Deleting interview: ${roomId}`)
      const response = await API.delete(`/interviews/${roomId}`)
      
      if (response.status !== 200) {
        throw new Error(response.data?.message || 'Delete failed')
      }
      
      console.log('✅ Interview deleted successfully')
      return response.data
    } catch (error) {
      console.error('❌ Delete interview error:', error)
      throw error
    }
  },

  // Complete interview with proper error handling
  completeInterview: async (roomId) => {
    if (!roomId) {
      throw new Error('Room ID is required')
    }
    
    try {
      console.log(`✅ Completing interview: ${roomId}`)
      const response = await API.patch(`/interviews/${roomId}/complete`)
      
      if (response.status !== 200) {
        throw new Error(response.data?.message || 'Complete failed')
      }
      
      console.log('✅ Interview completed successfully')
      return response.data
    } catch (error) {
      console.error('❌ Complete interview error:', error)
      throw error
    }
  },

  // Get all interviews with proper error handling
  getInterviews: async () => {
    try {
      console.log('📋 Fetching all interviews')
      const response = await API.get('/interviews')
      
      if (response.status !== 200) {
        throw new Error(response.data?.message || 'Fetch failed')
      }
      
      console.log('✅ Interviews fetched successfully')
      return response.data
    } catch (error) {
      console.error('❌ Fetch interviews error:', error)
      throw error
    }
  }
}

export default interviewAPI
