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
import Avatar from '@/components/ui/Avatar'

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
    if (active.peer && active.peer.id) {
      getFollowStatus(active.peer.id)
        .then((s) => {
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
      if (
        msg.type === 'private_message' &&
        msg.conversation_id &&
        !conversations.find((c) => c.id === msg.conversation_id)
      ) {
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
      setActive(conv)
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
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="flex gap-6">
          <div className="w-80 flex-shrink-0">
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm animate-pulse">
              <div className="mb-4 h-8 w-24 rounded bg-gray-200" />
              <div className="space-y-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gray-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-24 rounded bg-gray-200" />
                      <div className="h-3 w-16 rounded bg-gray-200" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="flex gap-6">
        {/* Conversations List */}
        <aside className="w-80 flex-shrink-0">
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="border-b border-gray-100 p-4">
              <h3 className="text-lg font-bold text-gray-900">Messages</h3>
              <p className="text-xs text-gray-500">{conversations.length} conversations</p>
            </div>
            <div className="max-h-[calc(100vh-200px)] overflow-y-auto p-2">
              {conversations.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-500">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                    <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                  </div>
                  No conversations yet
                </div>
              ) : (
                <div className="space-y-1">
                  {conversations.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setActive(c)}
                      className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors ${
                        active && active.id === c.id
                          ? 'bg-blue-50 text-blue-700'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <Avatar
                        src={c.peer?.avatar}
                        alt={c.peer?.name || c.title}
                        fallback={(c.peer?.name || c.title || '?')[0]}
                        size="md"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {c.peer ? c.peer.name : c.title || 'Conversation'}
                        </p>
                        <p className="truncate text-xs text-gray-500">
                          {c.last_message ? c.last_message.content : 'No messages yet'}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Chat Area */}
        <main className="flex-1">
          {!active ? (
            <div className="flex h-[70vh] flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Select a conversation</h3>
              <p className="mt-1 text-sm text-gray-500">Choose a conversation from the left to start messaging</p>
            </div>
          ) : (
            <div className="flex h-[70vh] flex-col rounded-2xl border border-gray-100 bg-white shadow-sm">
              {/* Chat Header */}
              <div className="flex items-center gap-3 border-b border-gray-100 p-4">
                <Avatar
                  src={active.peer?.avatar}
                  alt={active.peer?.name || 'Conversation'}
                  fallback={(active.peer?.name || '?')[0]}
                  size="md"
                />
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {active.peer ? active.peer.name : 'Conversation'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {canMessage ? 'Active now' : 'Follow to message'}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4">
                {messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-center text-sm text-gray-500">
                    <div>
                      <p className="font-medium">No messages yet</p>
                      <p className="mt-1">Send a message to start the conversation</p>
                    </div>
                  </div>
                ) : (
                  messages.map((m) => (
                    <MessageBubble key={m.id} message={m} />
                  ))
                )}
              </div>

              {/* Input */}
              <form onSubmit={submit} className="border-t border-gray-100 p-4">
                <div className="flex gap-3">
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        submit(e)
                      }
                    }}
                    className="flex-1 rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-all duration-200 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder={canMessage ? 'Type a message...' : 'Follow to message this user'}
                    disabled={!canMessage}
                  />
                  <button
                    type="submit"
                    disabled={!canMessage || !text.trim()}
                    className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-500/30 transition-all duration-200 hover:shadow-md hover:shadow-blue-500/40 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h12" />
                    </svg>
                  </button>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
