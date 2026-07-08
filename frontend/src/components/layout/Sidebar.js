'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useNotifications } from '@/context/NotificationContext'
import useWebSocket from '@/hooks/useWebSocket'
import { getUnreadMessageCounts } from '@/lib/apiClient'

const NAV_ITEMS = [
  {
    href: '/feed',
    label: 'Feed',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
      />
    ),
  },
  {
    href: '/discover',
    label: 'Discover',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
      />
    ),
  },
  {
    href: '/groups',
    label: 'Groups',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
      />
    ),
  },
  {
    href: '/messages',
    label: 'Messages',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
      />
    ),
  },
  {
    href: '/notifications',
    label: 'Notifications',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
      />
    ),
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { unreadCount: notificationUnreadCount } = useNotifications?.() || { unreadCount: 0 }
  const [unreadCounts, setUnreadCounts] = useState({ private_unread: 0, group_unread: 0 })
  const { onMessage } = useWebSocket('*')

  useEffect(() => {
    let active = true
    async function loadCounts() {
      try {
        const counts = await getUnreadMessageCounts()
        if (active) {
          setUnreadCounts(counts)
        }
      } catch (err) {
        console.error('Failed to load unread message counts:', err)
      }
    }
    loadCounts()
    const interval = setInterval(loadCounts, 10000)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    const unsubscribe = onMessage((data) => {
      if (!data) return
      const type = data.type

      if (type === 'private_message') {
        if (pathname !== '/messages') {
          setUnreadCounts((prev) => ({
            ...prev,
            private_unread: prev.private_unread + 1,
          }))
        }
      } else if (type === 'group_message') {
        if (pathname !== '/messages') {
          setUnreadCounts((prev) => ({
            ...prev,
            group_unread: prev.group_unread + 1,
          }))
        }
      }
    })
    return unsubscribe
  }, [onMessage, pathname])

  return (
    <nav className="space-y-1">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`)

        let badgeCount = 0
        if (item.href === '/notifications') badgeCount = notificationUnreadCount
        if (item.href === '/messages') badgeCount = unreadCounts.private_unread
        if (item.href === '/groups') badgeCount = unreadCounts.group_unread

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition ${
              isActive
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <span className="flex items-center gap-3">
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
              >
                {item.icon}
              </svg>
              {item.label}
            </span>

            {badgeCount > 0 && (
              <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
                {badgeCount > 99 ? '99+' : badgeCount}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}