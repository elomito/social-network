"use client"

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
      } catch (e) {
        // ignore
      }

      const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
      const host = window.location.host
      const q = userId ? `?user_id=${encodeURIComponent(userId)}` : ''
      const url = `${proto}://${host}${path}${q}`

      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => { if (!mounted) return; setConnected(true) }
      ws.onclose = () => { if (!mounted) return; setConnected(false) }
      ws.onerror = (e) => { /* noop */ }
      ws.onmessage = (ev) => {
        let data = null
        try { data = JSON.parse(ev.data) } catch (e) { data = ev.data }
        listenersRef.current.forEach((cb) => { try { cb(data) } catch (e) {} })
      }
    }

    init()

    return () => {
      mounted = false
      try { if (wsRef.current) wsRef.current.close() } catch (e) {}
      listenersRef.current.clear()
    }
  }, [path])

  return { connected, send, onMessage }
}

"use client"

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
      // noop
      console.error('ws send error', e)
    }
  }, [])

  const onMessage = useCallback((cb) => {
    listenersRef.current.add(cb)
    return () => listenersRef.current.delete(cb)
  }, [])

  useEffect(() => {
    let mounted = true

    async function init() {
      // try to fetch current user id to pass to ws query param
      let userId = null
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' })
        if (res.ok) {
          const json = await res.json()
          userId = json && json.id
        }
      } catch (e) {
        // ignore
      }

      const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
      const host = window.location.host
      const q = userId ? `?user_id=${encodeURIComponent(userId)}` : ''
      const url = `${proto}://${host}${path}${q}`

      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        if (!mounted) return
        setConnected(true)
      }

      ws.onclose = () => {
        if (!mounted) return
        setConnected(false)
      }

      ws.onerror = (e) => {
        // console.error('ws error', e)
      }

      ws.onmessage = (ev) => {
        let data = null
        try {
          data = JSON.parse(ev.data)
        } catch (e) {
          data = ev.data
        }
        listenersRef.current.forEach((cb) => {
          try { cb(data) } catch (e) { /* noop */ }
        })
      }
    }

    init()

    return () => {
      mounted = false
      try {
        if (wsRef.current) wsRef.current.close()
      } catch (e) {}
      listenersRef.current.clear()
    }
  }, [path])

  return { connected, send, onMessage }
}
