import React from 'react'

export default function MessageBubble({ message }) {
  return (
    <div className={`rounded p-2 ${message.self ? 'self-end bg-blue-100' : 'bg-gray-100'}`}>
      {message.text}
    </div>
  )
}
