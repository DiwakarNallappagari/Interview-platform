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
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    }
  }));

  useEffect(() => {
    const startMedia = async () => {
      try {
        console.log("Requesting camera and mic...");

        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });

        localStreamRef.current = stream;

        // enable tracks
        stream.getVideoTracks().forEach(track => (track.enabled = true));
        stream.getAudioTracks().forEach(track => (track.enabled = true));

        setCameraOn(true);
        setMicOn(true);

        // attach stream to local video
        const video = localVideoRef.current;
        if (video) {
          video.srcObject = stream;
          video.muted = true;
          video.autoplay = true;
          video.playsInline = true;

          video.onloadedmetadata = () => {
            video.play().catch(() => {});
          };
        }

        const peerConnection = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
        });

        peerConnectionRef.current = peerConnection;

        stream.getTracks().forEach(track => {
          peerConnection.addTrack(track, stream);
        });

        peerConnection.ontrack = event => {
          setRemoteStream(event.streams[0]);

          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        };

      } catch (error) {
        console.error("Camera/Mic error:", error);
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

  const toggleCamera = () => {
    if (!localStreamRef.current) return;

    const newState = !cameraOn;
    const track = localStreamRef.current.getVideoTracks()[0];

    if (track) track.enabled = newState;
    setCameraOn(newState);
  };

  const toggleMic = () => {
    if (!localStreamRef.current) return;

    const newState = !micOn;
    const track = localStreamRef.current.getAudioTracks()[0];

    if (track) track.enabled = newState;
    setMicOn(newState);
  };

  return (
    <div className="bg-black rounded-lg overflow-hidden flex-1 flex flex-col">

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
            <div className="absolute inset-0 flex items-center justify-center">
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
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />

          {!cameraOn && (
            <div className="absolute inset-0 flex items-center justify-center text-white text-sm">
              Camera Off
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gray-800 p-4 flex justify-center gap-6">

        <button
          onClick={toggleCamera}
          className={`px-6 py-3 rounded-xl font-semibold ${
            cameraOn
              ? "bg-green-500 hover:bg-green-600 text-white"
              : "bg-red-500 hover:bg-red-600 text-white"
          }`}
        >
          {cameraOn ? "Camera On" : "Camera Off"}
        </button>

        <button
          onClick={toggleMic}
          className={`px-6 py-3 rounded-xl font-semibold ${
            micOn
              ? "bg-green-500 hover:bg-green-600 text-white"
              : "bg-red-500 hover:bg-red-600 text-white"
          }`}
        >
          {micOn ? "Mic On" : "Mic Off"}
        </button>

      </div>
    </div>
  );
});

VideoCallMinimal.displayName = "VideoCallMinimal";

export default VideoCallMinimal;