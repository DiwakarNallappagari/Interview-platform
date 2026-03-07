import React, { useState, useContext } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { login } = useContext(AuthContext)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
          
          <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">
            Login
          </h2>

          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your email"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition disabled:bg-gray-400"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>

          </form>

          <p className="text-center text-gray-600 mt-4">
            Don&apos;t have an account?{' '}
            <Link
              to="/register"
              className="text-blue-500 hover:underline font-semibold"
            >
              Register here
            </Link>
          </p>

        </div>
      </div>
    </div>
  )
}

export default Login