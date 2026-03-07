import { useParams } from 'react-router-dom'
import VideoCallTest from '../components/VideoCallTest'

const TestRoom = () => {
  const { roomId } = useParams()

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Interview Room: {roomId}
          </h1>
          <p className="text-gray-600">
            This is a test room to check if video functionality works.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6" style={{ height: '500px' }}>
          <VideoCallTest />
        </div>
      </div>
    </div>
  )
}

export default TestRoom
