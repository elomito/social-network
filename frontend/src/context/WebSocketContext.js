// src/context/WebSocketContext.js
'use client'

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { WS_URL } from '@/lib/config'

const WebSocketContext = createContext(null)

export function WebSocketProvider({ children }) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const [connectionStatus, setConnectionStatus] = useState('DISCONNECTED') // DISCONNECTED, CONNECTING, CONNECTED, RECONNECTING

  const wsRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)
  const reconnectDelayRef = useRef(1000) // Start with 1 second backoff
  const maxReconnectDelay = 30000 // Cap backoff at 30 seconds
  const listenersRef = useRef(new Set()) // Active subscriber hooks

  // 1. Multiplexed Message Router
  const handleMessage = useCallback((event) => {
    try {
      const message = JSON.parse(event.data)
      if (!message.type) {
        console.warn('Received message missing a "type" field:', message)
        return
      }

      listenersRef.current.forEach((listener) => {
        if (listener.type === message.type || listener.type === '*') {
          listener.callback(message.payload || message)
        }
      })
    } catch (err) {
      console.error('Error parsing WebSocket message frame:', err)
    }
  }, [])

  // 2. Core Connection Logic
  const connect = useCallback(() => {
    if (!isAuthenticated) {
      setConnectionStatus('DISCONNECTED')
      return
    }

    if (wsRef.current) {
      wsRef.current.close()
    }

    setConnectionStatus((prev) => (prev === 'DISCONNECTED' ? 'CONNECTING' : 'RECONNECTING'))
    setConnectionStatus((prev) => (prev === 'DISCONNECTED' ? 'CONNECTING' : 'RECONNECTING'))

    // Session auth is carried via the httpOnly cookie. Browsers attach
    // cookies to WebSocket upgrade requests automatically for same-origin
    // (or CORS-credentialed) connections, so no token needs to be put in
    // the URL here.
    const wsUrl = user?.user_id ? `${WS_URL}?user_id=${user.user_id}` : WS_URL
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      setConnectionStatus('CONNECTED')
      reconnectDelayRef.current = 1000 // Reset backoff on success
    }

    ws.onmessage = handleMessage

    ws.onclose = (event) => {
      wsRef.current = null

      if (event.wasClean || !isAuthenticated) {
        setConnectionStatus('DISCONNECTED')
        return
      }

      setConnectionStatus('RECONNECTING')

      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectDelayRef.current = Math.min(reconnectDelayRef.current * 2, maxReconnectDelay)
        connect()
      }, reconnectDelayRef.current)
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [isAuthenticated, user, handleMessage])

  // 3. Graceful Teardown
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    if (wsRef.current) {
      wsRef.current.close(1000, 'Intentional Disconnect / Logout')
      wsRef.current = null
    }
    setConnectionStatus('DISCONNECTED')
  }, [])

  // 4. Global Sender
  const send = useCallback((type, payload) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error(`Cannot send message. WebSocket is not open. Type: ${type}`)
      return false
    }
    wsRef.current.send(JSON.stringify({ type, payload }))
    return true
  }, [])

  useEffect(() => {
    if (isLoading) return

    if (isAuthenticated) {
      connect()
    } else {
      disconnect()
    }

    return () => {
      disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isLoading])

  const value = {
    connectionStatus,
    send,
    listeners: listenersRef.current,
  }

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>
}

export function useWebSocketContext() {
  const context = useContext(WebSocketContext)
  if (!context) {
    // Return default values instead of throwing to support static generation
    return {
      connectionStatus: 'DISCONNECTED',
      send: () => false,
      listeners: new Set(),
    }
  }
  return context
}