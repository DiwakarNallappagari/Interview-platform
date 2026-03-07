import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import interviewAPI from "../utils/apiHelper";

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchInterviews();
    }
  }, [user]);

  const fetchInterviews = async () => {
    try {
      setLoading(true);
      const data = await interviewAPI.getInterviews();
      setInterviews(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch interviews error:", err);
      setError("Failed to load interviews");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = () => {
    navigate("/create-room");
  };

  const handleJoinRoom = (roomId) => {
    navigate(`/room/${roomId}`);
  };

  const handleDeleteRoom = async (roomId) => {
    try {
      await interviewAPI.deleteInterview(roomId);
      fetchInterviews();
    } catch (err) {
      alert("Delete failed");
    }
  };

  const handleCompleteInterview = async (roomId) => {
    try {
      await interviewAPI.completeInterview(roomId);
      fetchInterviews();
    } catch (err) {
      alert("Complete failed");
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading user...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">

      {/* NAVBAR */}
      <nav className="bg-blue-600 text-white p-4 flex justify-between">
        <h1 className="text-xl font-bold">Interview Platform</h1>

        <div className="flex gap-4 items-center">
          <span>{user.name}</span>
          <button
            onClick={handleLogout}
            className="bg-red-500 px-4 py-1 rounded"
          >
            Logout
          </button>
        </div>
      </nav>

      {/* CONTENT */}
      <div className="max-w-6xl mx-auto p-6">

        {user.role === "interviewer" && (
          <button
            onClick={handleCreateRoom}
            className="mb-6 bg-green-500 text-white px-6 py-2 rounded"
          >
            + Create Interview Room
          </button>
        )}

        {error && (
          <div className="bg-red-100 text-red-600 p-3 rounded mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div>Loading interviews...</div>
        ) : interviews.length === 0 ? (
          <div>No interviews yet</div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">

            {interviews.map((interview) => (
              <div
                key={interview._id}
                className="bg-white shadow p-4 rounded"
              >
                <h3 className="font-bold mb-2">
                  Room: {interview.roomId}
                </h3>

                <p>
                  Interviewer: {interview.interviewer?.name || "Unknown"}
                </p>

                <p>
                  Candidate: {interview.candidate?.name || "Not joined"}
                </p>

                <div className="flex gap-2 mt-4">

                  <button
                    onClick={() => handleJoinRoom(interview.roomId)}
                    className="bg-blue-500 text-white px-3 py-1 rounded"
                  >
                    Join
                  </button>

                  <button
                    onClick={() =>
                      handleCompleteInterview(interview.roomId)
                    }
                    className="bg-green-500 text-white px-3 py-1 rounded"
                  >
                    Complete
                  </button>

                  <button
                    onClick={() => handleDeleteRoom(interview.roomId)}
                    className="bg-red-500 text-white px-3 py-1 rounded"
                  >
                    Delete
                  </button>

                </div>
              </div>
            ))}

          </div>
        )}

      </div>
    </div>
  );
};

export default Dashboard;