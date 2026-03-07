import React, { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import CodeEditor from "../components/CodeEditor";
import VideoCall from "../components/VideoCallMinimal";
import Timer from "../components/Timer";
import RatingPanel from "../components/RatingPanel";
import socket from "../utils/socket";

const InterviewRoom = () => {

  const { roomId } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [roomUsers, setRoomUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");

  const [roomLoading, setRoomLoading] = useState(true);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [copied, setCopied] = useState(false);

  const inviteLink = `${window.location.origin}/room/${roomId}`;

  // ==============================
  // LOAD ROOM
  // ==============================

  useEffect(() => {

    if (!roomId || !user) return;

    // No backend validation needed
    setRoomLoading(false);

  }, [roomId, user]);

  // ==============================
  // SOCKET CONNECTION
  // ==============================

  useEffect(() => {

    if (!user) return;

    if (!socket.connected) socket.connect();

    socket.emit("join-room", {
      roomId,
      userId: user._id,
      userName: user.name
    });

    socket.on("room-joined", (data) => {
      setRoomUsers(data.users || []);
    });

    socket.on("user-joined", (data) => {
      setRoomUsers(data.users || []);
    });

    socket.on("user-left", (data) => {
      setRoomUsers(data.users || []);
    });

    socket.on("chat-message", (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    socket.on("interview-ended", () => {
      socket.disconnect();
      navigate("/dashboard");
    });

    return () => {

      socket.off("room-joined");
      socket.off("user-joined");
      socket.off("user-left");
      socket.off("chat-message");
      socket.off("interview-ended");

    };

  }, [roomId, user, navigate]);

  // ==============================
  // CHAT
  // ==============================

  const sendMessage = () => {

    if (!messageInput.trim()) return;

    socket.emit("chat-message", {
      roomId,
      message: messageInput,
      senderName: user?.name
    });

    setMessageInput("");

  };

  // ==============================
  // INVITE LINK
  // ==============================

  const copyInviteLink = () => {

    navigator.clipboard.writeText(inviteLink);

    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 2000);

  };

  // ==============================
  // END INTERVIEW
  // ==============================

  const handleEndInterview = () => {

    if (user?.role === "interviewer") {

      socket.emit("end-interview", { roomId });

      setShowRating(true);

    }

  };

  // ==============================
  // LOADING SCREEN
  // ==============================

  if (roomLoading) {

    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-white text-lg">Loading interview room...</p>
      </div>
    );

  }

  return (

    <div className="h-screen bg-gray-900 flex flex-col">

      {/* HEADER */}

      <div className="bg-gray-800 text-white p-4 flex justify-between items-center">

        <div>
          <h1 className="text-xl font-bold">Interview Room</h1>
          <p className="text-sm text-gray-400">Room ID: {roomId}</p>
        </div>

        <div className="flex items-center gap-6">

          <Timer />

          <div className="text-sm">

            <p className="font-semibold">
              {roomUsers.length}/2 participants
            </p>

            {roomUsers.map((u) => (
              <span key={u.socketId} className="block text-gray-400">
                {u.userName}
              </span>
            ))}

          </div>

          {roomUsers.length < 2 && (

            <button
              onClick={() => setShowInviteModal(true)}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
            >
              Invite Candidate
            </button>

          )}

          {user?.role === "interviewer" && (

            <button
              onClick={handleEndInterview}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
            >
              End Interview
            </button>

          )}

        </div>

      </div>

      {/* MAIN CONTENT */}

      <div className="flex-1 flex gap-4 p-4 overflow-hidden">

        <div className="flex-1 flex flex-col">
          <VideoCall roomId={roomId} />
        </div>

        <div className="flex-1 flex flex-col">
          <CodeEditor roomId={roomId} />
        </div>

        {/* CHAT */}

        <div className="w-80 bg-gray-800 rounded-lg flex flex-col">

          <div className="p-3 border-b border-gray-700 text-white font-semibold">
            Chat
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 text-white">

            {messages.map((msg, i) => (

              <div key={i} className="text-sm">

                <span className="font-semibold text-blue-400">
                  {msg.senderName || "User"}:
                </span>{" "}
                {msg.message}

              </div>

            ))}

          </div>

          <div className="p-3 border-t border-gray-700 flex gap-2">

            <input
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Type message..."
              className="flex-1 p-2 rounded bg-gray-700 text-white text-sm"
            />

            <button
              onClick={sendMessage}
              className="bg-blue-500 hover:bg-blue-600 px-3 py-2 rounded text-white text-sm"
            >
              Send
            </button>

          </div>

        </div>

      </div>

      {/* INVITE MODAL */}

      {showInviteModal && (

        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center">

          <div className="bg-white rounded-lg p-6 w-96">

            <h2 className="text-xl font-bold mb-4">
              Invite Candidate
            </h2>

            <div className="flex gap-2">

              <input
                value={inviteLink}
                readOnly
                className="flex-1 border p-2 rounded text-sm"
              />

              <button
                onClick={copyInviteLink}
                className="bg-green-600 text-white px-3 py-2 rounded"
              >
                {copied ? "Copied" : "Copy"}
              </button>

            </div>

            <button
              onClick={() => setShowInviteModal(false)}
              className="mt-4 w-full bg-gray-700 text-white py-2 rounded"
            >
              Close
            </button>

          </div>

        </div>

      )}

      {showRating && user?.role === "interviewer" && (

        <RatingPanel
          roomId={roomId}
          onClose={() => setShowRating(false)}
        />

      )}

    </div>

  );

};

export default InterviewRoom;