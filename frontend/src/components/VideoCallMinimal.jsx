import React, { useEffect, useRef, useState, useCallback } from "react";
import socket from "../utils/socket";

// ── ICE servers ────────────────────────────────────────────────────────────────
const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    // openrelay TURN servers (public, no account needed)
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turns:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
};

const VideoCallMinimal = ({ roomId }) => {
  const localVideoRef  = useRef(null);
  const remoteVideoRef = useRef(null);

  const pcRef              = useRef(null);
  const localStreamRef     = useRef(null);
  const pendingCandidates  = useRef([]);
  const restartTimeout     = useRef(null);

  // ─── KEY FIX: track if start-call arrived before PC was ready ─────────────
  const startCallPending   = useRef(false);

  const [remoteConnected, setRemoteConnected] = useState(false);
  const [playBlocked,     setPlayBlocked]     = useState(false);
  const [cameraOn,        setCameraOn]        = useState(true);
  const [micOn,           setMicOn]           = useState(true);
  const [screenSharing,   setScreenSharing]   = useState(false);
  const [status,          setStatus]          = useState("Starting camera...");

  // ─── flush queued ICE candidates ──────────────────────────────────────────
  const flushCandidates = useCallback(async (pc) => {
    while (pendingCandidates.current.length > 0) {
      const c = pendingCandidates.current.shift();
      try { await pc.addIceCandidate(c); } catch (e) { console.warn("ICE flush err:", e); }
    }
  }, []);

  // ─── actually send the offer (called once PC is guaranteed ready) ─────────
  const createAndSendOffer = useCallback(async (pc) => {
    console.log("▶ createAndSendOffer → creating offer");
    setStatus("Connecting...");
    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(offer);
      socket.emit("offer", { roomId, offer });
    } catch (err) {
      console.error("Offer error:", err);
    }
  }, [roomId]);

  // ─── Create RTCPeerConnection ──────────────────────────────────────────────
  const createPC = useCallback((stream) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add all local tracks so both sides negotiate them
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    // Remote track handler — most bulletproof approach
    pc.ontrack = (event) => {
      console.log("🎥 Remote track received:", event.track.kind);

      if (remoteVideoRef.current && event.streams && event.streams[0]) {
        if (remoteVideoRef.current.srcObject !== event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      } else if (remoteVideoRef.current) {
        let ms = remoteVideoRef.current.srcObject;
        if (!ms) {
          ms = new MediaStream();
          remoteVideoRef.current.srcObject = ms;
        }
        if (!ms.getTracks().find((t) => t.id === event.track.id)) {
          ms.addTrack(event.track);
        }
      }

      const p = remoteVideoRef.current?.play();
      if (p !== undefined) {
        p.catch((e) => {
          if (e.name === "NotAllowedError") {
            console.error("Autoplay blocked:", e);
            setPlayBlocked(true);
          } else {
            console.warn("Play promise error:", e.name, e.message);
          }
        });
      }

      setRemoteConnected(true);
      setStatus("Connected ✅");
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", { roomId, candidate: event.candidate });
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("ICE state:", pc.iceConnectionState);
      switch (pc.iceConnectionState) {
        case "connected":
        case "completed":
          setStatus("Connected ✅");
          setRemoteConnected(true);
          clearTimeout(restartTimeout.current);
          break;
        case "disconnected":
          setStatus("Connection unstable — retrying...");
          restartTimeout.current = setTimeout(() => {
            if (pc.iceConnectionState === "disconnected") {
              console.log("Restarting ICE after disconnect timeout...");
              pc.restartIce();
            }
          }, 3000);
          break;
        case "failed":
          setStatus("Connection failed — restarting...");
          setRemoteConnected(false);
          pc.restartIce();
          break;
        case "closed":
          setStatus("Connection closed");
          setRemoteConnected(false);
          break;
        default:
          break;
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("Peer connection state:", pc.connectionState);
    };

    return pc;
  }, [roomId]);

  // ─── Main useEffect ───────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    
    // We use a mutable array in a ref to store signals that arrive before pcRef.current is ready
    const signalingQueue = useRef([]);

    // Helper to process the queue once PC is ready
    const processSignalingQueue = async (pc) => {
      while (signalingQueue.current.length > 0 && mounted) {
        const msg = signalingQueue.current.shift();
        try {
          if (msg.type === "offer") {
            console.log("📨 Processing queued offer");
            await pc.setRemoteDescription(new RTCSessionDescription(msg.payload));
            await flushCandidates(pc);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit("answer", { roomId, answer });
          } else if (msg.type === "answer") {
            console.log("📨 Processing queued answer");
            if (pc.signalingState === "have-local-offer") {
              await pc.setRemoteDescription(new RTCSessionDescription(msg.payload));
              await flushCandidates(pc);
            }
          } else if (msg.type === "candidate") {
            const ice = new RTCIceCandidate(msg.payload);
            if (pc.remoteDescription?.type) {
              await pc.addIceCandidate(ice);
            } else {
              pendingCandidates.current.push(ice);
            }
          }
        } catch (err) {
          console.error(`Error processing queued ${msg.type}:`, err);
        }
      }
    };

    // ── start-call: server tells the FIRST user to make the offer ────────────
    // Registered IMMEDIATELY (before getUserMedia) so we never miss the event.
    const handleStartCall = () => {
      if (!mounted) return;
      console.log("📣 start-call received");

      if (pcRef.current) {
        // PC already ready → send offer immediately
        createAndSendOffer(pcRef.current);
      } else {
        // PC not ready yet → flag so we send offer as soon as init() finishes
        console.log("⏳ PC not ready yet, queuing start-call...");
        startCallPending.current = true;
        setStatus("Connecting...");
      }
    };

    // ── offer: second user receives and answers ───────────────────────────────
    const handleOffer = async ({ offer }) => {
      if (!mounted) return;
      const pc = pcRef.current;
      if (!pc) {
        console.log("⏳ PC not ready yet, queuing offer...");
        signalingQueue.current.push({ type: "offer", payload: offer });
        return;
      }
      console.log("📨 Offer received → creating answer");
      setStatus("Connecting...");
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        await flushCandidates(pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("answer", { roomId, answer });
      } catch (err) {
        console.error("Answer error:", err);
      }
    };

    // ── answer: first user sets remote description ────────────────────────────
    const handleAnswer = async ({ answer }) => {
      if (!mounted) return;
      const pc = pcRef.current;
      if (!pc) {
        console.log("⏳ PC not ready yet, queuing answer...");
        signalingQueue.current.push({ type: "answer", payload: answer });
        return;
      }
      console.log("📨 Answer received");
      try {
        if (pc.signalingState === "have-local-offer") {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          await flushCandidates(pc);
        }
      } catch (err) {
        console.error("Answer set error:", err);
      }
    };

    // ── ice-candidate: queue if remote description not yet set ────────────────
    const handleIceCandidate = async ({ candidate }) => {
      if (!candidate || !mounted) return;
      const pc = pcRef.current;
      if (!pc) {
        signalingQueue.current.push({ type: "candidate", payload: candidate });
        return;
      }
      const ice = new RTCIceCandidate(candidate);
      if (pc.remoteDescription?.type) {
        try { await pc.addIceCandidate(ice); } catch (e) { console.warn("ICE err:", e); }
      } else {
        pendingCandidates.current.push(ice);
      }
    };

    // ── user-left ──────────────────────────────────────────────────────────────
    const handleUserLeft = () => {
      if (!mounted) return;
      setRemoteConnected(false);
      setStatus("Other participant left");
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    };

    // ─── Register ALL socket listeners BEFORE getUserMedia ───────────────────
    // This is the key fix: events registered synchronously, before any async work.
    socket.on("start-call",    handleStartCall);
    socket.on("offer",         handleOffer);
    socket.on("answer",        handleAnswer);
    socket.on("ice-candidate", handleIceCandidate);
    socket.on("user-left",     handleUserLeft);

    // ─── Now do async init ────────────────────────────────────────────────────
    const init = async () => {
      try {
        setStatus("Requesting camera/mic...");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });
        if (!mounted) { stream.getTracks().forEach((t) => t.stop()); return; }

        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(() => {});
        }

        const pc = createPC(stream);
        pcRef.current = pc;

        // ─── PROCESS QUEUED SIGNALS ──────────────────────────────────────────
        await processSignalingQueue(pc);

        // ─── KEY FIX: if start-call arrived while we were in getUserMedia ────
        if (startCallPending.current) {
          startCallPending.current = false;
          console.log("🔄 Flushing queued start-call now that PC is ready");
          await createAndSendOffer(pc);
        } else if (signalingQueue.current.length === 0) {
          setStatus("Waiting for other participant...");
        }
      } catch (err) {
        console.error("Media error:", err);
        setStatus("❌ Camera/Mic access denied");
        alert("Please allow camera and microphone access.");
      }
    };

    init();

    return () => {
      mounted = false;
      clearTimeout(restartTimeout.current);

      socket.off("start-call",    handleStartCall);
      socket.off("offer",         handleOffer);
      socket.off("answer",        handleAnswer);
      socket.off("ice-candidate", handleIceCandidate);
      socket.off("user-left",     handleUserLeft);
      
      // Prevent pending promises from modifying state
      signalingQueue.current = [];

      if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
    };
  }, [roomId, createPC, createAndSendOffer, flushCandidates]);

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
        const sender = pcRef.current?.getSenders().find((s) => s.track?.kind === "video");
        if (sender) await sender.replaceTrack(screenTrack);
        if (localVideoRef.current) localVideoRef.current.srcObject = screenStream;
        screenTrack.onended = stopScreenShare;
        setScreenSharing(true);
      } catch (err) { console.error("Screen share error:", err); }
    } else {
      stopScreenShare();
    }
  };

  const stopScreenShare = async () => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    const sender = pcRef.current?.getSenders().find((s) => s.track?.kind === "video");
    if (sender && videoTrack) await sender.replaceTrack(videoTrack);
    if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
    setScreenSharing(false);
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="bg-black flex flex-col h-full">
      {/* Video area */}
      <div className="flex-1 relative min-h-0">

        {/* Remote video — always rendered so srcObject assignment works */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Autoplay Blocked Overlay */}
        {playBlocked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 bg-opacity-80 z-10">
            <button
              onClick={() => {
                remoteVideoRef.current?.play().then(() => setPlayBlocked(false));
              }}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-full text-white font-bold shadow-2xl"
            >
              ▶ Click to Play Video
            </button>
            <p className="text-gray-300 mt-4 text-sm">Browser prevented auto-play</p>
          </div>
        )}

        {/* Overlay only when not connected */}
        {!remoteConnected && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-gray-900 bg-opacity-90 gap-3">
            <div className="w-10 h-10 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-300">{status}</p>
          </div>
        )}

        {/* Local video (PiP) */}
        <div className="absolute bottom-4 right-4 w-48 h-36 rounded-lg overflow-hidden border-2 border-white shadow-xl bg-gray-900">
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