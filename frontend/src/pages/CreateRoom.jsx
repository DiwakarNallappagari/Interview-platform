import React from "react";
import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import interviewAPI from "../utils/apiHelper";

const CreateRoom = () => {
  const [candidateEmail, setCandidateEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleCreateRoom = async () => {
    if (!candidateEmail) {
      setError("Candidate email is required");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const data = await interviewAPI.createRoom({
        candidateEmail,
      });

      if (!data?.roomId) {
        throw new Error("Room creation failed");
      }

      navigate(`/room/${data.roomId}`);

    } catch (err) {
      console.error("Create room error:", err);

      setError(
        err?.response?.data?.message ||
        err?.message ||
        "Failed to create room"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">

      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">

        <h2 className="text-3xl font-bold text-gray-900 mb-4 text-center">
          Create Interview Room
        </h2>

        <p className="text-gray-600 mb-6 text-center">
          Enter candidate email and create interview room.
        </p>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-blue-700">
            <span className="font-semibold">Your Role:</span>{" "}
            {user?.role || "Interviewer"}
          </p>
        </div>

        <input
          type="email"
          placeholder="Enter Candidate Email"
          value={candidateEmail}
          onChange={(e) => setCandidateEmail(e.target.value)}
          className="w-full border border-gray-300 rounded-lg p-3 mb-4 focus:outline-none focus:ring-2 focus:ring-green-400"
        />

        <button
          onClick={handleCreateRoom}
          disabled={loading}
          className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg transition disabled:bg-gray-400"
        >
          {loading ? "Creating Room..." : "Create New Room"}
        </button>

        <button
          onClick={() => navigate("/dashboard")}
          className="w-full mt-4 bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition"
        >
          Back to Dashboard
        </button>

      </div>

    </div>
  );
};

export default CreateRoom;