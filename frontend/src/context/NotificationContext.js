'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import useWebSocket from '@/hooks/useWebSocket'
import apiClient from '@/lib/apiClient'

const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  // 1. Core API Sync Method (Used on initial load & reconnect fallback)
  const fetchNotifications = useCallback(async () => {
    try {
      const response = await apiClient.get('/api/notifications')
      if (response?.data) {
        setNotifications(response.data.items || [])
        setUnreadCount(response.data.unreadCount || 0)
      }
    } catch (error) {
      console.error('Failed to sync notification updates:', error)
    }
  }, [])

  // 2. Consume Shared WS Layer, filtering exclusively for 'notification' frames
  const ws = useWebSocket('notification')
  const { connected, connectionStatus } = ws

  // 3. Handle live incoming notifications
  useEffect(() => {
    // If we're using the backwards-compatible useWebSocket, it returns an onMessage binder
    const { onMessage } = ws

    const unsubscribe = onMessage((message) => {
      // Expecting standard format payload or flat fallback object structure
      const newNotification = message.payload || message

      if (newNotification) {
        // Instantly update badge count and list state arrays
        setNotifications((prev) => [newNotification, ...prev])
        setUnreadCount((prev) => prev + 1)
      }
    })

    return () => unsubscribe()
  }, [])

  // 4. Graceful Fallback Catch: Re-fetch missed messages on reconnect
  useEffect(() => {
    if (connectionStatus === 'CONNECTED') {
      fetchNotifications()
    }
  }, [connectionStatus, fetchNotifications])

  // 5. Context UI Management Actions
  const markAsRead = useCallback(async (notificationId) => {
    try {
      await apiClient.post(`/api/notifications/${notificationId}/read`)
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
    try {
      await apiClient.post('/api/notifications/read-all')
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Failed to clear unread counts:', error)
    }
  }, [])

  const value = {
    notifications,
    unreadCount,
    connected,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications,
  }

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}
