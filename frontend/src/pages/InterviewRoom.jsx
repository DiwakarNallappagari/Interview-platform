import { useEffect, useRef, useState, useContext } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import CodeEditor from '../components/CodeEditor'
import VideoCall from '../components/VideoCallMinimal'
import Timer from '../components/Timer'
import RatingPanel from '../components/RatingPanel'
import  socket  from '../utils/socket'
import API from '../utils/api'

const InterviewRoom = () => {
  const { roomId } = useParams()
  const { user } = useContext(AuthContext)
  const navigate = useNavigate()
  const [roomUsers, setRoomUsers] = useState([])
  const [showRating, setShowRating] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [copied, setCopied] = useState({ localhost: false, public: false })
  const [ngrokUrl, setNgrokUrl] = useState(localStorage.getItem('ngrokUrl') || '')
  const videoCallRef = useRef(null)
  const timerRef = useRef(null)

  // Invite link: use current page URL so it works when shared (localhost or ngrok)
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : ''
  const inviteLink = `${currentOrigin}/room/${roomId}`
  const localhostLink = `http://localhost:5173/room/${roomId}`
  const publicLink = ngrokUrl ? `${ngrokUrl.replace(/\/$/, '')}/room/${roomId}` : inviteLink

  const [roomError, setRoomError] = useState(null)
  const [roomLoading, setRoomLoading] = useState(true)
  const [roomData, setRoomData] = useState(null)

  // Fetch room data first
  useEffect(() => {
    const fetchRoom = async () => {
      if (!user || !roomId) return
      
      try {
        const { data } = await API.get(`/interviews/room/${roomId}`)
        setRoomData(data)
        setRoomError(null)
      } catch (err) {
        console.error('Failed to fetch room:', err)
        setRoomError(err.response?.data?.message || 'Room not found or access denied')
        setRoomLoading(false)
      }
    }
    
    fetchRoom()
  }, [roomId, user])

  useEffect(() => {
    if (!user || !roomId) {
      setRoomLoading(false)
      return
    }

    // Check socket connection
    if (!socket.connected) {
      console.log('Socket not connected, attempting to connect...')
      socket.connect()
    }

    // Wait for socket to connect before joining room
    const handleConnect = () => {
      console.log('Socket connected, joining room...')
      socket.emit('join-room', { roomId, userId: user._id, userName: user.name })
      setRoomLoading(false)
    }

    const handleConnectError = (error) => {
      console.error('Socket connection error:', error)
      setRoomError('Failed to connect to server. Please refresh the page.')
      setRoomLoading(false)
    }

    socket.on('connect', handleConnect)
    socket.on('connect_error', handleConnectError)

    // If already connected, join immediately
    if (socket.connected) {
      socket.emit('join-room', { roomId, userId: user._id, userName: user.name })
      setRoomLoading(false)
    }

    socket.on('room-joined', (data) => {
      console.log('Room joined:', data)
      setRoomUsers(data.users)
      setRoomError(null)
    })

    socket.on('user-joined', (data) => {
      console.log('User joined:', data)
      setRoomUsers(data.users)
    })

    socket.on('user-left', (data) => {
      console.log('User left:', data)
      setRoomUsers(data.users)
    })

    // Listen for interview-ended event from backend
    socket.on('interview-ended', () => {
      stopEverything()
      navigate('/dashboard')
    })

    return () => {
      socket.off('connect', handleConnect)
      socket.off('connect_error', handleConnectError)
      socket.off('room-joined')
      socket.off('user-joined')
      socket.off('user-left')
      socket.off('interview-ended')
    }
  }, [roomId, user, navigate])

  const stopEverything = () => {
    console.log('Stopping everything...')
    
    // Stop video call (camera, mic, peer connection)
    if (videoCallRef.current) {
      videoCallRef.current.stopConnection()
    }

    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    // Disconnect socket after a short delay
    setTimeout(() => {
      socket.disconnect()
    }, 500)
  }

  const handleEndInterview = () => {
    if (user?.role === 'interviewer') {
      socket.emit('end-interview', { roomId })
      setShowRating(true)
    }
  }

  const handleCopyLink = (link, type) => {
    navigator.clipboard.writeText(link)
    setCopied({ ...copied, [type]: true })
    setTimeout(() => setCopied({ ...copied, [type]: false }), 2000)
  }

  const handleSaveNgrokUrl = (url) => {
    setNgrokUrl(url)
    localStorage.setItem('ngrokUrl', url)
  }

  if (roomLoading) {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading room...</p>
        </div>
      </div>
    )
  }

  if (roomError) {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-red-900 border border-red-700 rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-bold text-white mb-2">Error</h2>
          <p className="text-red-200 mb-4">{roomError}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Interview Room</h1>
          <p className="text-sm text-gray-400">Room ID: {roomId}</p>
        </div>
        <div className="flex items-center gap-4">
          <Timer />
          <div className="text-sm">
            <p className="font-semibold">{roomUsers.length} participant(s)</p>
            {roomUsers.map((u) => (
              <span key={u.userId} className="block text-gray-400">
                {u.userName}
              </span>
            ))}
          </div>
          {user?.role === 'interviewer' && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowInviteModal(true)}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded transition"
              >
                Invite Candidate
              </button>
              <button
                onClick={handleEndInterview}
                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded transition"
              >
                End Interview
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        {/* Video Section */}
        <div className="flex-1 flex flex-col gap-4">
          <VideoCall roomId={roomId} ref={videoCallRef} />
        </div>

        {/* Code Editor Section */}
        <div className="flex-1 flex flex-col gap-4">
          <CodeEditor roomId={roomId} />
        </div>
      </div>

      {/* Invite Modal - link always matches current URL so it works when shared */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto py-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-xl w-full mx-4 my-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">📨 Invite Candidate</h2>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <h3 className="font-bold text-green-800 mb-2">🔗 Invite link (works from your current URL)</h3>
              <p className="text-xs text-green-700 mb-2">
                Share this link. It uses the same address you have in the browser, so it works for anyone you send it to.
              </p>
              <div className="flex gap-2 items-center">
                <code className="flex-1 bg-white border border-green-300 p-3 rounded text-sm break-all font-mono">{inviteLink}</code>
                <button
                  onClick={() => handleCopyLink(inviteLink, 'public')}
                  className={`px-4 py-2 rounded text-sm font-semibold transition whitespace-nowrap ${
                    copied.public ? 'bg-green-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'
                  }`}
                >
                  {copied.public ? '✓ Copied!' : 'Copy Link'}
                </button>
              </div>
            </div>

            {/* Optional: custom URL for ngrok if different from current */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
              <h3 className="font-bold text-gray-700 mb-2 text-sm">Optional: Different public URL (e.g. ngrok)</h3>
              <p className="text-xs text-gray-600 mb-2">If you use ngrok, paste that base URL here to show a second link.</p>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={ngrokUrl}
                  onChange={(e) => handleSaveNgrokUrl(e.target.value)}
                  placeholder="https://xxxx.ngrok-free.app"
                  className="flex-1 bg-white border border-gray-300 p-2 rounded text-sm"
                />
              </div>
              {ngrokUrl && (
                <div className="flex gap-2 items-center mt-2">
                  <code className="flex-1 bg-white border p-2 rounded text-xs break-all">{publicLink}</code>
                  <button
                    onClick={() => handleCopyLink(publicLink, 'localhost')}
                    className="px-3 py-1 rounded text-sm bg-gray-500 text-white hover:bg-gray-600"
                  >
                    Copy
                  </button>
                </div>
              )}
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
              <h4 className="font-semibold text-gray-700 text-sm mb-2">📝 Candidate:</h4>
              <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
                <li>Open the link you shared</li>
                <li>Register or Login as <strong>Candidate</strong></li>
                <li>Allow camera & microphone when asked</li>
              </ol>
            </div>

            <button
              onClick={() => setShowInviteModal(false)}
              className="w-full bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Rating Panel */}
      {showRating && user?.role === 'interviewer' && (
        <RatingPanel roomId={roomId} onClose={() => setShowRating(false)} />
      )}
    </div>
  )
}

export default InterviewRoom
