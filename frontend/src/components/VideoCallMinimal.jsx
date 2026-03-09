import React, { useEffect, useRef, useState } from "react";
import socket from "../utils/socket";

const VideoCallMinimal = ({ roomId }) => {

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingCandidatesRef = useRef([]);

  const [remoteStream, setRemoteStream] = useState(null);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);

  useEffect(() => {

    let pc;

    const init = async () => {

      try {

        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });

        localStreamRef.current = stream;

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        pc = new RTCPeerConnection({
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            {
              urls: "turn:openrelay.metered.ca:80",
              username: "openrelayproject",
              credential: "openrelayproject"
            }
          ]
        });

        peerConnectionRef.current = pc;

        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream);
        });

        pc.ontrack = (event) => {

          const remote = event.streams[0];

          setRemoteStream(remote);

          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remote;
          }

        };

        pc.onicecandidate = (event) => {

          if (event.candidate) {

            socket.emit("ice-candidate", {
              roomId,
              candidate: event.candidate,
              from: socket.id
            });

          }

        };

        pc.onconnectionstatechange = () => {
          console.log("WebRTC state:", pc.connectionState);
        };

        if (!socket.connected) socket.connect();

        socket.emit("join-room", {
          roomId,
          userId: socket.id,
          userName: "User"
        });

      } catch (err) {
        console.log("Media error:", err);
      }

    };

    init();

    const createOffer = async () => {

      const pc = peerConnectionRef.current;
      if (!pc) return;

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit("offer", {
        roomId,
        offer,
        from: socket.id
      });

    };

    socket.on("existing-users", (users) => {

      if (users.length > 1) {

        const other = users.find(u => u.socketId !== socket.id);

        if (socket.id < other.socketId) {
          setTimeout(createOffer, 500);
        }

      }

    });

    socket.on("user-joined", ({ socketId }) => {

      if (socketId === socket.id) return;

      if (socket.id < socketId) {
        setTimeout(createOffer, 500);
      }

    });

    socket.on("offer", async ({ offer, from }) => {

      if (from === socket.id) return;

      const pc = peerConnectionRef.current;

      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("answer", {
        roomId,
        answer,
        from: socket.id
      });

    });

    socket.on("answer", async ({ answer, from }) => {

      if (from === socket.id) return;

      const pc = peerConnectionRef.current;

      await pc.setRemoteDescription(new RTCSessionDescription(answer));

      // Add queued ICE candidates
      pendingCandidatesRef.current.forEach(candidate =>
        pc.addIceCandidate(candidate)
      );

      pendingCandidatesRef.current = [];

    });

    socket.on("ice-candidate", async ({ candidate, from }) => {

      if (from === socket.id) return;

      const pc = peerConnectionRef.current;

      const ice = new RTCIceCandidate(candidate);

      try {

        if (pc.remoteDescription) {
          await pc.addIceCandidate(ice);
        } else {
          pendingCandidatesRef.current.push(ice);
        }

      } catch (err) {
        console.log("ICE error:", err);
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

      const sender = peerConnectionRef.current
        ?.getSenders()
        .find(s => s.track?.kind === "video");

      if (sender) sender.replaceTrack(screenTrack);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = screenStream;
      }

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

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }

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
            Waiting for participant...
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