'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

export default function useWebSocket(path = '/ws') {
  const wsRef = useRef(null)
  const listenersRef = useRef(new Set())
  const [connected, setConnected] = useState(false)

  const send = useCallback((payload) => {
    try {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
      wsRef.current.send(JSON.stringify(payload))
    } catch (e) {
      console.error('ws send error', e)
    }
  }, [])

  // Returns an unsubscribe function — always call it in useEffect cleanup
  const onMessage = useCallback((cb) => {
    listenersRef.current.add(cb)
    return () => listenersRef.current.delete(cb)
  }, [])

  useEffect(() => {
    let mounted = true

    async function init() {
      let userId = null
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' })
        if (res.ok) {
          const json = await res.json()
          userId = json && json.id
        }
      } catch {
        // not logged in yet — connect anonymously
      }

      const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
      const host = window.location.host
      const q = userId ? `?user_id=${encodeURIComponent(userId)}` : ''
      const url = `${proto}://${host}${path}${q}`

      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        if (mounted) setConnected(true)
      }
      ws.onclose = () => {
        if (mounted) setConnected(false)
      }
      ws.onerror = () => {
        /* onerror is always followed by onclose */
      }
      ws.onmessage = (ev) => {
        let data = null
        try {
          data = JSON.parse(ev.data)
        } catch {
          data = ev.data
        }
        listenersRef.current.forEach((cb) => {
          try {
            cb(data)
          } catch {
            /* noop */
          }
        })
      }
    }

    init()

    return () => {
      mounted = false
      try {
        if (wsRef.current) wsRef.current.close()
      } catch {
        /* noop */
      }
      listenersRef.current.clear()
    }
  }, [path])

  return { connected, send, onMessage }
}
