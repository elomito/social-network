"use client"

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
  const listRef = useRef(null)

  useEffect(() => {
    async function load() {
      try {
        const conv = await getConversations()
        setConversations(conv)
        if (conv.length) {
          setActive(conv[0])
        }
      } catch (e) {
        console.error(e)
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
      } catch (e) { console.error(e) }
    }
    loadMsgs()
    // check follow status if peer exists
    if (active.peer && active.peer.id) {
      getFollowStatus(active.peer.id).then(s => {
        // allow messaging if either follows the other
        const ok = s && (s.follows || s.followed_by)
        setCanMessage(!!ok)
      }).catch(() => setCanMessage(false))
    }
    return () => { mounted = false }
  }, [active])

  useEffect(() => {
    const off = onMessage((msg) => {
      if (!msg) return
      if (msg.type === 'private_message' && active && msg.conversation_id === active.id) {
        setMessages((m) => [...m, msg.message])
        setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight }), 20)
      }
      // if a new conversation arrives, refresh list
      if (msg.type === 'private_message' && msg.conversation_id && !conversations.find(c => c.id === msg.conversation_id)) {
        // reload conversations
        getConversations().then(setConversations).catch(() => {})
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
      alert('You cannot message this user because you are not following each other. You must follow or be followed to message.')
      return
    }
    try {
      await sendPrivateMessage(active.id, text)
      setText('')
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="p-6 flex gap-6">
      <aside className="w-80">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-3">Conversations</h3>
          <div className="space-y-2">
            {conversations.map(c => (
              <div key={c.id} onClick={() => setActive(c)} className={`p-2 rounded hover:bg-gray-50 cursor-pointer ${active && active.id === c.id ? 'bg-gray-100' : ''}`}>
                <div className="text-sm font-medium">{c.peer ? c.peer.name : c.title || 'Conversation'}</div>
                <div className="text-xs text-gray-500">{c.last_message ? c.last_message.content : ''}</div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <main className="flex-1">
        {!active && <div className="text-gray-500">Select a conversation</div>}

        {active && (
          <div className="bg-white rounded-lg shadow p-4 flex flex-col h-[70vh]">
            <div className="font-semibold mb-2">{active.peer ? active.peer.name : 'Conversation'}</div>
            <div ref={listRef} className="flex-1 overflow-auto space-y-2 mb-3">
              {messages.map(m => <MessageBubble key={m.id} message={m} />)}
            </div>

            <form onSubmit={submit} className="flex gap-2">
              <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { submit(e) } }} className="flex-1 border p-2 rounded" placeholder={canMessage ? 'Write a message...' : 'Cannot message this user'} />
              <button disabled={!canMessage} className="px-3 py-1 bg-blue-600 text-white rounded">Send</button>
            </form>
          </div>
        )}
      </main>
    </div>
  )
}
