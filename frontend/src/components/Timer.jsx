import { useEffect, useState } from 'react'
import  socket  from '../utils/socket'

const Timer = () => {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1)
    }, 1000)

    socket.on('reset-timer', () => {
      setSeconds(0)
    })

    return () => {
      clearInterval(interval)
      socket.off('reset-timer')
    }
  }, [])

  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60

    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="bg-gray-700 px-4 py-2 rounded-lg font-mono text-lg font-bold text-white">
      ⏱️ {formatTime(seconds)}
    </div>
  )
}

export default Timer
