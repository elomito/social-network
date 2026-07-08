'use client'

import React, { useEffect, useState, useRef } from 'react'
import useWebSocket from '@/hooks/useWebSocket'
import MessageBubble from '@/components/features/chat/MessageBubble'
import {
  getChats,
  getChatMessages,
  sendPrivateMessage,
  getOrCreateConversation,
  getUserFollowers,
} from '@/lib/apiClient'

export default function MessagesPage() {
  const { onMessage } = useWebSocket('private_message')
  const [chats, setChats] = useState([])
  const [friends, setFriends] = useState([])
  const [activePeerId, setActivePeerId] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const listRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [chatsData, followersData] = await Promise.all([
          getChats(),
          getUserFollowers()
        ])
        if (cancelled) return
        
        const conversations = chatsData || []
        setChats(conversations)
        if (conversations.length > 0) {
          setActivePeerId(conversations[0].peer?.id ?? conversations[0].id)
        }

        const list = followersData?.followers || followersData || []
        const friendList = list.filter((f) => f.isFollowing || f.is_following)
        setFriends(friendList)
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
        setTimeout(() => {
          if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight
          }
        }, 50)
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
    const unsubscribe = onMessage((data) => {
      if (!data) return
      const msg = data.message || data
      const fromOrTo = msg.sender_id === activePeerId || msg.recipient_id === activePeerId
      if (fromOrTo) {
        setMessages((m) => {
          if (m.some((existing) => existing.id === msg.id)) return m
          return [...m, msg]
        })
        setTimeout(() => {
          if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight
          }
        }, 20)
      }

      // Also update the last message in the chat list
      setChats((prev) =>
        prev.map((c) => {
          const peerId = c.peer?.id ?? c.id
          if (peerId === msg.sender_id || peerId === msg.recipient_id) {
            return {
              ...c,
              last_message: {
                id: msg.id,
                content: msg.content,
                sender_id: msg.sender_id,
                created_at: msg.created_at,
              },
            }
          }
          return c
        })
      )
    })
    return unsubscribe
  }, [onMessage, activePeerId])

  async function submit(e) {
    e.preventDefault()
    if (!text.trim() || !activePeerId) return
    try {
      const sentMsg = await sendPrivateMessage(activePeerId, text.trim())
      setMessages((m) => {
        if (m.some((existing) => existing.id === sentMsg.id)) return m
        return [...m, sentMsg]
      })
      
      // Update the last message in the chat list
      setChats((prev) =>
        prev.map((c) => {
          const peerId = c.peer?.id ?? c.id
          if (peerId === activePeerId) {
            return {
              ...c,
              last_message: {
                id: sentMsg.id,
                content: sentMsg.content,
                sender_id: sentMsg.sender_id,
                created_at: sentMsg.created_at,
              },
            }
          }
          return c
        })
      )

      setText('')
      setTimeout(() => {
        if (listRef.current) {
          listRef.current.scrollTop = listRef.current.scrollHeight
        }
      }, 20)
    } catch (err) {
      setError(err?.response?.data?.message || 'Message could not be sent.')
    }
  }

  async function handleStartChat(peerId) {
    try {
      console.log('Starting chat with peer:', peerId)
      const conv = await getOrCreateConversation(peerId)
      console.log('getOrCreateConversation response:', conv)
      const exists = chats.some((c) => (c.peer?.id ?? c.id) === peerId)
      if (!exists) {
        setChats((prev) => [conv, ...prev])
      }
      setActivePeerId(peerId)
    } catch (err) {
      console.error('Error starting chat:', err)
      const errMsg = err?.response?.data?.message || err?.response?.data || err.message || 'Failed to start conversation.'
      setError(typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg))
    }
  }

  const activeChat = chats.find((c) => (c.peer?.id ?? c.id) === activePeerId)

  return (
    <div className="flex gap-6 p-6 min-h-[85vh]">
      <aside className="w-80 flex flex-col gap-4">
        {/* Conversations Card */}
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm flex-1 flex flex-col">
          <h3 className="mb-4 text-base font-semibold text-gray-900">Conversations</h3>
          
          <div className="space-y-2 flex-1 overflow-y-auto max-h-[45vh] pr-1">
            {chats.map((c) => {
              const peerId = c.peer?.id ?? c.id
              const isSelected = activePeerId === peerId
              const peerName = c.peer?.name || 'Chat'
              const initials = peerName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

              return (
                <div
                  key={peerId}
                  onClick={() => setActivePeerId(peerId)}
                  className={`cursor-pointer rounded-xl p-3 transition-smooth flex items-center gap-3 ${
                    isSelected ? 'bg-blue-50 text-blue-900 border border-blue-100 shadow-sm' : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                    isSelected ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {initials || '?'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate text-gray-900">{peerName}</div>
                    <div className="text-xs text-gray-500 truncate">{c.last_message?.content || 'No messages yet'}</div>
                  </div>
                </div>
              )
            })}
            {chats.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">No conversations yet.</p>
            )}
          </div>
        </div>

        {/* Friends Card */}
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm h-64 flex flex-col">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-500">Friends</h3>
          <div className="space-y-1 flex-1 overflow-y-auto pr-1">
            {friends.map((f) => {
              const displayName = [f.first_name, f.last_name].filter(Boolean).join(' ').trim()
              const name = f.nickname || displayName || f.username
              const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

              return (
                <button
                  key={f.id}
                  onClick={() => handleStartChat(f.id)}
                  className="w-full text-left rounded-xl p-2.5 transition-smooth hover:bg-blue-50/50 flex items-center gap-3 group"
                >
                  <div className="relative shrink-0">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs group-hover:scale-105 transition-transform">
                      {initials}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white"></div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-semibold text-gray-700 group-hover:text-blue-600 truncate block">{name}</span>
                    <span className="text-xs text-gray-400 block truncate">@{f.username}</span>
                  </div>
                </button>
              )
            })}
            {friends.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-8">No friends found.</p>
            )}
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col">
        {error && (
          <div className="mb-4 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {!activePeerId && (
          <div className="flex-1 flex items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-8 text-center text-gray-500">
            <div>
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">💬</div>
              <h3 className="font-semibold text-gray-800 text-lg mb-1">Your Messages</h3>
              <p className="text-sm text-gray-500 max-w-xs">Select an existing conversation from the list or click a friend to start chatting.</p>
            </div>
          </div>
        )}

        {activePeerId && (
          <div className="flex h-[75vh] flex-col rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            {/* Header */}
            <div className="border-b border-gray-100 bg-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                  {(activeChat?.peer?.name || 'Conversation').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="font-bold text-gray-900">{activeChat?.peer?.name || 'Conversation'}</div>
                  <div className="text-xs text-green-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Active Now
                  </div>
                </div>
              </div>
            </div>

            {/* Message Area */}
            <div ref={listRef} className="flex-1 bg-gray-50/30 px-6 py-4 space-y-4 overflow-y-auto animate-fade-in">
              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} />
              ))}
              {messages.length === 0 && (
                <div className="text-center text-gray-400 text-sm py-12">
                  No messages yet. Send a message to start the conversation!
                </div>
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={submit} className="border-t border-gray-100 bg-white p-4 flex gap-3 items-center">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    submit(e)
                  }
                }}
                className="flex-1 rounded-xl border border-gray-200 p-3 text-sm focus-ring bg-gray-50/50 hover:bg-gray-50 focus:bg-white transition"
                placeholder="Write a message..."
              />
              <button className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700 transition">
                Send
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  )
}