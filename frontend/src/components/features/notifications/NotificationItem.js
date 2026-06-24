import React from 'react'

export default function NotificationItem({ notification, onAccept, onDecline }) {
  return (
    <div className="p-3 border-b flex items-start justify-between">
      <div>
        <div className="text-sm font-medium">{notification.title || 'Notification'}</div>
        <div className="text-xs text-gray-500">{notification.body}</div>
      </div>
      {notification.type === 'group_invitation' && (
        <div className="flex gap-2">
          <button onClick={() => onAccept(notification)} className="px-2 py-1 bg-green-600 text-white rounded">Accept</button>
          <button onClick={() => onDecline(notification)} className="px-2 py-1 border rounded">Decline</button>
        </div>
      )}
    </div>
  )
}
