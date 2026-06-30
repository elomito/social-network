// src/components/layout/RightSidebar.js
'use client'

import React from 'react'

const trendingTopics = [
  { id: 1, name: '#SocialNetwork', posts: '1.2K posts' },
  { id: 2, name: '#WebDevelopment', posts: '856 posts' },
  { id: 3, name: '#NextJS', posts: '423 posts' },
  { id: 4, name: '#React', posts: '312 posts' },
]

const suggestedUsers = [
  { id: 1, name: 'Alex Chen', username: '@alexc', mutual: '2 mutual connections' },
  { id: 2, name: 'Maria Garcia', username: '@mariag', mutual: '5 mutual connections' },
  { id: 3, name: 'David Kim', username: '@davidk', mutual: '1 mutual connection' },
]

export default function RightSidebar() {
  return (
    <div className="space-y-4 max-w-2xl mx-auto p-4 bg-white shadow-lg rounded-lg">
      {/* TRENDING SECTION */}
      <div className="rounded-lg bg-gray-50 p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Trending Topics</h3>
        <div className="space-y-2">
          {trendingTopics.map((topic) => (
            <div key={topic.id} className="rounded p-2 hover:bg-gray-100">
              <div className="text-sm font-medium text-blue-600">{topic.name}</div>
              <div className="text-xs text-gray-500">{topic.posts}</div>
            </div>
          ))}
        </div>
      </div>

      {/* SUGGESTED USERS SECTION */}
      <div className="rounded-lg bg-gray-50 p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Suggested for You</h3>
        <div className="space-y-3">
          {suggestedUsers.map((user) => (
            <div key={user.id} className="flex items-center justify-between p-2 rounded hover:bg-gray-100">
              <div className="flex items-center space-x-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-xs font-bold text-white">
                  {user.name[0]}
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">{user.name}</div>
                  <div className="text-xs text-gray-500">{user.mutual}</div>
                </div>
              </div>
              <button className="rounded-full bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700">
                Follow
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
