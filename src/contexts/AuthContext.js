import { createContext, useContext, useState, useEffect } from 'react'
import { login as loginApi } from '../services/api'

const AuthContext = createContext()

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    // ✅ FIX 1: useState lazy initializer — page load-laiyae user set aagudhu
    // token + user rendu irundha mathum restore pannu
    const storedToken = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')
    if (storedToken && storedUser) {
      try { return JSON.parse(storedUser) } catch { return null }
    }
    return null
  })

  const [token, setToken] = useState(() => localStorage.getItem('token'))
  
  // ✅ FIX 2: loading false-aaga user check aachi nu wait pannama direct set pannrom
  const [loading, setLoading] = useState(false)

  const login = async (email, password) => {
    try {
      const data = await loginApi(email, password)
      if (data.success) {
        // ✅ FIX 3: localStorage first, then state — order matters
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        setToken(data.token)
        setUser(data.user)
        return { success: true, user: data.user }
      }
      return { success: false, error: data.error || 'Invalid credentials' }
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Login failed' }
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}