import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('token'))
  // With a stored token, wait for /auth/me before deciding (ProtectedRoute shows a loader).
  const [loading, setLoading] = useState(Boolean(localStorage.getItem('token')))

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const storedToken = localStorage.getItem('token')
    if (storedToken) {
      try {
        const response = await api.get('/auth/me')
        setUser(response.data)
        setToken(storedToken)
      } catch (error) {
        console.error('Auth check failed:', error)
        localStorage.removeItem('token')
        setToken(null)
        setUser(null)
      }
    }
    setLoading(false)
  }

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password })
      // The API returns the user's fields next to the token: {token, id, username, email, role}.
      const { token, ...user } = response.data
      localStorage.setItem('token', token)
      setToken(token)
      setUser(user)
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Login failed' 
      }
    }
  }

  const register = async (userData) => {
    try {
      const response = await api.post('/auth/register', userData)
      return { success: true, data: response.data }
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Registration failed' 
      }
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
  }

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    checkAuth,
    isAuthenticated: !!token,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
