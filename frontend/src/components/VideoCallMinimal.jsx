import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";

const VideoCallMinimal = forwardRef(({ roomId }, ref) => {

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);

  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [remoteStream, setRemoteStream] = useState(null);

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

        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });

        localStreamRef.current = stream;

        const video = localVideoRef.current;

        if (video) {
          video.srcObject = stream;
          video.muted = true;
          await video.play();
        }

        // Start tracks OFF
        stream.getVideoTracks().forEach(track => track.enabled = false);
        stream.getAudioTracks().forEach(track => track.enabled = false);

        setCameraOn(false);
        setMicOn(false);

        // Create peer connection
        const peerConnection = new RTCPeerConnection({
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" }
          ]
        });

        peerConnectionRef.current = peerConnection;

        // Add tracks
        stream.getTracks().forEach(track => {
          peerConnection.addTrack(track, stream);
        });

        // Receive remote stream
        peerConnection.ontrack = (event) => {

          const stream = event.streams[0];

          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = stream;
            remoteVideoRef.current.play().catch(()=>{});
          }

          setRemoteStream(stream);
        };

      } catch (err) {
        console.error("Camera error:", err);
      }

    };

    startMedia();

  }, []);


  const toggleCamera = () => {

    if (!localStreamRef.current) return;

    const track = localStreamRef.current.getVideoTracks()[0];

    track.enabled = !track.enabled;

    setCameraOn(track.enabled);

  };


  const toggleMic = () => {

    if (!localStreamRef.current) return;

    const track = localStreamRef.current.getAudioTracks()[0];

    track.enabled = !track.enabled;

    setMicOn(track.enabled);

  };


  return (

    <div className="bg-black flex flex-col h-full">

      <div className="flex-1 relative">

        {/* Remote video */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />

        {!remoteStream && (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            Waiting for other participant...
          </div>
        )}

        {/* Local video */}
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

      </div>

    </div>

  );

});

VideoCallMinimal.displayName = "VideoCallMinimal";

export default VideoCallMinimal;