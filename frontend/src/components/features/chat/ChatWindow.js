'use client'

import React, { useEffect, useState } from 'react'
import useWebSocket from '../../../hooks/useWebSocket'

export default function ChatWindow({ room }) {
  const { connected, send, onMessage } = useWebSocket('/ws')
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')

  useEffect(() => {
    const off = onMessage((data) => setMessages((m) => [...m, data]))
    return off
  }, [onMessage])

  function submit(e) {
    e.preventDefault()
    if (!text) return
    send({ type: 'message', room, text })
    setMessages((m) => [...m, { text, self: true }])
    setText('')
  }

  return (
    <div className="flex h-96 flex-col rounded bg-white p-4 shadow">
      <div className="mb-3 flex-1 space-y-2 overflow-auto">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`rounded p-2 ${msg.self ? 'self-end bg-blue-100' : 'bg-gray-100'}`}
          >
            {msg.text || JSON.stringify(msg)}
          </div>
        ))}
      </div>
      <form onSubmit={submit} className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-1 rounded border p-2"
        />
        <button className="rounded bg-blue-600 px-3 py-1 text-white">Send</button>
      </form>
    </div>
  )
}
