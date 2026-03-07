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

      console.error("Failed to load interviews", err);

    }

  };

  const createInterview = async () => {

    try {

      const res = await API.post("/interviews/create");

      const roomId = res.data.roomId;

      navigate(`/room/${roomId}`);

    } catch (err) {

      console.error("Create interview error", err);

    }

  };

  return (

    <div className="p-6">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">

        <h2 className="text-xl font-bold">
          Welcome {user?.name}
        </h2>

        <button
          onClick={createInterview}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Create Interview Room
        </button>

      </div>

      {/* INTERVIEW LIST */}

      {interviews.length === 0 ? (

        <div className="text-gray-500">
          No interviews yet
        </div>

      ) : (

        <div className="space-y-3">

          {interviews.map((interview) => (

            <div
              key={interview._id}
              className="border p-4 rounded flex justify-between items-center"
            >

              <div>
                Room ID: {interview.roomId}
              </div>

              <button
                onClick={() => navigate(`/room/${interview.roomId}`)}
                className="bg-green-600 text-white px-3 py-1 rounded"
              >
                Join
              </button>

            </div>

          ))}

        </div>

      )}

    </div>

  );

};

export default Dashboard;