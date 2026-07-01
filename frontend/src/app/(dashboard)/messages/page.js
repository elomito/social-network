'use client'

import React, { useEffect, useState, useRef } from 'react'
import useWebSocket from '@/hooks/useWebSocket'
import MessageBubble from '@/components/features/chat/MessageBubble'
import { getChats, getChatMessages, sendPrivateMessage } from '@/lib/apiClient'

export default function MessagesPage() {
  const { onMessage } = useWebSocket('private_message')
  const [chats, setChats] = useState([])
  const [activePeerId, setActivePeerId] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const listRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const data = await getChats()
        if (cancelled) return
        setChats(data || [])
        if (data?.length) {
          setActivePeerId(data[0].peer?.id ?? data[0].id)
        }
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.message || 'Failed to load conversations.')
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!activePeerId) return
    let cancelled = false

    async function loadMessages() {
      try {
        const msgs = await getChatMessages(activePeerId)
        if (cancelled) return
        setMessages(msgs || [])
        setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight }), 50)
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.message || 'Failed to load messages.')
      }
    }

    loadMessages()
    return () => {
      cancelled = true
    }
  }, [activePeerId])

  useEffect(() => {
    const unsubscribe = onMessage((msg) => {
      if (!msg) return
      const fromOrTo = msg.sender_id === activePeerId || msg.recipient_id === activePeerId
      if (fromOrTo) {
        setMessages((m) => [...m, msg])
        setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight }), 20)
      }
    })
    return unsubscribe
  }, [onMessage, activePeerId])

  async function submit(e) {
    e.preventDefault()
    if (!text || !activePeerId) return
    try {
      await sendPrivateMessage(activePeerId, text)
      setText('')
    } catch (err) {
      setError(err?.response?.data?.message || 'Message could not be sent.')
    }
  }

  const activeChat = chats.find((c) => (c.peer?.id ?? c.id) === activePeerId)

  return (
    <div className="flex gap-6 p-6">
      <aside className="w-80">
        <div className="rounded-lg bg-white p-4 shadow">
          <h3 className="mb-3 font-semibold">Conversations</h3>
          <div className="space-y-2">
            {chats.map((c) => {
              const peerId = c.peer?.id ?? c.id
              return (
                <div
                  key={peerId}
                  onClick={() => setActivePeerId(peerId)}
                  className={`cursor-pointer rounded p-2 hover:bg-gray-50 ${
                    activePeerId === peerId ? 'bg-gray-100' : ''
                  }`}
                >
                  <div className="text-sm font-medium">{c.peer?.name || c.title || 'Chat'}</div>
                  <div className="text-xs text-gray-500">{c.last_message?.content || ''}</div>
                </div>
              )
            })}
            {chats.length === 0 && (
              <p className="text-sm text-gray-500">No conversations yet.</p>
            )}
          </div>
        </div>
      </aside>

      <main className="flex-1">
        {error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {!activePeerId && <div className="text-gray-500">Select a conversation</div>}

        {activePeerId && (
          <div className="flex h-[70vh] flex-col rounded-lg bg-white p-4 shadow">
            <div className="mb-2 font-semibold">{activeChat?.peer?.name || 'Conversation'}</div>
            <div ref={listRef} className="mb-3 flex-1 space-y-2 overflow-auto">
              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} />
              ))}
            </div>

            <form onSubmit={submit} className="flex gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) submit(e)
                }}
                className="flex-1 rounded border p-2"
                placeholder="Write a message..."
              />
              <button className="rounded bg-blue-600 px-3 py-1 text-white">Send</button>
            </form>
          </div>
        )}
      </main>
    </div>
  )
}