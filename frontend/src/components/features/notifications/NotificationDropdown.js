'use client'

import React, { useRef, useEffect } from 'react'
import { useNotifications } from '@/context/NotificationContext'
import NotificationItem from './NotificationItem'

export default function NotificationDropdown({ onClose }) {
  const dropdownRef = useRef(null)
  const { notifications, markAsRead, markAllAsRead } = useNotifications()

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 z-50 mt-2 w-96 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl ring-1 ring-black/5"
    >
      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 px-4 py-3">
        <span className="text-sm font-bold text-gray-900">Notifications</span>
        {notifications.some((n) => !n.read) && (
          <button
            onClick={markAllAsRead}
            className="text-xs font-semibold text-blue-600 transition hover:text-blue-700"
          >
            Mark all as read
          </button>
        )}
      </div>

      <div className="max-h-[480px] overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
            </div>
            No notifications yet
          </div>
        ) : (
          notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkAsRead={markAsRead}
            />
          ))
        )}
      </div>
    </div>
  )
}
