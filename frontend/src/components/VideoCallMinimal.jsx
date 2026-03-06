import { useEffect, useRef, useState } from "react";
import socket from "../utils/socket";

const VideoCallMinimal = ({ roomId }) => {

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);

  const [remoteStream, setRemoteStream] = useState(null);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);

  useEffect(() => {

    const startCall = async () => {

      try {

        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });

        localStreamRef.current = stream;

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
            {
              urls: "turn:openrelay.metered.ca:80",
              username: "openrelayproject",
              credential: "openrelayproject"
            }
          ]
        });

        peerConnectionRef.current = pc;

        // Add tracks
        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream);
        });

        // Remote stream
        pc.ontrack = (event) => {

          const remote = event.streams[0];

          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remote;
          }

          setRemoteStream(remote);

        };

        // ICE candidate
        pc.onicecandidate = (event) => {

          if (event.candidate) {

            socket.emit("ice-candidate", {
              roomId,
              candidate: event.candidate
            });

          }

        };

        // Join room
        socket.emit("join-room", {
          roomId,
          userId: socket.id,
          userName: "Guest"
        });

      } catch (err) {

        console.error("Media error:", err);

      }

    };

    startCall();

    // Existing users
    socket.on("existing-users", async (users) => {

      if (users.length === 0) return;

      const pc = peerConnectionRef.current;

      if (!pc) return;

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit("offer", {
        roomId,
        offer
      });

    });

    // User joined
    socket.on("user-joined", async () => {

      const pc = peerConnectionRef.current;

      if (!pc) return;

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit("offer", {
        roomId,
        offer
      });

    });

    // Receive offer
    socket.on("offer", async ({ offer, from }) => {

      if (from === socket.id) return;

      const pc = peerConnectionRef.current;

      if (!pc) return;

      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("answer", {
        roomId,
        answer
      });

    });

    // Receive answer
    socket.on("answer", async ({ answer, from }) => {

      if (from === socket.id) return;

      const pc = peerConnectionRef.current;

      if (!pc) return;

      await pc.setRemoteDescription(new RTCSessionDescription(answer));

    });

    // ICE candidates
    socket.on("ice-candidate", async ({ candidate, from }) => {

      if (from === socket.id) return;

      const pc = peerConnectionRef.current;

      if (!pc) return;

      try {

        await pc.addIceCandidate(new RTCIceCandidate(candidate));

      } catch (err) {

        console.error("ICE error:", err);

      }

    });

    return () => {

      socket.off("existing-users");
      socket.off("user-joined");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");

      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }

    };

  }, [roomId]);

  // CAMERA
  const toggleCamera = () => {

    const track = localStreamRef.current?.getVideoTracks()[0];

    if (!track) return;

    track.enabled = !track.enabled;
    setCameraOn(track.enabled);

  };

  // MIC
  const toggleMic = () => {

    const track = localStreamRef.current?.getAudioTracks()[0];

    if (!track) return;

    track.enabled = !track.enabled;
    setMicOn(track.enabled);

  };

  // SCREEN SHARE
  const toggleScreenShare = async () => {

    if (!screenSharing) {

      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true
      });

      const screenTrack = screenStream.getVideoTracks()[0];

      const sender = peerConnectionRef.current
        ?.getSenders()
        .find(s => s.track?.kind === "video");

      if (sender) sender.replaceTrack(screenTrack);

      localVideoRef.current.srcObject = screenStream;

      screenTrack.onended = stopScreenShare;

      setScreenSharing(true);

    } else {

      stopScreenShare();

    }

  };

  const stopScreenShare = () => {

    const videoTrack = localStreamRef.current?.getVideoTracks()[0];

    const sender = peerConnectionRef.current
      ?.getSenders()
      .find(s => s.track?.kind === "video");

    if (sender && videoTrack) sender.replaceTrack(videoTrack);

    localVideoRef.current.srcObject = localStreamRef.current;

    setScreenSharing(false);

  };

  return (

    <div className="bg-black flex flex-col h-full">

      <div className="flex-1 relative">

        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />

        {!remoteStream && (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            Waiting for candidate...
          </div>
        )}

        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="absolute bottom-5 right-5 w-64 rounded border"
        />

      </div>

      <div className="flex justify-center gap-4 p-3 bg-gray-900">

        <button
          onClick={toggleCamera}
          className="bg-gray-700 px-4 py-2 rounded text-white"
        >
          {cameraOn ? "Camera On" : "Camera Off"}
        </button>

        <button
          onClick={toggleMic}
          className="bg-gray-700 px-4 py-2 rounded text-white"
        >
          {micOn ? "Mic On" : "Mic Off"}
        </button>

        <button
          onClick={toggleScreenShare}
          className="bg-gray-700 px-4 py-2 rounded text-white"
        >
          {screenSharing ? "Stop Share" : "Share Screen"}
        </button>

      </div>

    </div>

  );

};

export default VideoCallMinimal;