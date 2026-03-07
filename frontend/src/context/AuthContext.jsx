import React, { createContext, useState, useEffect } from 'react'
import API from '../utils/api'

export const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')

    if (token && userData) {
      setUser(JSON.parse(userData))
      setIsAuthenticated(true)
      API.defaults.headers.common['Authorization'] = `Bearer ${token}`
    }

    setLoading(false)
  }, [])

  const login = async (email, password) => {
    const { data } = await API.post('/auth/login', { email, password })

    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))

    setUser(data.user)
    setIsAuthenticated(true)

    API.defaults.headers.common['Authorization'] = `Bearer ${data.token}`

    return data
  }

  const register = async (name, email, password, role) => {
    const { data } = await API.post('/auth/register', {
      name,
      email,
      password,
      role,
    })

    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))

    setUser(data.user)
    setIsAuthenticated(true)

    API.defaults.headers.common['Authorization'] = `Bearer ${data.token}`

    return data
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')

    setUser(null)
    setIsAuthenticated(false)

    delete API.defaults.headers.common['Authorization']
  }

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}