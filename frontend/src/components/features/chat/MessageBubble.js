import React from 'react'

export default function MessageBubble({ message }) {
  return (
    <div className={`p-2 rounded ${message.self ? 'bg-blue-100 self-end' : 'bg-gray-100'}`}>{message.text}</div>
  )
}
