import { useEffect, useRef, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import CodeEditor from "../components/CodeEditor";
import VideoCall from "../components/VideoCallMinimal";
import Timer from "../components/Timer";
import RatingPanel from "../components/RatingPanel";
import socket from "../utils/socket";
import API from "../utils/api";

const InterviewRoom = () => {

  const { roomId } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const videoCallRef = useRef(null);

  const [roomUsers, setRoomUsers] = useState([]);
  const [showRating, setShowRating] = useState(false);

  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");

  const [roomLoading, setRoomLoading] = useState(true);
  const [roomError, setRoomError] = useState(null);

  // ==============================
  // FETCH ROOM
  // ==============================

  useEffect(() => {

    const fetchRoom = async () => {

      if (!roomId || !user) return;

      try {

        await API.get(`/interviews/room/${roomId}`);

      } catch (err) {

        setRoomError("Room not found or access denied");

      }

    };

    fetchRoom();

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
      setRoomLoading(false);
    });

    socket.on("user-joined", (data) => {
      setRoomUsers(data.users || []);
    });

    socket.on("user-left", (data) => {
      setRoomUsers(data.users || []);
    });

    // ==============================
    // CHAT LISTENER
    // ==============================

    socket.on("chat-message", (msg) => {

      setMessages(prev => [...prev, msg]);

    });

    socket.on("interview-ended", () => {

      stopEverything();
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
  // STOP VIDEO
  // ==============================

  const stopEverything = () => {

    if (videoCallRef.current) {
      videoCallRef.current.stopConnection();
    }

    socket.disconnect();

  };

  // ==============================
  // SEND CHAT MESSAGE
  // ==============================

  const sendMessage = () => {

    if (!messageInput.trim()) return;

    socket.emit("chat-message", {
      roomId,
      message: messageInput
    });

    setMessageInput("");

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

  if (roomError) {

    return (

      <div className="h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-red-400">{roomError}</p>
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

          {/* PARTICIPANTS */}

          <div className="text-sm">

            <p className="font-semibold">
              {roomUsers.length} participant(s)
            </p>

            {roomUsers.map((u) => (

              <span key={u.socketId} className="block text-gray-400">
                {u.userName}
              </span>

            ))}

          </div>

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

        {/* VIDEO CALL */}

        <div className="flex-1 flex flex-col">

          <VideoCall roomId={roomId} ref={videoCallRef} />

        </div>

        {/* CODE EDITOR */}

        <div className="flex-1 flex flex-col">

          <CodeEditor roomId={roomId} />

        </div>

        {/* CHAT PANEL */}

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

      {/* RATING PANEL */}

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