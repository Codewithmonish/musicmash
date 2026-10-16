import axios from 'axios'

// All calls use paths relative to the Spring API root (e.g. api.get('/performances')).
// Accept VITE_API_URL with or without the trailing "/api" so both forms reach the same root.
// Dev (Vite on 5173): http://localhost:8081/api from .env. One-click app (served by Spring on
// 8081): "/api" from .env.app, so the browser calls the same address it loaded the page from.
const configuredBase = (import.meta.env.VITE_API_URL || 'http://localhost:8081/api').replace(/\/+$/, '')
const API_BASE_URL = configuredBase.endsWith('/api') ? configuredBase : `${configuredBase}/api`

/** Absolute URL for an uploaded file reference such as "/uploads/<file>.wav" (served by Spring). */
export const mediaUrl = (path) => (path && path.startsWith('/uploads/') ? `${API_BASE_URL.replace(/\/api$/, '')}${path}` : path)

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
