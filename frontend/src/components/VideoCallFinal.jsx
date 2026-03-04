import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'

const VideoCallFinal = forwardRef(({ roomId }, ref) => {
  const localVideoRef = useRef(null)
  const localStreamRef = useRef(null)

  const [cameraOn, setCameraOn] = useState(false)
  const [micOn, setMicOn] = useState(false)
  const [mediaReady, setMediaReady] = useState(false)

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
        console.log('🎥 Starting media setup...')
        
        // Request media permissions
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: true
        })

        console.log('✅ Media stream obtained:', stream)
        localStreamRef.current = stream

        // Set initial state to OFF
        stream.getVideoTracks().forEach(track => {
          track.enabled = false
          console.log('📹 Video track initialized to OFF')
        })
        stream.getAudioTracks().forEach(track => {
          track.enabled = false
          console.log('🎤 Audio track initialized to OFF')
        })

        // Attach to video element
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream
          console.log('✅ Stream attached to video element')
        }

        setMediaReady(true)
        console.log('✅ Media setup complete')

      } catch (err) {
        console.error('❌ Media setup error:', err)
        alert('Failed to access camera/microphone. Please check permissions.')
      }
    }

    startMedia()

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  // Bulletproof toggle functions
  const toggleCamera = () => {
    console.log('🎥 === CAMERA TOGGLE START ===')
    console.log('🎥 Current React state:', cameraOn)
    
    if (!localStreamRef.current) {
      console.error('❌ No local stream available')
      alert('Camera not available')
      return
    }

    const videoTracks = localStreamRef.current.getVideoTracks()
    console.log('📹 Video tracks found:', videoTracks.length)
    
    if (videoTracks.length === 0) {
      console.error('❌ No video tracks available')
      alert('No camera available')
      return
    }

    const currentState = videoTracks[0].enabled
    const newState = !currentState
    
    console.log('📹 Track state before:', currentState)
    console.log('📹 Track state after:', newState)
    
    // Toggle the track
    videoTracks[0].enabled = newState
    
    // Update React state
    setCameraOn(newState)
    
    // Verify the change
    const verifyState = videoTracks[0].enabled
    console.log('📹 Verified track state:', verifyState)
    console.log('🎥 === CAMERA TOGGLE END ===')
    
    if (verifyState === newState) {
      console.log('✅ Camera toggle successful')
    } else {
      console.error('❌ Camera toggle failed')
    }
  }

  const toggleMic = () => {
    console.log('🎤 === MICROPHONE TOGGLE START ===')
    console.log('🎤 Current React state:', micOn)
    
    if (!localStreamRef.current) {
      console.error('❌ No local stream available')
      alert('Microphone not available')
      return
    }

    const audioTracks = localStreamRef.current.getAudioTracks()
    console.log('🎤 Audio tracks found:', audioTracks.length)
    
    if (audioTracks.length === 0) {
      console.error('❌ No audio tracks available')
      alert('No microphone available')
      return
    }

    const currentState = audioTracks[0].enabled
    const newState = !currentState
    
    console.log('🎤 Track state before:', currentState)
    console.log('🎤 Track state after:', newState)
    
    // Toggle the track
    audioTracks[0].enabled = newState
    
    // Update React state
    setMicOn(newState)
    
    // Verify the change
    const verifyState = audioTracks[0].enabled
    console.log('🎤 Verified track state:', verifyState)
    console.log('🎤 === MICROPHONE TOGGLE END ===')
    
    if (verifyState === newState) {
      console.log('✅ Microphone toggle successful')
    } else {
      console.error('❌ Microphone toggle failed')
    }
  }

  return (
    <div className="bg-black rounded-lg overflow-hidden flex-1 flex flex-col">
      {/* Video Section */}
      <div className="relative w-full h-full flex">
        {/* Local Video */}
        <div className="w-full h-full">
          {!mediaReady ? (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <p className="text-white text-lg">Initializing camera...</p>
              </div>
            </div>
          ) : (
            <>
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {!cameraOn && (
                <div className="absolute inset-0 bg-black flex items-center justify-center text-white text-lg">
                  <div className="text-center">
                    <div className="text-4xl mb-2">🚫</div>
                    <p>Camera Off</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Control Buttons */}
      <div className="bg-gray-800 p-4 flex justify-center gap-6">
        {/* Camera Button */}
        <button
          type="button"
          onClick={toggleCamera}
          disabled={!mediaReady}
          className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
            cameraOn
              ? 'bg-green-500 hover:bg-green-600 text-white shadow-lg'
              : 'bg-red-500 hover:bg-red-600 text-white shadow-lg'
          } disabled:bg-gray-600 disabled:cursor-not-allowed`}
        >
          {cameraOn ? '🎥 Camera On' : '🚫 Camera Off'}
        </button>

        {/* Microphone Button */}
        <button
          type="button"
          onClick={toggleMic}
          disabled={!mediaReady}
          className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
            micOn
              ? 'bg-green-500 hover:bg-green-600 text-white shadow-lg'
              : 'bg-red-500 hover:bg-red-600 text-white shadow-lg'
          } disabled:bg-gray-600 disabled:cursor-not-allowed`}
        >
          {micOn ? '🎤 Mic On' : '🔇 Mic Off'}
        </button>
      </div>

      {/* Status Indicator */}
      <div className="bg-gray-900 px-4 py-2 text-center">
        <p className="text-xs text-gray-400">
          Status: {mediaReady ? 'Ready' : 'Loading...'} | 
          Camera: {cameraOn ? 'On' : 'Off'} | 
          Mic: {micOn ? 'On' : 'Off'}
        </p>
      </div>
    </div>
  )
})

VideoCallFinal.displayName = 'VideoCallFinal'

export default VideoCallFinal
