'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useNotifications } from '@/context/NotificationContext'
import { useAuth } from '@/hooks/useAuth'
import NotificationDropdown from '../features/notifications/NotificationDropdown'

export default function Navbar() {
  const [isNotifOpen, setIsNotifOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const { unreadCount } = useNotifications()
  const { user, logout, isAuthenticated } = useAuth()
  const notifRef = useRef(null)
  const profileRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setIsNotifOpen(false)
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    await logout()
    setIsProfileOpen(false)
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-gray-200/80 bg-white/80 px-6 shadow-sm backdrop-blur-xl">
      {/* Search Bar */}
      <div className="relative w-full max-w-md">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search posts, people, groups..."
          className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 transition-all duration-200 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => {
              setIsNotifOpen(!isNotifOpen)
              setIsProfileOpen(false)
            }}
            className="relative rounded-xl p-2.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 focus:outline-none"
            aria-label="Notifications"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-r from-red-500 to-pink-500 px-1 text-xs font-bold text-white ring-2 ring-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          {isNotifOpen && <NotificationDropdown onClose={() => setIsNotifOpen(false)} />}
        </div>

        {/* Profile Menu */}
        {isAuthenticated && (
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => {
                setIsProfileOpen(!isProfileOpen)
                setIsNotifOpen(false)
              }}
              className="flex items-center gap-2 rounded-xl p-1.5 pr-3 transition-colors hover:bg-gray-100 focus:outline-none"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white shadow-sm">
                {user?.username?.[0]?.toUpperCase() || 'U'}
              </div>
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl border border-gray-200 bg-white py-2 shadow-xl ring-1 ring-black/5">
                <div className="border-b border-gray-100 px-4 py-3">
                  <p className="text-sm font-semibold text-gray-900">{user?.username || 'User'}</p>
                  <p className="text-xs text-gray-500">{user?.email || ''}</p>
                </div>
                <div className="py-1">
                  <a
                    href="/profile/me"
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                    onClick={() => setIsProfileOpen(false)}
                  >
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                    Your Profile
                  </a>
                  <a
                    href="/settings"
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                    onClick={() => setIsProfileOpen(false)}
                  >
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003 1.008c-.253.255-.427.577-.476.914l-.237 1.341c-.042.242.085.482.33.612.245.13.547.1.754-.053l1.102-.828c.315-.237.527-.576.599-.925.072-.349.023-.718-.165-1.058l-.295-.51a1.125 1.125 0 01.555-1.433l1.335-1.337c.16-.16.295-.347.395-.553.1-.206.143-.428.123-.64l-.226-1.405a1.125 1.125 0 01-.926-1.187l.003-.003c.01-.01.02-.02.03-.03l-.003-.003a1.125 1.125 0 01-.927-1.187l-.226-1.405c-.02-.212-.023-.434.123-.64.1-.206.235-.393.395-.553l1.335-1.337a1.125 1.125 0 01.555-1.433l-.295-.51c-.188-.34-.237-.709-.165-1.058.072-.349.284-.688.599-.925l1.102-.828c.207-.153.51-.183.754-.053.245.13.372.37.33.612l-.237 1.341c-.05.337-.223.66-.476.914l-1.003 1.008a1.125 1.125 0 01-.26 1.431l1.296 2.247a1.125 1.125 0 01.55 1.43l-1.003 1.008c-.253.255-.427.577-.476.914l-.237 1.341c-.042.242.085.482.33.612.245.13.547.1.754-.053l1.102-.828c.315-.237.527-.576.599-.925.072-.349.023-.718-.165-1.058l-.295-.51a1.125 1.125 0 01.555-1.433l1.335-1.337z" />
                    </svg>
                    Settings
                  </a>
                </div>
                <div className="border-t border-gray-100 pt-1">
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                    </svg>
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
