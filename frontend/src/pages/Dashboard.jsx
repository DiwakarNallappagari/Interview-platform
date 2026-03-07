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

      const res = await API.post("/interviews/create");

      if (res.data && res.data.roomId) {
        navigate(`/room/${res.data.roomId}`);
      }

    } catch (err) {

      console.log("Create interview API failed, using fallback");

      // fallback room creation
      const roomId = Math.random().toString(36).substring(2, 10);
      navigate(`/room/${roomId}`);

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
          interviews.map((interview) => (
            <div key={interview._id}>{interview.roomId}</div>
          ))
        )}

      </div>
    </>
  );
};

export default Dashboard;