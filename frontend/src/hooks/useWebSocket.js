'use client';

import { useEffect, useCallback } from 'react';
import { useWebSocketContext } from '@/context/WebSocketContext';

/**
 * Shared WebSocket Hook
 * @param {string} [filterType='*'] - Optional routing filter key (e.g., 'chat', 'notification')
 */
export default function useWebSocket(filterType = '*') {
  const { connectionStatus, send, listeners } = useWebSocketContext();

  const connected = connectionStatus === 'CONNECTED';

  // Backwards-compatible legacy subscribe signature
  const onMessage = useCallback((cb) => {
    const record = { type: filterType, callback: cb };
    listeners.add(record);
    
    // Returns the exact unsubscribe function expected by legacy consumer components
    return () => {
      listeners.delete(record);
    };
  }, [filterType, listeners]);

  return { 
    connected, 
    connectionStatus, // Exposed for your new status indicators (CONNECTED, RECONNECTING, etc.)
    send, 
    onMessage 
  };
}