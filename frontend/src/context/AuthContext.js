'use client'

import { createContext, useState, useEffect, useCallback, useRef } from 'react'

export const AuthContext = createContext({
  token: null,
  user: null,
  setToken: () => {},
  isAuthenticated: false,
  isLoading: true,
  logout: () => {},
})

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token')
    }
    return null
  })
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const isAuthenticated = !!token

  // Validate session whenever token changes
  useEffect(() => {
    if (!token) {
      setUser(null)
      setIsLoading(false)
      return
    }

    const validateSession = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        })

        if (response.ok) {
          const data = await response.json()
          setUser(data)
        } else {
          setToken(null)
          setUser(null)
          if (typeof window !== 'undefined') {
            localStorage.removeItem('auth_token')
          }
        }
      } catch (error) {
        console.error('Session validation failed:', error)
        setToken(null)
        setUser(null)
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_token')
        }
      } finally {
        setIsLoading(false)
      }
    }

    validateSession()
  }, [token, setToken])

  // Persist token to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('auth_token', token)
      } else {
        localStorage.removeItem('auth_token')
      }
    }
  }, [token])

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      setToken(null)
      setUser(null)
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token')
      }
    }
  }, [])

  return (
    <AuthContext.Provider value={{ token, user, setToken, isAuthenticated, isLoading, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
