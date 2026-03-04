import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'

const VideoCallToggle = forwardRef(({ roomId }, ref) => {
  const localVideoRef = useRef(null)
  const localStreamRef = useRef(null)

  const [cameraOn, setCameraOn] = useState(false)
  const [micOn, setMicOn] = useState(false)

  useImperativeHandle(ref, () => ({
    stopConnection: () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop())
      }
    },
  }))

  useEffect(() => {
    const startMedia = async () => {
      try {
        console.log('🎥 Requesting media devices...')
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        })

        console.log('✅ Media stream obtained')
        localStreamRef.current = stream

        // Start with tracks OFF (match React state)
        stream.getVideoTracks().forEach(track => {
          track.enabled = false
        })
        stream.getAudioTracks().forEach(track => {
          track.enabled = false
        })

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream
        }

        console.log('✅ Media setup complete')
      } catch (err) {
        console.error('❌ Error accessing media devices:', err)
      }
    }

    startMedia()

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  // Simple, direct toggle functions
  const toggleCamera = () => {
    console.log('🎥 Camera toggle clicked, current state:', cameraOn)
    
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks()
      if (videoTracks.length > 0) {
        const newState = !cameraOn
        videoTracks[0].enabled = newState
        setCameraOn(newState)
        console.log('✅ Camera toggled to:', newState ? 'ON' : 'OFF')
      } else {
        console.error('❌ No video tracks found')
      }
    } else {
      console.error('❌ No local stream')
    }
  }

  const toggleMic = () => {
    console.log('🎤 Mic toggle clicked, current state:', micOn)
    
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks()
      if (audioTracks.length > 0) {
        const newState = !micOn
        audioTracks[0].enabled = newState
        setMicOn(newState)
        console.log('✅ Mic toggled to:', newState ? 'ON' : 'OFF')
      } else {
        console.error('❌ No audio tracks found')
      }
    } else {
      console.error('❌ No local stream')
    }
  }

  return (
    <div className="bg-black rounded-lg overflow-hidden flex-1 flex flex-col">
      {/* Video Section */}
      <div className="relative w-full h-full flex">
        {/* Local Video Only */}
        <div className="w-full h-full">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />

          {!cameraOn && (
            <div className="absolute inset-0 bg-black flex items-center justify-center text-white text-lg">
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

VideoCallToggle.displayName = 'VideoCallToggle'

export default VideoCallToggle
