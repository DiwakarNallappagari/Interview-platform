import io from 'socket.io-client'

// Get socket URL - for ngrok we need backend URL, for localhost use current origin
const getSocketURL = () => {
  // Check if we have a custom backend URL set (for ngrok/local tunnel)
  const customBackendUrl = localStorage.getItem('backendUrl')
  if (customBackendUrl) {
    return customBackendUrl
  }
  
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL
  }
  
  // Check if we're on ngrok
  const isNgrok = window.location.hostname.includes('ngrok') || 
                  window.location.hostname.includes('loca.lt')
  
  if (isNgrok) {
    // If on ngrok, we need backend URL - try to use localtunnel or expose backend separately
    // For now, try using the same origin (won't work, but will show error)
    console.warn('Socket.io needs backend URL when using ngrok. Please expose backend separately.')
    return window.location.origin
  }
  
  // For localhost, use current origin
  return window.location.origin
}

export const socket = io(getSocketURL(), {
  autoConnect: true,
  reconnection: true,
  transports: ['polling', 'websocket'], // Try polling first for better compatibility
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
})

// Log connection status
socket.on('connect', () => {
  console.log('✅ Socket.io connected:', socket.id)
})

socket.on('disconnect', () => {
  console.log('❌ Socket.io disconnected')
})

socket.on('connect_error', (error) => {
  console.error('❌ Socket.io connection error:', error.message)
  console.log('💡 Tip: Expose backend on separate tunnel and set backendUrl in localStorage')
})
