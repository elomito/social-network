import React from 'react'

export default function EventCard({ event, onRSVP }) {
  const date = new Date(event.start_time)
  const dateLabel = date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const timeLabel = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

  return (
    <div className="rounded border p-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">{event.title}</div>
          <div className="text-xs text-gray-500">
            {dateLabel} • {timeLabel}
          </div>
        </div>
        <div className="text-sm text-gray-600 font-medium">
          {event.going_count || 0} Going • {event.not_going_count || 0} Not Going
        </div>
      </div>

      <div className="mt-2 text-sm text-gray-700">{event.description}</div>

      <div className="mt-3 flex gap-2">
        <button
          onClick={() => onRSVP('going')}
          className={`rounded px-3 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-95 ${
            event.user_response === 'going'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
        >
          Going
        </button>
        <button
          onClick={() => onRSVP('not_going')}
          className={`rounded px-3 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-95 ${
            event.user_response === 'not_going'
              ? 'bg-red-600 text-white shadow-sm shadow-red-500/30'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
        >
          Not Going
        </button>
      </div>
    </div>
  )
}
