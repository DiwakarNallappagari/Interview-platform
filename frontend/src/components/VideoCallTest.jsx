import { useEffect, useRef, useState } from 'react'

const VideoCallTest = () => {
  const localVideoRef = useRef(null)
  const localStreamRef = useRef(null)

  const [cameraOn, setCameraOn] = useState(false)
  const [micOn, setMicOn] = useState(false)

  useEffect(() => {
    const startMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        })

        localStreamRef.current = stream

        // Start with tracks OFF
        stream.getVideoTracks().forEach(track => {
          track.enabled = false
        })
        stream.getAudioTracks().forEach(track => {
          track.enabled = false
        })

        const video = localVideoRef.current
        if (video) {
          video.srcObject = stream
          video.muted = true
          await video.play()
        }

        setCameraOn(false)
        setMicOn(false)

      } catch (err) {
        console.error('Media setup error:', err)
      }
    }

    startMedia()

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const toggleCamera = () => {
    if (!localStreamRef.current) return
    
    const track = localStreamRef.current.getVideoTracks()[0]
    if (track) {
      track.enabled = !track.enabled
      setCameraOn(track.enabled)
    }
  }

  const toggleMic = () => {
    if (!localStreamRef.current) return
    
    const track = localStreamRef.current.getAudioTracks()[0]
    if (track) {
      track.enabled = !track.enabled
      setMicOn(track.enabled)
    }
  }

  return (
    <div className="bg-black rounded-lg overflow-hidden flex flex-col h-full">
      <div className="flex-1 relative">
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
        />
        
        {!cameraOn && (
          <div className="absolute inset-0 bg-black flex items-center justify-center text-white text-lg">
            Camera Off
          </div>
        )}
      </div>

      <div className="bg-gray-800 p-4 flex gap-4 justify-center">
        <button
          onClick={toggleCamera}
          className={`${cameraOn ? 'bg-green-500' : 'bg-red-500'} text-white px-6 py-2 rounded`}
        >
          {cameraOn ? 'Camera On' : 'Camera Off'}
        </button>

        <button
          onClick={toggleMic}
          className={`${micOn ? 'bg-green-500' : 'bg-red-500'} text-white px-6 py-2 rounded`}
        >
          {micOn ? 'Mic On' : 'Mic Off'}
        </button>
      </div>
    </div>
  )
}

export default VideoCallTest
