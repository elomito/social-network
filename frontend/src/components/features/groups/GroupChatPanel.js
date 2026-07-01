'use client'

import React, { useEffect, useState, useRef } from 'react'
import useWebSocket from '@/hooks/useWebSocket'
import MessageBubble from '@/components/features/chat/MessageBubble'
import { getGroupMessages, sendGroupMessage } from '@/lib/apiClient'

export default function GroupChatPanel({ groupId, isOpen }) {
  const { onMessage } = useWebSocket('group_message')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [text, setText] = useState('')
  const scrollerRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError('')
      try {
        const msgs = await getGroupMessages(groupId)
        if (cancelled) return
        setMessages(msgs || [])
        setTimeout(
          () => scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight }),
          50
        )
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.message || 'Failed to load messages.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    if (isOpen) load()
    return () => {
      cancelled = true
    }
  }, [groupId, isOpen])

  useEffect(() => {
    const unsubscribe = onMessage((msg) => {
      if (msg && msg.group_id === groupId) {
        setMessages((m) => [...m, msg.message || msg])
        setTimeout(
          () => scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight }),
          20
        )
      }
    })
    return unsubscribe
  }, [onMessage, groupId])

  async function submit(e) {
    e.preventDefault()
    if (!text) return
    try {
      await sendGroupMessage(groupId, text)
      setText('')
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to send message.')
    }
  }

  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <h3 className="mb-3 font-semibold">Group chat</h3>

      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}

      <div ref={scrollerRef} className="mb-3 h-64 space-y-2 overflow-auto">
        {loading && <div className="text-sm text-gray-500">Loading messages...</div>}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
      </div>

      <form onSubmit={submit} className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-1 rounded border p-2"
          placeholder="Write a message..."
        />
        <button className="rounded bg-blue-600 px-3 py-1 text-white">Send</button>
      </form>
    </div>
  )
}