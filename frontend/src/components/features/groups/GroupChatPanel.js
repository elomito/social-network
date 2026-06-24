'use client'

import React, { useEffect, useState, useRef } from 'react'
import useWebSocket from '../../../../hooks/useWebSocket'
import MessageBubble from '../../chat/MessageBubble'
import { getGroupMessages, sendGroupMessage } from '../../../../lib/apiClient'

export default function GroupChatPanel({ groupId, isOpen }) {
  const { connected, send, onMessage } = useWebSocket('/ws')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [text, setText] = useState('')
  const scrollerRef = useRef(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      try {
        const msgs = await getGroupMessages(groupId, 50, 0)
        if (!mounted) return
        setMessages(msgs)
        // scroll to bottom
        setTimeout(
          () => scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight }),
          50
        )
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    if (isOpen) load()
    return () => {
      mounted = false
    }
  }, [groupId, isOpen])

  useEffect(() => {
    const off = onMessage((msg) => {
      if (msg && msg.type === 'group_message' && msg.group_id === groupId) {
        setMessages((m) => [...m, msg.message])
        setTimeout(
          () => scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight }),
          20
        )
      }
    })
    return off
  }, [onMessage, groupId])

  async function submit(e) {
    e.preventDefault()
    if (!text) return
    try {
      await sendGroupMessage(groupId, text)
      setText('')
      // optional: optimistic push via websocket or local append
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <h3 className="mb-3 font-semibold">Group Chat</h3>
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
