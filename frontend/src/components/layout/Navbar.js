'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useNotifications } from '@/context/NotificationContext'
import { useAuth } from '@/hooks/useAuth'
import NotificationDropdown from '../features/notifications/NotificationDropdown'

export default function Navbar() {
  const pathname = usePathname()
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

  // Active pill mapping matching the exact style metrics inside feed.png
  const getTabClass = (path) => {
    const isActive = pathname === path
    return `flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-full transition-all duration-150 ${
      isActive
        ? 'bg-indigo-50 text-indigo-600 shadow-sm'
        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
    }`
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full shrink-0 items-center justify-between border-b border-gray-100 bg-white px-8 shadow-sm">
      
      {/* 1. BRAND LOGO & SEARCH BAR AREA */}
      <div className="flex items-center gap-6 flex-1 max-w-md">
        <Link href="/feed" className="text-sm font-black tracking-widest text-indigo-600 uppercase">
          Social Network
        </Link>
        <div className="relative w-full max-w-xs">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2.2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search people, groups, posts..."
            className="w-full bg-gray-50 border border-transparent rounded-full py-1.5 pl-9 pr-4 text-xs text-gray-900 placeholder-gray-400 transition-all duration-150 focus:bg-white focus:border-indigo-100 focus:outline-none focus:ring-0"
          />
        </div>
      </div>

      {/* 2. MID SECTION NAVIGATION PILLS */}
      <nav className="flex items-center gap-1">
        <Link href="/feed" className={getTabClass('/feed')}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
          <span>Feed</span>
        </Link>
        
        <Link href="/groups" className={getTabClass('/groups')}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94-3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4 0 2.25 2.25 0 014 0zm-13.5 0a2.25 2.25 0 11-4 0 2.25 2.25 0 014 0z" />
          </svg>
          <span>Groups</span>
        </Link>

        <Link href="/explore" className={getTabClass('/explore')}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A8.959 8.959 0 013 12c0-.778.099-1.533.284-2.253" />
          </svg>
          <span>Explore</span>
        </Link>

        <Link href="/profile" className={getTabClass('/profile')}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
          <span>Profile</span>
        </Link>
      </nav>

      {/* 3. RIGHT UTILITIES & SESSION ROW */}
      <div className="flex items-center gap-3.5 flex-1 justify-end">
        
        {/* Real-time Notifications Bell Trigger */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => {
              setIsNotifOpen(!isNotifOpen)
              setIsProfileOpen(false)
            }}
            className="relative p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-50 focus:outline-none transition-all duration-150"
            aria-label="Notifications"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            )}
          </button>
          {isNotifOpen && <NotificationDropdown onClose={() => setIsNotifOpen(false)} />}
        </div>

        {/* Messaging Router Shortcut Link */}
        <Link href="/messages" className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-50 transition-all duration-150">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a.75.75 0 01-1.074-.765 11.99 11.99 0 001.318-3.328A8.471 8.471 0 013 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
          </svg>
        </Link>

        {/* Profile Avatar / Expandable Context Action Menu */}
        {isAuthenticated && (
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => {
                setIsProfileOpen(!isProfileOpen)
                setIsNotifOpen(false)
              }}
              className="flex items-center gap-1 focus:outline-none"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white shadow-inner select-none">
                {user?.username?.[0]?.toUpperCase() || 'JD'}
              </div>
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl border border-gray-100 bg-white py-1.5 shadow-xl ring-1 ring-black/5 z-50">
                <div className="border-b border-gray-100 px-4 py-2.5">
                  <p className="text-sm font-semibold text-gray-900">{user?.username || 'User'}</p>
                  <p className="text-xs text-gray-400 truncate">{user?.email || ''}</p>
                </div>
                <div className="py-1">
                  <Link
                    href="/profile/me"
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50"
                    onClick={() => setIsProfileOpen(false)}
                  >
                    Your Profile
                  </Link>
                  <Link
                    href="/settings"
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50"
                    onClick={() => setIsProfileOpen(false)}
                  >
                    Settings
                  </Link>
                </div>
                <div className="border-t border-gray-100 pt-1 mt-1">
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                  >
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