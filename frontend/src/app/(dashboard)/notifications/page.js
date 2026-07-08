'use client'

import React, { useState, useEffect } from 'react'
import NotificationItem from '@/components/features/notifications/NotificationItem'
import { useNotifications } from '@/context/NotificationContext'
import {
  acceptFollowRequest,
  declineFollowRequest,
  TODO_BACKEND_respondToGroupInvitation,
  TODO_BACKEND_respondToJoinRequest,
} from '@/lib/apiClient'

export default function NotificationsPage() {
  const { notifications, markAsRead, refresh } = useNotifications()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [refresh])

  async function handleAccept(notification) {
    try {
      if (notification.type === 'follow_request') {
        await acceptFollowRequest(notification.from_user_id)
      } else if (notification.type === 'group_invitation') {
        await TODO_BACKEND_respondToGroupInvitation('any', notification.reference_id, true)
      } else if (notification.type === 'group_join_request') {
        await TODO_BACKEND_respondToJoinRequest('any', notification.reference_id, true)
      }
      await markAsRead(notification.id)
      await refresh()
    } catch (err) {
      console.error('Failed to accept notification action:', err)
    }
  }

  async function handleDecline(notification) {
    try {
      if (notification.type === 'follow_request') {
        await declineFollowRequest(notification.from_user_id)
      } else if (notification.type === 'group_invitation') {
        await TODO_BACKEND_respondToGroupInvitation('any', notification.reference_id, false)
      } else if (notification.type === 'group_join_request') {
        await TODO_BACKEND_respondToJoinRequest('any', notification.reference_id, false)
      }
      await markAsRead(notification.id)
      await refresh()
    } catch (err) {
      console.error('Failed to decline notification action:', err)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-4">
            <div className="h-6 w-32 rounded bg-gray-200 animate-pulse" />
          </div>
          <div className="p-4 space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 rounded bg-gray-200 animate-pulse" />
                  <div className="h-3 w-1/2 rounded bg-gray-200 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h2 className="mb-4 text-lg font-semibold">Notifications</h2>
      <div className="rounded-lg bg-white shadow">
        {notifications.length === 0 && (
          <p className="p-6 text-center text-sm text-gray-500">No notifications yet.</p>
        )}
        {notifications.map((n) => (
          <NotificationItem
            key={n.id}
            notification={n}
            onAccept={handleAccept}
            onDecline={handleDecline}
          />
        ))}
      </div>
    </div>
  )
}