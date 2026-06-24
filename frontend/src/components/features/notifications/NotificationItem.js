import React from 'react'

export default function NotificationItem({ notification, onAccept, onDecline }) {
  return (
    <div className="flex items-start justify-between border-b p-3">
      <div>
        <div className="text-sm font-medium">{notification.title || 'Notification'}</div>
        <div className="text-xs text-gray-500">{notification.body}</div>
      </div>
      {notification.type === 'group_invitation' && (
        <div className="flex gap-2">
          <button
            onClick={() => onAccept(notification)}
            className="rounded bg-green-600 px-2 py-1 text-white"
          >
            Accept
          </button>
          <button onClick={() => onDecline(notification)} className="rounded border px-2 py-1">
            Decline
          </button>
        </div>
      )}
    </div>
  )
}
