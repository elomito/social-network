'use client'

import React from 'react'
import Link from 'next/link'

const trendingTopics = [
  { id: 1, name: '#SocialNetwork', posts: '1.2K posts', trend: 'up' },
  { id: 2, name: '#WebDevelopment', posts: '856 posts', trend: 'up' },
  { id: 3, name: '#NextJS', posts: '423 posts', trend: 'stable' },
  { id: 4, name: '#React', posts: '312 posts', trend: 'up' },
  { id: 5, name: '#DesignSystems', posts: '198 posts', trend: 'new' },
]

const suggestedUsers = [
  { id: 1, name: 'Alex Chen', username: '@alexc', mutual: '2 mutual', avatar: null },
  { id: 2, name: 'Maria Garcia', username: '@mariag', mutual: '5 mutual', avatar: null },
  { id: 3, name: 'David Kim', username: '@davidk', mutual: '1 mutual', avatar: null },
  { id: 4, name: 'Sarah Wilson', username: '@sarahw', mutual: '3 mutual', avatar: null },
]

export default function RightSidebar() {
  return (
    <div className="space-y-4">
      {/* Trending Topics */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-900">Trending Topics</h3>
        </div>
        <div className="p-2">
          {trendingTopics.map((topic, index) => (
            <Link
              key={topic.id}
              href={`/discover?q=${encodeURIComponent(topic.name)}`}
              className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-gray-50"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-100 to-pink-100 text-xs font-bold text-orange-600">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900 group-hover:text-blue-600">
                  {topic.name}
                </p>
                <p className="text-xs text-gray-500">{topic.posts}</p>
              </div>
              {topic.trend === 'up' && (
                <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                </svg>
              )}
              {topic.trend === 'new' && (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">New</span>
              )}
            </Link>
          ))}
        </div>
        <div className="border-t border-gray-100 px-4 py-2">
          <Link href="/discover" className="text-sm font-medium text-blue-600 hover:text-blue-700">
            Show more
          </Link>
        </div>
      </div>

      {/* Suggested Users */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-900">Who to Follow</h3>
        </div>
        <div className="p-2">
          {suggestedUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-gray-50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white shadow-sm">
                {user.name[0]}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{user.name}</p>
                <p className="truncate text-xs text-gray-500">{user.mutual} connections</p>
              </div>
              <button className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 active:scale-95">
                Follow
              </button>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-100 px-4 py-2">
          <Link href="/discover" className="text-sm font-medium text-blue-600 hover:text-blue-700">
            Show more
          </Link>
        </div>
      </div>

      {/* Footer Links */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400">
          <Link href="#" className="hover:text-gray-600 hover:underline">About</Link>
          <Link href="#" className="hover:text-gray-600 hover:underline">Help</Link>
          <Link href="#" className="hover:text-gray-600 hover:underline">Privacy</Link>
          <Link href="#" className="hover:text-gray-600 hover:underline">Terms</Link>
        </div>
        <p className="mt-2 text-xs text-gray-400">© 2026 SocialHub</p>
      </div>
    </div>
  )
}
