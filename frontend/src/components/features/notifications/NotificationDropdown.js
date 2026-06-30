'use client'

import React, { useRef, useEffect } from 'react'
import { useNotifications } from '@/context/NotificationContext'
import NotificationItem from './NotificationItem'

export default function NotificationDropdown({ onClose }) {
  const dropdownRef = useRef(null)
  const { notifications, markAsRead, markAllAsRead } = useNotifications()

  // Close dropdown instantly if user clicks outside the panel element window area
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
      className="absolute right-0 z-50 mt-2 flex max-h-[480px] w-96 flex-col overflow-hidden rounded-lg bg-white shadow-xl ring-1 ring-black ring-opacity-5"
    >
      {/* Header section control buttons */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
        <span className="text-sm font-semibold text-gray-700">Notifications</span>
        {notifications.some((n) => !n.read) && (
          <button
            onClick={markAllAsRead}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Feed list timeline stream container */}
      <div className="flex-1 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">No notifications yet.</div>
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
