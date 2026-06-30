import React from 'react'

export default function MessageBubble({ message }) {
  const isSelf = message.self

  return (
    <div className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
          isSelf
            ? 'rounded-br-md bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-500/20'
            : 'rounded-bl-md border border-gray-100 bg-gray-50 text-gray-900'
        }`}
      >
        <p className="text-sm leading-relaxed">{message.text}</p>
        <p className={`mt-1 text-xs ${isSelf ? 'text-blue-200' : 'text-gray-400'}`}>
          {new Date(message.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}
