'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import useWebSocket from '@/hooks/useWebSocket'
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/lib/apiClient'

const NotificationContext = createContext(null)

// Normalize backend notification fields to the names the UI expects.
function normalizeNotification(n) {
  if (!n) return n
  return {
    ...n,
    body: n.body ?? n.message,
    read: n.read ?? n.is_read,
    from_user_id: n.from_user_id ?? n.initiator_id,
  }
}

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  // The backend has two separate endpoints (list + unread count) — there is
  // no single combined response, so we fetch both and merge client-side.
  const fetchNotifications = useCallback(async () => {
    try {
      const [list, unread] = await Promise.all([
        getNotifications(),
        getUnreadNotificationCount(),
      ])
      const normalized = (list || []).map(normalizeNotification)
      setNotifications(normalized)
      // Fall back to deriving the count from the list if the dedicated
      // endpoint is unavailable or returns an unexpected shape.
      const derivedCount = normalized.filter((n) => !n.read).length
      setUnreadCount(unread?.count ?? derivedCount)
    } catch (error) {
      console.error('Failed to sync notification updates:', error)
    }
  }, [])

  // Single subscription to the shared WebSocket, filtered to "notification"
  // frames. This hook is called exactly once at the top level — calling it
  // again inside an effect (as a previous version of this file did) breaks
  // React's rules of hooks and double-subscribes the listener.
  const { connectionStatus, onMessage } = useWebSocket('notification')
  const connected = connectionStatus === 'CONNECTED'

  useEffect(() => {
    const unsubscribe = onMessage((message) => {
      const newNotification = message?.payload || message
      if (!newNotification) return

      setNotifications((prev) => [normalizeNotification(newNotification), ...prev])
      setUnreadCount((prev) => prev + 1)
    })

    return unsubscribe
  }, [onMessage])

  // Re-sync on (re)connect, since any notifications missed while
  // disconnected won't have arrived over the socket.
  useEffect(() => {
    if (connectionStatus === 'CONNECTED') {
      fetchNotifications()
    }
  }, [connectionStatus, fetchNotifications])

  const markAsRead = useCallback(async (notificationId) => {
    try {
      await markNotificationRead(notificationId)
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }, [])

  // There is no backend "mark all as read" route, so this fires one read
  // call per currently-unread notification.
  const markAllAsRead = useCallback(async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id)
    if (unreadIds.length === 0) return

    try {
      await markAllNotificationsRead(unreadIds)
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Failed to clear unread counts:', error)
    }
  }, [notifications])

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