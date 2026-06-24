// src/context/WebSocketContext.js
'use client'

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { WS_URL } from '@/lib/config'

const WebSocketContext = createContext(null)

export function WebSocketProvider({ children }) {
  const { token, isAuthenticated } = useAuth()
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

      // Distribute message to all registered listeners matching this type
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
    if (!isAuthenticated || !token) {
      setConnectionStatus('DISCONNECTED')
      return
    }

    // Clean up any existing connection cycles before opening a new one
    if (wsRef.current) {
      wsRef.current.close()
    }

    setConnectionStatus((prev) => (prev === 'DISCONNECTED' ? 'CONNECTING' : 'RERECONNECTING'))

    // Append token as a query parameter for authentication verification
    const socketUrl = `${WS_URL}?token=${encodeURIComponent(token)}`
    const ws = new WebSocket(socketUrl)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('WebSocket Connection Established.')
      setConnectionStatus('CONNECTED')
      reconnectDelayRef.current = 1000 // Reset exponential backoff on successful handshake
    }

    ws.onmessage = handleMessage

    ws.onclose = (event) => {
      wsRef.current = null

      // If closing was clean or initiated because of logout, don't attempt reconnection
      if (event.wasClean || !isAuthenticated) {
        setConnectionStatus('DISCONNECTED')
        console.log('WebSocket Connection Closed Cleanly.')
        return
      }

      // Drop encountered -> Trigger Reconnect with Exponential Backoff
      setConnectionStatus('RECONNECTING')
      console.log(`WebSocket dropped. Reconnecting in ${reconnectDelayRef.current}ms...`)

      reconnectTimeoutRef.current = setTimeout(() => {
        // Double the delay for the next attempt, capped at max threshold
        reconnectDelayRef.current = Math.min(reconnectDelayRef.current * 2, maxReconnectDelay)
        connect()
      }, reconnectDelayRef.current)
    }

    ws.onerror = (error) => {
      console.error('WebSocket Error Occurred:', error)
      ws.close() // Forces onclose lifecycle to manage the state mechanics smoothly
    }
  }, [isAuthenticated, token, handleMessage])

  // 3. Graceful Teardown Mechanics
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    if (wsRef.current) {
      // 1000 indicates a normal, intentional closure sequence
      wsRef.current.close(1000, 'Intentional Disconnect / Logout')
      wsRef.current = null
    }
    setConnectionStatus('DISCONNECTED')
  }, [])

  // 4. Global Sender Blueprint
  const send = useCallback((type, payload) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error(`Cannot send message. WebSocket is not open. Type: ${type}`)
      return false
    }
    wsRef.current.send(JSON.stringify({ type, payload }))
    return true
  }, [])

  // Sync state transitions directly to user session presence
  useEffect(() => {
    if (isAuthenticated && token) {
      connect()
    } else {
      disconnect()
    }

    return () => {
      disconnect()
    }
  }, [isAuthenticated, token, connect, disconnect])

  const value = {
    connectionStatus,
    send,
    listeners: listenersRef.current, // Expose references securely for hook registrations
  }

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>
}

export function useWebSocketContext() {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocketContext must be consumed inside a WebSocketProvider')
  }
  return context
}
