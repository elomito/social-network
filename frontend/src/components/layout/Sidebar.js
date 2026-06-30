'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/feed', label: 'Home', icon: '🏠' },
  { href: '/discover', label: 'Discover', icon: '🔍' },
  { href: '/groups', label: 'Groups', icon: '👥' },
  { href: '/messages', label: 'Messages', icon: '💬' },
  { href: '/notifications', label: 'Notifications', icon: '🔔' },
  { href: '/profile/me', label: 'Profile', icon: '👤' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
