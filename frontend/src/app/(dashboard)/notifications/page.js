'use client'

import React, { useEffect, useState } from 'react'
import NotificationItem from '../../../components/features/notifications/NotificationItem'

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const response = await fetch('http://localhost:8080/api/notifications', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        })

        if (!response.ok) {
          throw new Error('Failed to load notifications')
        }

        const data = await response.json()
        setNotifications(data || [])
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleAccept(n) {
    try {
      if (n.type === 'group_invitation') {
        await fetch(`/api/groups/${n.group_id}/invitations/${n.id}/respond`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accept: true }),
        })
      }
      // refresh
      const response = await fetch('http://localhost:8080/api/notifications', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setNotifications(data || [])
      }
    } catch (e) {
      console.error(e)
    }
  }

  async function handleDecline(n) {
    try {
      if (n.type === 'group_invitation') {
        await fetch(`/api/groups/${n.group_id}/invitations/${n.id}/respond`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accept: false }),
        })
      }
      const response = await fetch('http://localhost:8080/api/notifications', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setNotifications(data || [])
      }
    } catch (e) {
      console.error(e)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-16 rounded-lg bg-gray-200"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h2 className="mb-4 text-lg font-semibold">Notifications</h2>
      <div className="rounded-lg bg-white shadow">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No notifications yet.</div>
        ) : (
          notifications.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              onAccept={handleAccept}
              onDecline={handleDecline}
            />
          ))
        )}
      </div>
    </div>
  )
}
