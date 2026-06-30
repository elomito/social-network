'use client'

import React, { useEffect, useState, useRef } from 'react'
import useWebSocket from '../../../hooks/useWebSocket'
import MessageBubble from '../../../components/features/chat/MessageBubble'
import {
  getConversations,
  getConversationMessages,
  sendPrivateMessage,
  getOrCreateConversationWith,
  getFollowStatus,
} from '../../../lib/apiClient'

export default function MessagesPage() {
  const { onMessage, send } = useWebSocket('/ws')
  const [conversations, setConversations] = useState([])
  const [active, setActive] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [canMessage, setCanMessage] = useState(true)
  const [loading, setLoading] = useState(true)
  const listRef = useRef(null)

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const conv = await getConversations()
        setConversations(conv)
        if (conv.length) {
          setActive(conv[0])
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (!active) return
    let mounted = true
    async function loadMsgs() {
      try {
        const msgs = await getConversationMessages(active.id, 50, 0)
        if (!mounted) return
        setMessages(msgs)
        setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight }), 50)
      } catch (e) {
        console.error(e)
      }
    }
    loadMsgs()
    // check follow status if peer exists
    if (active.peer && active.peer.id) {
      getFollowStatus(active.peer.id)
        .then((s) => {
          // allow messaging if either follows the other
          const ok = s && (s.follows || s.followed_by)
          setCanMessage(!!ok)
        })
        .catch(() => setCanMessage(false))
    }
    return () => {
      mounted = false
    }
  }, [active])

  useEffect(() => {
    const off = onMessage((msg) => {
      if (!msg) return
      if (msg.type === 'private_message' && active && msg.conversation_id === active.id) {
        setMessages((m) => [...m, msg.message])
        setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight }), 20)
      }
      // if a new conversation arrives, refresh list
      if (
        msg.type === 'private_message' &&
        msg.conversation_id &&
        !conversations.find((c) => c.id === msg.conversation_id)
      ) {
        // reload conversations
        getConversations()
          .then(setConversations)
          .catch(() => {})
      }
    })
    return off
  }, [onMessage, active, conversations])

  async function openConversationWith(peerId) {
    try {
      const conv = await getOrCreateConversationWith(peerId)
      // if API returns conversation object
      setActive(conv)
      // reload conversations list
      const convs = await getConversations()
      setConversations(convs)
    } catch (e) {
      console.error(e)
    }
  }

  async function submit(e) {
    e.preventDefault()
    if (!text || !active) return
    if (!canMessage) {
      alert(
        'You cannot message this user because you are not following each other. You must follow or be followed to message.'
      )
      return
    }
    try {
      await sendPrivateMessage(active.id, text)
      setText('')
    } catch (e) {
      console.error(e)
    }
  }

  if (loading) {
    return (
      <div className="flex gap-6 p-6">
        <div className="w-80">
          <div className="animate-pulse space-y-2 rounded-lg bg-white p-4 shadow">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-12 rounded bg-gray-200"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-6 p-6">
      <aside className="w-80">
        <div className="rounded-lg bg-white p-4 shadow">
          <h3 className="mb-3 font-semibold">Conversations</h3>
          <div className="space-y-2">
            {conversations.map((c) => (
              <div
                key={c.id}
                onClick={() => setActive(c)}
                className={`cursor-pointer rounded p-2 hover:bg-gray-50 ${active && active.id === c.id ? 'bg-gray-100' : ''}`}
              >
                <div className="text-sm font-medium">
                  {c.peer ? c.peer.name : c.title || 'Conversation'}
                </div>
                <div className="text-xs text-gray-500">
                  {c.last_message ? c.last_message.content : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <main className="flex-1">
        {!active && <div className="text-gray-500">Select a conversation</div>}

        {active && (
          <div className="flex h-[70vh] flex-col rounded-lg bg-white p-4 shadow">
            <div className="mb-2 font-semibold">
              {active.peer ? active.peer.name : 'Conversation'}
            </div>
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
                  if (e.key === 'Enter' && !e.shiftKey) {
                    submit(e)
                  }
                }}
                className="flex-1 rounded border p-2"
                placeholder={canMessage ? 'Write a message...' : 'Cannot message this user'}
              />
              <button disabled={!canMessage} className="rounded bg-blue-600 px-3 py-1 text-white">
                Send
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  )
}
