import React, { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {

  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const createInterview = () => {
    const roomId = Math.random().toString(36).substring(2, 10);
    navigate(`/room/${roomId}`);
  };

  return (

    <div className="p-6">

      <div className="flex justify-between items-center">

        <h2 className="text-xl font-bold">
          Welcome {user?.name}
        </h2>

        <button
          onClick={createInterview}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Create Interview Room
        </button>

      </div>

    </div>

  );

};

export default Dashboard;