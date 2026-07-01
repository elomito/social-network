'use client'

import { useCallback } from 'react'
import { useWebSocketContext } from '@/context/WebSocketContext'

/**
 * Shared WebSocket Hook
 * @param {string} [filterType='*'] - Optional routing filter key (e.g., 'chat', 'notification')
 */
export default function useWebSocket(filterType = '*') {
  const { connectionStatus, send, listeners } = useWebSocketContext()

  const connected = connectionStatus === 'CONNECTED'

  const onMessage = useCallback(
    (cb) => {
      const record = { type: filterType, callback: cb }
      listeners.add(record)

      return () => {
        listeners.delete(record)
      }
    },
    [filterType, listeners]
  )

  return {
    connected,
    connectionStatus,
    send,
    onMessage,
  }
}