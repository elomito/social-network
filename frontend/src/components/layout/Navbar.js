'use client'

import React, { useState } from 'react'
import { useNotifications } from '@/context/NotificationContext'
import NotificationDropdown from '../features/notifications/NotificationDropdown'

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const { unreadCount } = useNotifications()

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 shadow-sm">
      <div className="text-xl font-bold text-gray-900">SocialNetwork</div>

      <div className="flex items-center gap-4">
        {/* Persistent Badge Frame Trigger Point */}
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="relative rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none"
            aria-label="Toggle notifications menu panel options"
          >
            {/* Clean SVG Outline Representation Asset */}
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
              />
            </svg>

            {/* Unread Overlay Badges Counter Element Bubble */}
            {unreadCount > 0 && (
              <span className="text-xxs absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 font-bold text-white ring-2 ring-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Conditional Dropdown Visibility Rendering */}
          {isOpen && <NotificationDropdown onClose={() => setIsOpen(false)} />}
        </div>

        <div className="h-8 w-8 rounded-full bg-gray-200" />
      </div>
    </header>
  )
}
