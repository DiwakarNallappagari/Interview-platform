import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import API from "../utils/api";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {

  const [interviews, setInterviews] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchInterviews();
  }, []);

  const fetchInterviews = async () => {
    try {
      const res = await API.get("/interviews");
      setInterviews(res.data || []);
    } catch (err) {
      console.log("Fetch interviews error:", err);
    }
  };

  const createInterview = async () => {
    try {

      const res = await API.post("/interviews/create-room");

      if (res.data && res.data.roomId) {
        navigate(`/room/${res.data.roomId}`);
      }

    } catch (err) {

      console.log("Create interview API failed, using fallback");

      const roomId = Math.random().toString(36).substring(2, 10);
      navigate(`/room/${roomId}`);

    }
  };

  const joinRoom = (roomId) => {
    navigate(`/room/${roomId}`);
  };

  const deleteRoom = async (id) => {
    try {

      await API.delete(`/interviews/${id}`);

      setInterviews(prev => prev.filter(i => i._id !== id));

    } catch (err) {
      console.log("Delete failed:", err);
    }
  };

  const completeRoom = async (id) => {
    try {

      await API.patch(`/interviews/${id}/complete`);

      alert("Interview marked as completed");

    } catch (err) {
      console.log("Complete failed:", err);
    }
  };

  return (
    <>
      <Navbar />

      <div style={{ padding: "30px", background: "#f3f4f6", minHeight: "100vh" }}>

        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "20px" }}>
          <button
            onClick={createInterview}
            style={{
              background: "#2f66d0",
              color: "white",
              border: "none",
              padding: "10px 16px",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            Create Interview Room
          </button>
        </div>

        {interviews.length === 0 ? (
          <p>No interviews yet</p>
        ) : (

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(250px,1fr))", gap: "20px" }}>

            {interviews.map((interview) => (

              <div
                key={interview._id}
                style={{
                  background: "white",
                  padding: "16px",
                  borderRadius: "8px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                }}
              >

                <h4>Room ID</h4>
                <p style={{ fontWeight: "bold" }}>{interview.roomId}</p>

                <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>

                  <button
                    onClick={() => joinRoom(interview.roomId)}
                    style={{
                      background: "#22c55e",
                      color: "white",
                      border: "none",
                      padding: "6px 10px",
                      borderRadius: "4px",
                      cursor: "pointer"
                    }}
                  >
                    Join
                  </button>

                  <button
                    onClick={() => deleteRoom(interview._id)}
                    style={{
                      background: "#ef4444",
                      color: "white",
                      border: "none",
                      padding: "6px 10px",
                      borderRadius: "4px",
                      cursor: "pointer"
                    }}
                  >
                    Delete
                  </button>

                  <button
                    onClick={() => completeRoom(interview._id)}
                    style={{
                      background: "#3b82f6",
                      color: "white",
                      border: "none",
                      padding: "6px 10px",
                      borderRadius: "4px",
                      cursor: "pointer"
                    }}
                  >
                    Complete
                  </button>

                </div>

              </div>

            ))}

          </div>

        )}

      </div>
    </>
  );
};

export default Dashboard;