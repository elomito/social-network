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
        <div className="text-sm text-gray-600">
          {event.going_count || 0} Going • {event.not_going_count || 0} Not Going
        </div>
      </div>

      <div className="mt-2 text-sm text-gray-700">{event.description}</div>

      <div className="mt-3 flex gap-2">
        <button
          onClick={() => onRSVP('going')}
          className="rounded bg-blue-600 px-3 py-1 text-sm text-white"
        >
          Going
        </button>
        <button onClick={() => onRSVP('not_going')} className="rounded border px-3 py-1 text-sm">
          Not Going
        </button>
      </div>
    </div>
  )
}
