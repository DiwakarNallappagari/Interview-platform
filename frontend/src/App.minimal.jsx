import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'

// Simple components that will definitely work
const Login = () => (
  <div style={{ padding: '20px', textAlign: 'center' }}>
    <h2>Login Page</h2>
    <p style={{ color: '#666' }}>Login functionality would go here</p>
  </div>
)

const Register = () => (
  <div style={{ padding: '20px', textAlign: 'center' }}>
    <h2>Register Page</h2>
    <p style={{ color: '#666' }}>Register functionality would go here</p>
  </div>
)

const Dashboard = () => (
  <div style={{ padding: '20px' }}>
    <h1>Dashboard</h1>
    <p>Welcome to the interview platform!</p>
    <button 
      onClick={() => window.location.href = '/create-room'}
      style={{ 
        padding: '10px 20px', 
        backgroundColor: '#3b82f6', 
        color: 'white', 
        border: 'none', 
        borderRadius: '4px',
        cursor: 'pointer',
        marginRight: '10px'
      }}
    >
      Create Room
    </button>
    <button 
      onClick={() => window.location.href = '/room/test123'}
      style={{ 
        padding: '10px 20px', 
        backgroundColor: '#10b981', 
        color: 'white', 
        border: 'none', 
        borderRadius: '4px',
        cursor: 'pointer'
      }}
    >
      Test Room
    </button>
  </div>
)

const CreateRoom = () => (
  <div style={{ padding: '20px', textAlign: 'center' }}>
    <h2>Create Room</h2>
    <p>Room creation form would go here</p>
    <button 
      onClick={() => window.location.href = '/dashboard'}
      style={{ 
        padding: '10px 20px', 
        backgroundColor: '#6b7280', 
        color: 'white', 
        border: 'none', 
        borderRadius: '4px',
        cursor: 'pointer'
      }}
    >
      Back to Dashboard
    </button>
  </div>
)

const InterviewRoom = () => {
  const roomId = window.location.pathname.split('/').pop()
  
  return (
    <div style={{ padding: '20px' }}>
      <h1>Interview Room: {roomId}</h1>
      <p>This is a working interview room!</p>
      <div style={{ 
        marginTop: '20px', 
        padding: '20px', 
        backgroundColor: '#f3f4f6', 
        borderRadius: '8px' 
      }}>
        <h3>Room Features:</h3>
        <ul>
          <li>✅ Room ID: {roomId}</li>
          <li>✅ Page loads successfully</li>
          <li>✅ Basic styling working</li>
          <li>✅ Navigation functional</li>
        </ul>
      </div>
      <button 
        onClick={() => window.location.href = '/dashboard'}
        style={{ 
          marginTop: '20px',
          padding: '10px 20px', 
          backgroundColor: '#ef4444', 
          color: 'white', 
          border: 'none', 
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        ← Back to Dashboard
      </button>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/create-room" element={<CreateRoom />} />
          <Route path="/room/:roomId" element={<InterviewRoom />} />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
