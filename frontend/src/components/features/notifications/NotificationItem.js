import React from 'react'
import Link from 'next/link'

export default function NotificationItem({ notification, onAccept, onDecline }) {
  return (
    <div className="flex items-start justify-between border-b p-3 bg-white hover:bg-gray-50 transition-colors">
      <div className="flex-1 pr-4">
        <div className="text-sm font-medium text-gray-900">{notification.title || 'Notification'}</div>
        <div className="text-xs text-gray-500 mt-0.5">{notification.body}</div>
      </div>

      {/* Action Button Controls Based on Notification Type */}
      <div className="flex shrink-0 items-center gap-2">
        
        {/* Type A: Group Invitations & Follow Requests (Both need Accept/Decline action buttons) */}
        {(notification.type === 'group_invitation' || notification.type === 'follow_request') && (
          <div className="flex gap-2">
            <button
              onClick={() => onAccept(notification)}
              className="rounded bg-indigo-600 px-2 py-1 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500"
            >
              Accept
            </button>
            <button 
              onClick={() => onDecline(notification)} 
              className="rounded border border-gray-300 bg-white px-2 py-1 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Decline
            </button>
          </div>
        )}

        {/* Type B: Group Join Requests (Admin action control point) */}
        {notification.type === 'group_join_request' && (
          <div className="flex gap-2">
            <button
              onClick={() => onAccept(notification)}
              className="rounded bg-indigo-600 px-2 py-1 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500"
            >
              Approve
            </button>
            <button 
              onClick={() => onDecline(notification)} 
              className="rounded border border-gray-300 bg-white px-2 py-1 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Reject
            </button>
          </div>
        )}

        {/* Type C: Event Created (Needs a direct redirect link to the group/event context) */}
        {notification.type === 'event_created' && notification.groupId && (
          <Link
            href={`/groups/${notification.groupId}`}
            className="rounded border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
          >
            View Event
          </Link>
        )}
        
      </div>
    </div>
  )
}