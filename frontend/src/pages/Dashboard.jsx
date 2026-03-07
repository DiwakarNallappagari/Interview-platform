import React, { useEffect, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import API from "../utils/api";

const Dashboard = () => {

  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [interviews, setInterviews] = useState([]);

  useEffect(() => {
    fetchInterviews();
  }, []);

  const fetchInterviews = async () => {
    try {
      const res = await API.get("/interviews");
      setInterviews(res.data || []);
    } catch (err) {
      console.log(err);
    }
  };

  const createInterview = async () => {
    try {
      const res = await API.post("/interviews/create");
      const roomId = res.data.roomId;
      navigate(`/room/${roomId}`);
    } catch (err) {
      console.log(err);
    }
  };

  return (

    <div className="p-6">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">

        <h2 className="text-xl font-bold">
          Interview Platform
        </h2>

        <button
          onClick={createInterview}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Create Interview Room
        </button>

      </div>

      {/* INTERVIEW LIST */}
      {interviews.length === 0 ? (
        <p>No interviews yet</p>
      ) : (
        interviews.map((interview) => (
          <div key={interview._id}>
            {interview.roomId}
          </div>
        ))
      )}

    </div>

  );
};

export default Dashboard;