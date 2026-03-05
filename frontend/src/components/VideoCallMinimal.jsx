import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import socket from "../utils/socket";

const VideoCallMinimal = forwardRef(({ roomId }, ref) => {

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingCandidates = useRef([]);
  const joinedRef = useRef(false);
  const isInitiator = useRef(false);

  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [remoteStream, setRemoteStream] = useState(null);

  useImperativeHandle(ref, () => ({
    stopConnection: () => {
      localStreamRef.current?.getTracks().forEach(track => track.stop());
      peerConnectionRef.current?.close();
    }
  }));

  useEffect(() => {

    const startMedia = async () => {
      try {

        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });

        localStreamRef.current = stream;

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.muted = true;
          await localVideoRef.current.play().catch(() => {});
        }

        stream.getVideoTracks().forEach(t => t.enabled = false);
        stream.getAudioTracks().forEach(t => t.enabled = false);

        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:global.stun.twilio.com:3478" }
          ]
        });

        peerConnectionRef.current = pc;

        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        pc.ontrack = (event) => {
          const remote = event.streams[0];
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remote;
          }
          setRemoteStream(remote);
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit("ice-candidate", {
              roomId,
              candidate: event.candidate
            });
          }
        };

      } catch (err) {
        console.error("Media error:", err);
      }
    };

    const joinRoom = () => {

      if (joinedRef.current) return;

      joinedRef.current = true;

      socket.emit("join-room", {
        roomId,
        userId: socket.id || "guest",
        userName: "Guest"
      });

      isInitiator.current = true;

    };

    const init = async () => {

      await startMedia();

      if (!socket.connected) {
        socket.connect();
      }

      if (socket.connected) {
        joinRoom();
      } else {
        socket.once("connect", joinRoom);
      }

    };

    init();

    const handleUserJoined = async () => {

      if (!isInitiator.current) return;

      const pc = peerConnectionRef.current;
      if (!pc) return;

      try {

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit("offer", { roomId, offer });

      } catch (err) {
        console.error("Offer error:", err);
      }

    };

    const handleOffer = async ({ offer }) => {

      const pc = peerConnectionRef.current;
      if (!pc) return;

      try {

        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit("answer", { roomId, answer });

        pendingCandidates.current.forEach(async (candidate) => {
          try {
            await pc.addIceCandidate(candidate);
          } catch (err) {
            console.warn("ICE add error:", err);
          }
        });

        pendingCandidates.current = [];

      } catch (err) {
        console.error("Offer handling error:", err);
      }

    };

    const handleAnswer = async ({ answer }) => {

      const pc = peerConnectionRef.current;
      if (!pc) return;

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (err) {
        console.error("Answer error:", err);
      }

    };

    const handleIce = async ({ candidate }) => {

      const pc = peerConnectionRef.current;
      if (!pc || !candidate) return;

      const iceCandidate = new RTCIceCandidate(candidate);

      if (pc.remoteDescription) {
        try {
          await pc.addIceCandidate(iceCandidate);
        } catch (err) {
          console.warn("ICE error:", err);
        }
      } else {
        pendingCandidates.current.push(iceCandidate);
      }

    };

    socket.on("user-joined", handleUserJoined);
    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("ice-candidate", handleIce);

    return () => {
      socket.off("user-joined", handleUserJoined);
      socket.off("offer", handleOffer);
      socket.off("answer", handleAnswer);
      socket.off("ice-candidate", handleIce);
    };

  }, [roomId]);

  const toggleCamera = () => {

    const track = localStreamRef.current?.getVideoTracks()[0];
    if (!track) return;

    track.enabled = !track.enabled;
    setCameraOn(track.enabled);

  };

  const toggleMic = () => {

    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;

    track.enabled = !track.enabled;
    setMicOn(track.enabled);

  };

  const toggleScreenShare = async () => {

    if (!peerConnectionRef.current) return;

    try {

      if (!screenSharing) {

        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true
        });

        const screenTrack = screenStream.getVideoTracks()[0];

        const sender = peerConnectionRef.current
          .getSenders()
          .find(s => s.track?.kind === "video");

        if (sender) sender.replaceTrack(screenTrack);

        screenTrack.onended = () => toggleScreenShare();

        setScreenSharing(true);

      } else {

        const cameraTrack = localStreamRef.current?.getVideoTracks()[0];

        const sender = peerConnectionRef.current
          .getSenders()
          .find(s => s.track?.kind === "video");

        if (sender && cameraTrack) sender.replaceTrack(cameraTrack);

        setScreenSharing(false);

      }

    } catch (err) {
      console.error("Screen share error:", err);
    }

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
          <div className="absolute inset-0 flex items-center justify-center text-white text-lg">
            Waiting for other participant...
          </div>
        )}

        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          style={{
            width: "300px",
            height: "200px",
            position: "absolute",
            bottom: "20px",
            right: "20px",
            background: "black"
          }}
        />

      </div>

      <div className="bg-gray-800 p-4 flex gap-4 justify-center">

        <button
          onClick={toggleCamera}
          className={`${cameraOn ? "bg-green-500" : "bg-red-500"} text-white px-6 py-2 rounded`}
        >
          {cameraOn ? "Camera On" : "Camera Off"}
        </button>

        <button
          onClick={toggleMic}
          className={`${micOn ? "bg-green-500" : "bg-red-500"} text-white px-6 py-2 rounded`}
        >
          {micOn ? "Mic On" : "Mic Off"}
        </button>

        <button
          onClick={toggleScreenShare}
          className="bg-blue-500 text-white px-6 py-2 rounded"
        >
          {screenSharing ? "Stop Share" : "Share Screen"}
        </button>

      </div>

    </div>
  );

});

VideoCallMinimal.displayName = "VideoCallMinimal";

export default VideoCallMinimal;