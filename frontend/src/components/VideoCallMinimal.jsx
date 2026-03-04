import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'

const VideoCallMinimal = forwardRef(({ roomId }, ref) => {
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const peerConnectionRef = useRef(null)
  const localStreamRef = useRef(null)

  const [remoteStream, setRemoteStream] = useState(null)
  const [cameraOn, setCameraOn] = useState(false)
  const [micOn, setMicOn] = useState(false)

  useImperativeHandle(ref, () => ({
    stopConnection: () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close()
      }
    },
  }))

  useEffect(() => {
    const startMedia = async () => {
      try {
        console.log('🎥 Requesting media devices...')
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        })

        console.log('✅ Media stream obtained:', stream)
        localStreamRef.current = stream

        // Set tracks to OFF initially
        stream.getVideoTracks().forEach(track => {
          track.enabled = false
        })
        stream.getAudioTracks().forEach(track => {
          track.enabled = false
        })

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream
        }

        // Simple peer connection setup
        const peerConnection = new RTCPeerConnection({
          iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }],
        })

        peerConnectionRef.current = peerConnection

        stream.getTracks().forEach((track) => {
          peerConnection.addTrack(track, stream)
        })

        peerConnection.ontrack = (evt) => {
          setRemoteStream(evt.streams[0])
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = evt.streams[0]
          }
        }

        console.log('✅ Peer connection initialized')
      } catch (err) {
        console.error('❌ Error accessing media devices:', err)
      }
    }

    startMedia()

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Simple toggle functions
  const toggleCamera = () => {
    const newState = !cameraOn
    console.log(`🎥 Camera toggle: ${cameraOn} -> ${newState}`)
    
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks()
      videoTracks.forEach(track => {
        track.enabled = newState
      })
    }
    
    setCameraOn(newState)
  }

  const toggleMic = () => {
    const newState = !micOn
    console.log(`🎤 Mic toggle: ${micOn} -> ${newState}`)
    
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks()
      audioTracks.forEach(track => {
        track.enabled = newState
      })
    }
    
    setMicOn(newState)
  }

  return (
    <div className="bg-black rounded-lg overflow-hidden flex-1 flex flex-col">
      {/* Video Section */}
      <div className="relative w-full h-full flex">
        {/* Remote Video */}
        <div className="w-full h-full">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          {!remoteStream && (
            <div className="w-full h-full flex items-center justify-center">
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

      {/* Control Buttons */}
      <div className="bg-gray-800 p-4 flex justify-center gap-6">
        {/* Camera Button */}
        <button
          type="button"
          onClick={toggleCamera}
          className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
            cameraOn
              ? 'bg-green-500 hover:bg-green-600 text-white shadow-lg'
              : 'bg-red-500 hover:bg-red-600 text-white shadow-lg'
          }`}
        >
          {cameraOn ? '🎥 Camera On' : '🚫 Camera Off'}
        </button>

        {/* Microphone Button */}
        <button
          type="button"
          onClick={toggleMic}
          className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
            micOn
              ? 'bg-green-500 hover:bg-green-600 text-white shadow-lg'
              : 'bg-red-500 hover:bg-red-600 text-white shadow-lg'
          }`}
        >
          {micOn ? '🎤 Mic On' : '🔇 Mic Off'}
        </button>
      </div>
    </div>
  )
})

VideoCallMinimal.displayName = 'VideoCallMinimal'

export default VideoCallMinimal
