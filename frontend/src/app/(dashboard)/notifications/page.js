'use client'

import React, { useEffect, useState } from 'react'
import NotificationItem from '../../../components/features/notifications/NotificationItem'

const notificationIcons = {
  follow_request: (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
      <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.095A7.46 7.46 0 0119 19.5c0 1.438-.52 2.75-1.375 3.75M4 19.235c-.46.46-.86.98-1.175 1.55" />
      </svg>
    </div>
  ),
  group_invitation: (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
      <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    </div>
  ),
  group_join_request: (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
      <svg className="h-5 w-5 text-orange-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.095A7.46 7.46 0 0119 19.5c0 1.438-.52 2.75-1.375 3.75M4 19.235c-.46.46-.86.98-1.175 1.55" />
      </svg>
    </div>
  ),
  event_created: (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
      <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    </div>
  ),
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const response = await fetch('/api/notifications', {
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
      const response = await fetch('/api/notifications', {
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
      const response = await fetch('/api/notifications', {
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
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-4">
          <h2 className="text-lg font-bold text-gray-900">Notifications</h2>
          <p className="text-sm text-gray-500">{notifications.length} notifications</p>
        </div>

        {notifications.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">No notifications yet</h3>
            <p className="mt-1 text-sm text-gray-500">We'll notify you when something happens.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((n) => (
              <div key={n.id} className="flex items-start gap-4 p-4 transition-colors hover:bg-gray-50">
                {notificationIcons[n.type] || (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                    <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                    </svg>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    {n.title || 'Notification'}
                  </div>
                  <div className="mt-0.5 text-xs text-gray-500">{n.body}</div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {(n.type === 'group_invitation' || n.type === 'follow_request') && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAccept(n)}
                        className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 transition-all hover:shadow-md hover:shadow-blue-500/30 active:scale-95"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleDecline(n)}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                      >
                        Decline
                      </button>
                    </div>
                  )}

                  {n.type === 'group_join_request' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAccept(n)}
                        className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 transition-all hover:shadow-md hover:shadow-blue-500/30 active:scale-95"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleDecline(n)}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                      >
                        Reject
                      </button>
                    </div>
                  )}

                  {n.type === 'event_created' && n.groupId && (
                    <a
                      href={`/groups/${n.groupId}`}
                      className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-100"
                    >
                      View Event
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
