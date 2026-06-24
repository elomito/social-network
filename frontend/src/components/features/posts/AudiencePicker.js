'use client'

import React, { useState, useEffect } from 'react'

export default function AudiencePicker({ privacy, onAudienceChange, onError }) {
  const [followers, setFollowers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFollowers, setSelectedFollowers] = useState([])
  const [loading, setLoading] = useState(false)

  // 1. Fetch current followers matching your Go backend relationship endpoints
  useEffect(() => {
    if (privacy !== 'private') return

    const fetchFollowers = async () => {
      try {
        setLoading(true)
        const token = document.cookie
          .split('; ')
          .find((row) => row.startsWith('token='))
          ?.split('=')[1]

        const response = await fetch('http://localhost:8080/api/followers', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) throw new Error('Failed to load followers list.')

        const data = await response.json()
        setFollowers(data.followers || [])
      } catch (err) {
        if (onError) onError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchFollowers()
  }, [privacy])

  // 2. Bubble selection arrays back up to the main Composer state context
  useEffect(() => {
    if (privacy === 'private') {
      onAudienceChange(selectedFollowers.map((f) => f.id))
      if (selectedFollowers.length === 0) {
        if (onError) onError('Private posts require at least one selected follower.')
      } else {
        if (onError) onError('')
      }
    } else {
      onAudienceChange([]) // Clear if toggled away
      if (onError) onError('')
    }
  }, [selectedFollowers, privacy])

  // Only display component if privacy state is explicitly marked 'private'
  if (privacy !== 'private') return null

  const filteredFollowers = followers.filter(
    (follower) =>
      follower.username.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !selectedFollowers.some((selected) => selected.id === follower.id)
  )

  const handleSelect = (follower) => {
    setSelectedFollowers([...selectedFollowers, follower])
    setSearchQuery('')
  }

  const handleRemove = (followerId) => {
    setSelectedFollowers(selectedFollowers.filter((f) => f.id !== followerId))
  }

  return (
    <div className="animate-fadeIn space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
        Custom Private Audience Selection
      </label>

      {/* CONFIRMED AUDIENCE CHIPS LIST */}
      <div className="flex flex-wrap gap-1.5">
        {selectedFollowers.length === 0 ? (
          <span className="rounded border border-amber-100 bg-amber-50 px-2 py-1 text-xs text-amber-600">
            ⚠️ Select at least one follower who can view this post.
          </span>
        ) : (
          selectedFollowers.map((follower) => (
            <div
              key={follower.id}
              className="flex items-center space-x-1 rounded-full border border-blue-200 bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800"
            >
              <span>{follower.username}</span>
              <button
                type="button"
                onClick={() => handleRemove(follower.id)}
                className="ml-1 text-sm font-bold hover:text-blue-900 focus:outline-none"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>

      {/* SEARCHABLE MULTI-SELECT DROPDOWN INPUT */}
      <div className="relative">
        <input
          type="text"
          placeholder={loading ? 'Loading your followers...' : 'Search followers by nickname...'}
          disabled={loading}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-black shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        />

        {searchQuery && (
          <div className="absolute z-10 mt-1 max-h-40 w-full overflow-y-auto rounded border border-gray-200 bg-white shadow-lg">
            {filteredFollowers.length === 0 ? (
              <div className="p-2 text-center text-xs text-gray-500">
                No matching followers found
              </div>
            ) : (
              filteredFollowers.map((follower) => (
                <button
                  key={follower.id}
                  type="button"
                  onClick={() => handleSelect(follower)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-xs text-gray-800 transition hover:bg-gray-100"
                >
                  <span>{follower.username}</span>
                  <span className="text-[10px] text-gray-400">Select</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
