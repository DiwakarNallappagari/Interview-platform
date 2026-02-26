import axios from 'axios'

// Use relative URL for API (works through vite proxy)
// If accessed via ngrok, use /api which will proxy to backend
// If localhost, use /api which proxies to localhost:5000
const getBaseURL = () => {
  // Check if we have a custom backend URL set (for ngrok/local tunnel)
  const customBackendUrl = localStorage.getItem('backendUrl')
  if (customBackendUrl) {
    return `${customBackendUrl}/api`
  }
  
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }
  
  // Check current origin and adjust accordingly
  const currentOrigin = window.location.origin
  console.log('Current origin:', currentOrigin)
  
  // If using browser preview or different host, use direct connection
  if (currentOrigin.includes('127.0.0.1') || !currentOrigin.includes('localhost:5173')) {
    console.log('Using direct backend connection')
    return 'http://localhost:5000/api'
  }
  
  // Default for localhost:5173
  return 'http://localhost:5000/api'
}

const API = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add token to requests
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle response errors
API.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log error for debugging
    console.error('API Error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
      baseURL: error.config?.baseURL
    })
    
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default API
