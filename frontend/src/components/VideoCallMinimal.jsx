import { useEffect, useRef, useState } from "react";
import Peer from "simple-peer";
import socket from "../utils/socket";

const VideoCallMinimal = ({ roomId }) => {

  const [peers, setPeers] = useState([]);
  const userVideo = useRef();
  const peersRef = useRef([]);
  const streamRef = useRef();

  useEffect(() => {

    navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    }).then(stream => {

      streamRef.current = stream;

      if (userVideo.current) {
        userVideo.current.srcObject = stream;
      }

      socket.emit("join-room", {
        roomId,
        userId: socket.id,
        userName: "Guest"
      });

      socket.on("existing-users", users => {

        const peers = [];

        users.forEach(userID => {

          const peer = createPeer(userID, socket.id, stream);

          peersRef.current.push({
            peerID: userID,
            peer
          });

          peers.push(peer);

        });

        setPeers(peers);

      });

      socket.on("user-joined", payload => {

        const peer = addPeer(payload.socketId, stream);

        peersRef.current.push({
          peerID: payload.socketId,
          peer
        });

        setPeers(prev => [...prev, peer]);

      });

      socket.on("offer", payload => {

        const item = peersRef.current.find(p => p.peerID === payload.from);

        if (item) {
          item.peer.signal(payload.offer);
        }

      });

      socket.on("answer", payload => {

        const item = peersRef.current.find(p => p.peerID === payload.from);

        if (item) {
          item.peer.signal(payload.answer);
        }

      });

      socket.on("ice-candidate", payload => {

        const item = peersRef.current.find(p => p.peerID === payload.from);

        if (item) {
          item.peer.signal(payload.candidate);
        }

      });

    });

  }, [roomId]);

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

      <video
        muted
        ref={userVideo}
        autoPlay
        playsInline
        className="rounded bg-black"
      />

      {peers.map((peer, index) => (
        <Video key={index} peer={peer} />
      ))}

    </div>

  );

};

const Video = ({ peer }) => {

  const ref = useRef();

  useEffect(() => {

    peer.on("stream", stream => {
      ref.current.srcObject = stream;
    });

  }, []);

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