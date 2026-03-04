import API from "./api";

const interviewAPI = {

  // =========================
  // Create Interview Room
  // =========================
  createRoom: async (roomData) => {
    try {
      const response = await API.post("/interviews/create-room", roomData);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Failed to create room"
      );
    }
  },

  // =========================
  // Get All Interviews
  // =========================
  getInterviews: async () => {
    try {
      const response = await API.get("/interviews");
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Failed to load interviews"
      );
    }
  },

  // =========================
  // Complete Interview
  // =========================
  completeInterview: async (roomId) => {
    try {
      const response = await API.post(`/interviews/${roomId}/rate`, {
        rating: 5,
        feedback: "Interview completed"
      });

      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Failed to complete interview"
      );
    }
  },

  // =========================
  // Delete Interview
  // =========================
  deleteInterview: async (roomId) => {
    try {
      const response = await API.delete(`/interviews/${roomId}`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Failed to delete interview"
      );
    }
  }

};

export default interviewAPI;