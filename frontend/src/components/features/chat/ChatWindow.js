"use client";

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
    <div className="bg-white rounded shadow p-4 flex flex-col h-96">
      <div className="flex-1 overflow-auto space-y-2 mb-3">
        {messages.map((msg, idx) => (
          <div key={idx} className={`p-2 rounded ${msg.self ? 'bg-blue-100 self-end' : 'bg-gray-100'}`}>
            {msg.text || JSON.stringify(msg)}
          </div>
        ))}
      </div>
      <form onSubmit={submit} className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} className="flex-1 border p-2 rounded" />
        <button className="px-3 py-1 bg-blue-600 text-white rounded">Send</button>
      </form>
    </div>
  )
}
