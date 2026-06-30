import React from 'react'
import Link from 'next/link'

const typeStyles = {
  follow_request: {
    bg: 'bg-blue-50',
    icon: (
      <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.095A7.46 7.46 0 0119 19.5c0 1.438-.52 2.75-1.375 3.75M4 19.235c-.46.46-.86.98-1.175 1.55" />
      </svg>
    ),
  },
  group_invitation: {
    bg: 'bg-purple-50',
    icon: (
      <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
  },
  group_join_request: {
    bg: 'bg-orange-50',
    icon: (
      <svg className="h-5 w-5 text-orange-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.095A7.46 7.46 0 0119 19.5c0 1.438-.52 2.75-1.375 3.75M4 19.235c-.46.46-.86.98-1.175 1.55" />
      </svg>
    ),
  },
  event_created: {
    bg: 'bg-green-50',
    icon: (
      <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
  },
}

export default function NotificationItem({ notification, onAccept, onDecline }) {
  const style = typeStyles[notification.type] || typeStyles.follow_request

  return (
    <div className="flex items-start gap-4 border-b border-gray-100 bg-white p-4 transition-colors last:border-b-0 hover:bg-gray-50">
      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${style.bg}`}>
        {style.icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-gray-900">
          {notification.title || 'Notification'}
        </div>
        <div className="mt-0.5 text-xs text-gray-500">{notification.body}</div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {(notification.type === 'group_invitation' || notification.type === 'follow_request') && (
          <div className="flex gap-2">
            <button
              onClick={() => onAccept(notification)}
              className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 transition-all hover:shadow-md hover:shadow-blue-500/30 active:scale-95"
            >
              Accept
            </button>
            <button
              onClick={() => onDecline(notification)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Decline
            </button>
          </div>
        )}

        {notification.type === 'group_join_request' && (
          <div className="flex gap-2">
            <button
              onClick={() => onAccept(notification)}
              className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 transition-all hover:shadow-md hover:shadow-blue-500/30 active:scale-95"
            >
              Approve
            </button>
            <button
              onClick={() => onDecline(notification)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Reject
            </button>
          </div>
        )}

        {notification.type === 'event_created' && notification.groupId && (
          <Link
            href={`/groups/${notification.groupId}`}
            className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-100"
          >
            View Event
          </Link>
        )}
      </div>
    </div>
  )
}
