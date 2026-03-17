import React, { useEffect, useRef, useState } from "react";
import socket from "../utils/socket";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    // Free TURN from Metered (reliable public TURN)
    {
      urls: "turn:a.relay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject"
    },
    {
      urls: "turn:a.relay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject"
    },
    {
      urls: "turn:a.relay.metered.ca:443?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject"
    }
  ]
};

const VideoCallMinimal = ({ roomId }) => {

  const localVideoRef  = useRef(null);
  const remoteVideoRef = useRef(null);

  const pcRef             = useRef(null);
  const localStreamRef    = useRef(null);
  const pendingCandidates = useRef([]);
  const isOfferCreator    = useRef(false);

  const [remoteConnected, setRemoteConnected] = useState(false);
  const [cameraOn,        setCameraOn]        = useState(true);
  const [micOn,           setMicOn]           = useState(true);
  const [screenSharing,   setScreenSharing]   = useState(false);
  const [status,          setStatus]          = useState("Initializing...");

  // ─── Create RTCPeerConnection ───────────────────────────────────────────────
  const createPC = () => {

    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.ontrack = (event) => {
      console.log("Remote track received:", event.track.kind);
      if (remoteVideoRef.current) {
        let stream = remoteVideoRef.current.srcObject;
        if (!stream) {
          stream = new MediaStream();
          remoteVideoRef.current.srcObject = stream;
        }
        // avoid duplicate tracks
        if (!stream.getTracks().find(t => t.id === event.track.id)) {
          stream.addTrack(event.track);
        }
      }
      setRemoteConnected(true);
      setStatus("Connected");
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", { roomId, candidate: event.candidate });
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("ICE state:", pc.iceConnectionState);
      if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed") {
        setStatus("Connection lost — reconnecting...");
        setRemoteConnected(false);
        if (pc.iceConnectionState === "failed") {
          pc.restartIce();
        }
      }
      if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
        setStatus("Connected");
        setRemoteConnected(true);
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("Peer connection state:", pc.connectionState);
    };

    return pc;
  };

  // ─── Add local tracks to peer connection ───────────────────────────────────
  const addTracksToPC = (pc, stream) => {
    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });
  };

  // ─── Flush pending ICE candidates ──────────────────────────────────────────
  const flushCandidates = async (pc) => {
    while (pendingCandidates.current.length > 0) {
      const candidate = pendingCandidates.current.shift();
      try {
        await pc.addIceCandidate(candidate);
      } catch (err) {
        console.warn("Failed to add pending ICE candidate:", err);
      }
    }
  };

  // ─── Main effect ───────────────────────────────────────────────────────────
  useEffect(() => {

    let mounted = true;

    const init = async () => {

      try {

        setStatus("Requesting camera/mic...");

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true
        });

        if (!mounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        localStreamRef.current = stream;

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        const pc = createPC();
        pcRef.current = pc;
        addTracksToPC(pc, stream);

        setStatus("Waiting for other participant...");

      } catch (err) {
        console.error("Media error:", err);
        setStatus("Camera/Mic access denied");
        alert("Please allow camera and microphone access to use the video call.");
      }
    };

    init();

    // ── Socket: server tells the FIRST user to create an offer ────────────────
    const handleStartCall = async () => {

      const pc = pcRef.current;
      if (!pc || !mounted) return;

      console.log("start-call received — creating offer");
      isOfferCreator.current = true;
      setStatus("Connecting...");

      try {
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        });
        await pc.setLocalDescription(offer);
        socket.emit("offer", { roomId, offer });
      } catch (err) {
        console.error("Error creating offer:", err);
      }
    };

    // ── Socket: second user receives the offer ────────────────────────────────
    const handleOffer = async ({ offer }) => {

      const pc = pcRef.current;
      if (!pc || !mounted) return;

      console.log("Offer received — creating answer");
      setStatus("Connecting...");

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        // flush any ICE candidates that arrived before offer
        await flushCandidates(pc);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("answer", { roomId, answer });
      } catch (err) {
        console.error("Error handling offer:", err);
      }
    };

    // ── Socket: first user receives the answer ────────────────────────────────
    const handleAnswer = async ({ answer }) => {

      const pc = pcRef.current;
      if (!pc || !mounted) return;

      console.log("Answer received");

      try {
        if (pc.signalingState === "have-local-offer") {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          await flushCandidates(pc);
        }
      } catch (err) {
        console.error("Error handling answer:", err);
      }
    };

    // ── Socket: ICE candidate ─────────────────────────────────────────────────
    const handleIceCandidate = async ({ candidate }) => {

      if (!candidate || !mounted) return;

      const pc = pcRef.current;
      if (!pc) return;

      const iceCandidate = new RTCIceCandidate(candidate);

      if (pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(iceCandidate);
        } catch (err) {
          console.warn("ICE candidate error:", err);
        }
      } else {
        // queue until remote description is set
        pendingCandidates.current.push(iceCandidate);
      }
    };

    // ── Socket: other user left ───────────────────────────────────────────────
    const handleUserLeft = () => {
      setRemoteConnected(false);
      setStatus("Other participant left");
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
    };

    socket.on("start-call",    handleStartCall);
    socket.on("offer",         handleOffer);
    socket.on("answer",        handleAnswer);
    socket.on("ice-candidate", handleIceCandidate);
    socket.on("user-left",     handleUserLeft);

    return () => {

      mounted = false;

      socket.off("start-call",    handleStartCall);
      socket.off("offer",         handleOffer);
      socket.off("answer",        handleAnswer);
      socket.off("ice-candidate", handleIceCandidate);
      socket.off("user-left",     handleUserLeft);

      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
      }

    };

  }, [roomId]);

  // ─── Controls ──────────────────────────────────────────────────────────────

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

      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack  = screenStream.getVideoTracks()[0];

        const sender = pcRef.current?.getSenders().find(s => s.track?.kind === "video");
        if (sender) await sender.replaceTrack(screenTrack);

        if (localVideoRef.current) localVideoRef.current.srcObject = screenStream;

        screenTrack.onended = stopScreenShare;
        setScreenSharing(true);
      } catch (err) {
        console.error("Screen share error:", err);
      }

    } else {
      stopScreenShare();
    }
  };

  const stopScreenShare = async () => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    const sender     = pcRef.current?.getSenders().find(s => s.track?.kind === "video");
    if (sender && videoTrack) await sender.replaceTrack(videoTrack);
    if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
    setScreenSharing(false);
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="bg-black flex flex-col h-full">

      {/* Video area */}
      <div className="flex-1 relative min-h-0">

        {/* Remote video */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Overlay when not yet connected */}
        {!remoteConnected && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-gray-900 bg-opacity-80 gap-3">
            <div className="w-10 h-10 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">{status}</p>
          </div>
        )}

        {/* Local video (picture-in-picture) */}
        <div className="absolute bottom-4 right-4 w-48 h-36 rounded-lg overflow-hidden border-2 border-white shadow-xl">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          {!cameraOn && (
            <div className="absolute inset-0 bg-gray-800 flex items-center justify-center text-white text-xs">
              Camera Off
            </div>
          )}
        </div>

      </div>

      {/* Controls */}
      <div className="flex justify-center gap-4 p-4 bg-gray-900">

        <button
          onClick={toggleCamera}
          className={`px-4 py-2 rounded text-white font-medium transition-colors ${
            cameraOn ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
          }`}
        >
          {cameraOn ? "🎥 Camera On" : "🚫 Camera Off"}
        </button>

        <button
          onClick={toggleMic}
          className={`px-4 py-2 rounded text-white font-medium transition-colors ${
            micOn ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
          }`}
        >
          {micOn ? "🎤 Mic On" : "🔇 Mic Off"}
        </button>

        <button
          onClick={toggleScreenShare}
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white font-medium transition-colors"
        >
          {screenSharing ? "🛑 Stop Share" : "🖥️ Share Screen"}
        </button>

      </div>

    </div>
  );
};

export default VideoCallMinimal;