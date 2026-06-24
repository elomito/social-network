'use client'

import React, { useEffect, useState, useContext } from 'react'
import NotificationItem from '../../../components/features/notifications/NotificationItem'
import { getNotifications } from '../../../lib/apiClient'

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    async function load() {
      try {
        const notifs = await getNotifications()
        setNotifications(notifs)
      } catch (e) {
        console.error(e)
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
      const notifs = await getNotifications()
      setNotifications(notifs)
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
      const notifs = await getNotifications()
      setNotifications(notifs)
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="p-6">
      <h2 className="mb-4 text-lg font-semibold">Notifications</h2>
      <div className="rounded-lg bg-white shadow">
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
