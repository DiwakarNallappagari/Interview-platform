import React, { useEffect, useRef, useState } from "react";
import socket from "../utils/socket";

const VideoCallMinimal = ({ roomId }) => {

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingCandidates = useRef([]);

  const makingOffer = useRef(false);
  const polite = useRef(false);

  const [remoteStream, setRemoteStream] = useState(null);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);

  useEffect(() => {

    const createPeerConnection = () => {

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          {
            urls: [
              "turn:global.relay.metered.ca:80",
              "turn:global.relay.metered.ca:80?transport=tcp",
              "turn:global.relay.metered.ca:443",
              "turns:global.relay.metered.ca:443?transport=tcp"
            ],
            username: "51f5c130bbe99465ab82a39d",
            credential: "UN1JcgSm3jrU2Aky"
          }
        ]
      });

      // Remote stream
      pc.ontrack = (event) => {

        const stream = event.streams[0];

        if (!stream) return;

        console.log("Remote stream received");

        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
        }

        setRemoteStream(stream);

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

      pc.onconnectionstatechange = () => {
        console.log("Connection:", pc.connectionState);
      };

      pc.oniceconnectionstatechange = () => {
        console.log("ICE:", pc.iceConnectionState);
      };

      return pc;

    };

    const startCall = async () => {

      try {

        if (!socket.connected) socket.connect();

        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });

        localStreamRef.current = stream;

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        const pc = createPeerConnection();
        pcRef.current = pc;

        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream);
        });

        socket.emit("join-room", { roomId });

      } catch (err) {

        console.error("Media error:", err);

      }

    };

    startCall();

    socket.on("room-joined", ({ users }) => {

      const other = users.find(u => u.socketId !== socket.id);

      if (!other) return;

      polite.current = socket.id > other.socketId;

      if (!polite.current) createOffer();

    });

    socket.on("user-joined", () => {

      if (!polite.current) createOffer();

    });

    const createOffer = async () => {

      const pc = pcRef.current;

      if (!pc) return;

      try {

        makingOffer.current = true;

        const offer = await pc.createOffer();

        await pc.setLocalDescription(offer);

        socket.emit("offer", { roomId, offer });

      } finally {

        makingOffer.current = false;

      }

    };

    socket.on("offer", async ({ offer }) => {

      const pc = pcRef.current;

      const offerCollision =
        makingOffer.current || pc.signalingState !== "stable";

      const ignoreOffer = !polite.current && offerCollision;

      if (ignoreOffer) return;

      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      while (pendingCandidates.current.length) {
        await pc.addIceCandidate(pendingCandidates.current.shift());
      }

      const answer = await pc.createAnswer();

      await pc.setLocalDescription(answer);

      socket.emit("answer", { roomId, answer });

    });

    socket.on("answer", async ({ answer }) => {

      const pc = pcRef.current;

      await pc.setRemoteDescription(new RTCSessionDescription(answer));

    });

    socket.on("ice-candidate", async ({ candidate }) => {

      const pc = pcRef.current;

      const ice = new RTCIceCandidate(candidate);

      if (pc.remoteDescription) {
        await pc.addIceCandidate(ice);
      } else {
        pendingCandidates.current.push(ice);
      }

    });

    return () => {

      socket.off("room-joined");
      socket.off("user-joined");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");

      if (pcRef.current) pcRef.current.close();

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }

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

    if (!screenSharing) {

      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true
      });

      const screenTrack = screenStream.getVideoTracks()[0];

      const sender = pcRef.current
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

    const sender = pcRef.current
      ?.getSenders()
      .find(s => s.track?.kind === "video");

    if (sender && videoTrack) {
      sender.replaceTrack(videoTrack);
    }

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
            Connecting to participant...
          </div>
        )}

        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="absolute bottom-5 right-5 w-56 rounded-lg border-2 border-white shadow-lg"
        />

      </div>

      <div className="flex justify-center gap-4 p-4 bg-gray-900">

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
          className="bg-blue-600 px-4 py-2 rounded text-white"
        >
          {screenSharing ? "Stop Share" : "Share Screen"}
        </button>

      </div>

    </div>

  );

};

export default VideoCallMinimal;