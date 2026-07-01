'use client'

import { createContext, useState, useEffect, useCallback } from 'react'
import { getCurrentUser, login as loginRequest, logout as logoutRequest } from '@/lib/apiClient'

// The backend sets an httpOnly session cookie on login (see docs/api.md:
// POST /api/auth/login, POST /api/auth/logout). Because it's httpOnly, this
// app never reads or stores the token itself — it only knows "am I logged
// in?" by asking the backend via GET /api/auth/me, and relies on the browser
// to attach the cookie automatically (apiClient is configured with
// withCredentials: true).
export const AuthContext = createContext({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
})

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser()
      setUser(currentUser)
      return currentUser
    } catch {
      setUser(null)
      return null
    }
  }, [])

  useEffect(() => {
    let mounted = true
    async function init() {
      try {
        const currentUser = await getCurrentUser()
        if (mounted) setUser(currentUser)
      } catch {
        if (mounted) setUser(null)
      } finally {
        if (mounted) setIsLoading(false)
      }
    }
    init()
    return () => {
      mounted = false
    }
  }, [])

  const login = useCallback(async (credentials) => {
    const result = await loginRequest(credentials)
    // Cookie is set by the backend response itself. We still refresh the
    // user from /auth/me so we never trust a client-guessed shape for the
    // login response body.
    await refreshUser()
    return result
  }, [refreshUser])

  const logout = useCallback(async () => {
    try {
      await logoutRequest()
    } finally {
      setUser(null)
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isLoading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}