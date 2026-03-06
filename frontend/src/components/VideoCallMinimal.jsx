import { useEffect, useRef, useState } from "react";
import Peer from "simple-peer";
import socket from "../utils/socket";

const VideoCallMinimal = ({ roomId }) => {

  const [peers, setPeers] = useState([]);
  const userVideo = useRef(null);
  const peersRef = useRef([]);
  const streamRef = useRef(null);

  useEffect(() => {

    let mounted = true;

    const startMedia = async () => {

      try {

        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });

        if (!mounted) return;

        streamRef.current = stream;

        if (userVideo.current) {
          userVideo.current.srcObject = stream;
        }

        socket.emit("join-room", {
          roomId,
          userId: socket.id,
          userName: "Guest"
        });

      } catch (err) {
        console.error("Camera/Mic error:", err);
      }

    };

    startMedia();


    // ==============================
    // Existing users already in room
    // ==============================
    const handleExistingUsers = (users) => {

      const peersArray = [];

      users.forEach(userID => {

        const peer = createPeer(userID, socket.id, streamRef.current);

        peersRef.current.push({
          peerID: userID,
          peer
        });

        peersArray.push(peer);

      });

      setPeers(peersArray);

    };


    // ==============================
    // New user joined
    // ==============================
    const handleUserJoined = (payload) => {

      const peer = addPeer(payload.socketId, streamRef.current);

      peersRef.current.push({
        peerID: payload.socketId,
        peer
      });

      setPeers(prev => [...prev, peer]);

    };


    // ==============================
    // Receive WebRTC signals
    // ==============================
    const handleOffer = (payload) => {

      const item = peersRef.current.find(p => p.peerID === payload.from);

      if (item) item.peer.signal(payload.offer);

    };

    const handleAnswer = (payload) => {

      const item = peersRef.current.find(p => p.peerID === payload.from);

      if (item) item.peer.signal(payload.answer);

    };

    const handleIceCandidate = (payload) => {

      const item = peersRef.current.find(p => p.peerID === payload.from);

      if (item) item.peer.signal(payload.candidate);

    };


    socket.on("existing-users", handleExistingUsers);
    socket.on("user-joined", handleUserJoined);
    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("ice-candidate", handleIceCandidate);


    return () => {

      mounted = false;

      socket.off("existing-users", handleExistingUsers);
      socket.off("user-joined", handleUserJoined);
      socket.off("offer", handleOffer);
      socket.off("answer", handleAnswer);
      socket.off("ice-candidate", handleIceCandidate);

      const peers = peersRef.current;

      peers.forEach(p => {
        if (p.peer) p.peer.destroy();
      });

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

    };

  }, [roomId]);



  // ==============================
  // Create peer (initiator)
  // ==============================
  function createPeer(userToSignal, callerID, stream) {

    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream
    });

    peer.on("signal", signal => {

      socket.emit("offer", {
        targetSocketId: userToSignal,
        offer: signal
      });

    });

    return peer;

  }



  // ==============================
  // Add peer (receiver)
  // ==============================
  function addPeer(incomingID, stream) {

    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream
    });

    peer.on("signal", signal => {

      socket.emit("answer", {
        targetSocketId: incomingID,
        answer: signal
      });

    });

    return peer;

  }



  return (

    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4">

      {/* Local video */}
      <video
        muted
        ref={userVideo}
        autoPlay
        playsInline
        className="rounded bg-black"
      />

      {/* Remote videos */}
      {peers.map((peer, index) => (
        <Video key={index} peer={peer} />
      ))}

    </div>

  );

};



const Video = ({ peer }) => {

  const ref = useRef(null);

  useEffect(() => {

    if (!peer) return;

    peer.on("stream", stream => {

      if (ref.current) {
        ref.current.srcObject = stream;
      }

    });

  }, [peer]);

  return (
    <video
      playsInline
      autoPlay
      ref={ref}
      className="rounded bg-black"
    />
  );

};


export default VideoCallMinimal;