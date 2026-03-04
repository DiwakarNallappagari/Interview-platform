import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";

const VideoCallMinimal = forwardRef(({ roomId }, ref) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);

  const [remoteStream, setRemoteStream] = useState(null);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);

  useImperativeHandle(ref, () => ({
    stopConnection: () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    },
  }));

  useEffect(() => {
    const startMedia = async () => {
      try {
        console.log("🎥 Requesting media devices...");

        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        console.log("✅ Media stream obtained");

        localStreamRef.current = stream;

        // turn camera and mic ON initially
        stream.getVideoTracks().forEach(track => track.enabled = true);
        stream.getAudioTracks().forEach(track => track.enabled = true);

        setCameraOn(true);
        setMicOn(true);

        // show local preview
        if (localVideoRef.current) {
          const video = localVideoRef.current;
          video.srcObject = stream;
          video.muted = true;
          video.playsInline = true;

          video.onloadedmetadata = () => {
            video.play().catch(() => {});
          };
        }

        // create peer connection
        const peerConnection = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });

        peerConnectionRef.current = peerConnection;

        stream.getTracks().forEach(track => {
          peerConnection.addTrack(track, stream);
        });

        peerConnection.ontrack = (event) => {
          console.log("📡 Remote stream received");
          setRemoteStream(event.streams[0]);

          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        };

      } catch (err) {
        console.error("❌ Camera/Mic error:", err);
      }
    };

    startMedia();

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }

      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, []);

  // camera toggle
  const toggleCamera = () => {
    if (!localStreamRef.current) return;

    const newState = !cameraOn;

    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (videoTrack) videoTrack.enabled = newState;

    setCameraOn(newState);
  };

  // mic toggle
  const toggleMic = () => {
    if (!localStreamRef.current) return;

    const newState = !micOn;

    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) audioTrack.enabled = newState;

    setMicOn(newState);
  };

  return (
    <div className="bg-black rounded-lg overflow-hidden flex-1 flex flex-col">

      {/* Video Area */}
      <div className="relative w-full h-full flex">

        {/* Remote Video */}
        <div className="w-full h-full relative">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />

          {!remoteStream && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-white text-lg">
                Waiting for other participant...
              </p>
            </div>
          )}
        </div>

        {/* Local Video */}
        <div className="absolute bottom-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden border-2 border-white">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />

          {!cameraOn && (
            <div className="absolute inset-0 bg-black flex items-center justify-center text-white text-sm">
              Camera Off
            </div>
          )}
        </div>

      </div>

      {/* Controls */}
      <div className="bg-gray-800 p-4 flex justify-center gap-6">

        {/* Camera */}
        <button
          onClick={toggleCamera}
          className={`px-6 py-3 rounded-xl font-semibold ${
            cameraOn
              ? "bg-green-500 hover:bg-green-600 text-white"
              : "bg-red-500 hover:bg-red-600 text-white"
          }`}
        >
          {cameraOn ? "🎥 Camera On" : "🚫 Camera Off"}
        </button>

        {/* Mic */}
        <button
          onClick={toggleMic}
          className={`px-6 py-3 rounded-xl font-semibold ${
            micOn
              ? "bg-green-500 hover:bg-green-600 text-white"
              : "bg-red-500 hover:bg-red-600 text-white"
          }`}
        >
          {micOn ? "🎤 Mic On" : "🔇 Mic Off"}
        </button>

      </div>

    </div>
  );
});

VideoCallMinimal.displayName = "VideoCallMinimal";

export default VideoCallMinimal;