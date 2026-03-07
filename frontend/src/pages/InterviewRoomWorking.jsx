import { useEffect, useRef, useState, useContext } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import VideoCallTest from '../components/VideoCallTest'

const InterviewRoomWorking = () => {
  const { roomId } = useParams()
  const { user } = useContext(AuthContext)
  const navigate = useNavigate()

  const [messages, setMessages] = useState([])
  const [messageInput, setMessageInput] = useState('')

  const handleSendMessage = () => {
    if (messageInput.trim()) {
      setMessages([...messages, {
        id: Date.now(),
        text: messageInput,
        sender: user?.name || 'User',
        timestamp: new Date().toLocaleTimeString()
      }])
      setMessageInput('')
    }
  }

  const handleBackToDashboard = () => {
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Interview Room: {roomId}
              </h1>
              <p className="text-sm text-gray-600">
                Logged in as: {user?.name || 'User'} ({user?.role})
              </p>
            </div>
            <button
              onClick={handleBackToDashboard}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Video Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden" style={{ height: '500px' }}>
              <VideoCallTest />
            </div>
          </div>

          {/* Chat Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg flex flex-col" style={{ height: '500px' }}>
              <div className="p-4 border-b">
                <h3 className="font-semibold text-gray-900 mb-2">Chat</h3>
                <p className="text-sm text-gray-600">Interview communication</p>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <p className="text-gray-500 text-center text-sm">
                    No messages yet. Start the conversation!
                  </p>
                ) : (
                  messages.map((message) => (
                    <div key={message.id} className="mb-3">
                      <div className="flex items-start space-x-2">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                          {message.sender.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="bg-gray-100 rounded-lg p-3">
                            <p className="text-sm font-medium text-gray-900">
                              {message.sender}
                            </p>
                            <p className="text-sm text-gray-700 mt-1">
                              {message.text}
                            </p>
                            <p className="text-xs text-gray-500 mt-2">
                              {message.timestamp}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              <div className="p-4 border-t">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim()}
                    className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default InterviewRoomWorking
