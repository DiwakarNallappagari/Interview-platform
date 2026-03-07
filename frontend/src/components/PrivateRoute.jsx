import React, { useContext } from 'react'
import { Navigate } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useContext(AuthContext)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return isAuthenticated ? children : <Navigate to="/login" />
}

export default PrivateRoute