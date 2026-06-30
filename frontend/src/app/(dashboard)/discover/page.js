'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'

// Sample users for demonstration (since backend doesn't have discover endpoint)
const sampleUsers = [
  {
    id: '1',
    username: 'alice',
    fullName: 'Alice Johnson',
    isFollowing: false,
  },
  {
    id: '2',
    username: 'bob',
    fullName: 'Bob Smith',
    isFollowing: false,
  },
  {
    id: '3',
    username: 'charlie',
    fullName: 'Charlie Brown',
    isFollowing: true,
  },
  {
    id: '4',
    username: 'diana',
    fullName: 'Diana Prince',
    isFollowing: false,
  },
]

export default function DiscoverPage() {
  const [users, setUsers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [actionLoading, setActionLoading] = useState({})

  const observer = useRef()

  // 1. Debounce Logic: Updates debouncedQuery 300ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
      setPage(1) // Reset back to page 1 whenever searching something new
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // 2. Infinite Scroll: Triggers loading the next batch when reaching the bottom
  const lastUserElementRef = useCallback(
    (node) => {
      if (loading) return
      if (observer.current) observer.current.disconnect()

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((prevPage) => prevPage + 1)
        }
      })

      if (node) observer.current.observe(node)
    },
    [loading, hasMore]
  )

  // 3. Core API Fetching
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true)
        const response = await fetch(
          `http://localhost:8080/api/users/discover?query=${encodeURIComponent(debouncedQuery)}`,
          {
            credentials: 'include',
          }
        )
        if (!response.ok) throw new Error('Failed to fetch network profiles.')
        const data = await response.json()
        const dataList = data || []
        setUsers((prevUsers) => {
          return page === 1 ? dataList : [...prevUsers, ...dataList]
        })
        setHasMore(false)
      } catch (err) {
        console.error(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [debouncedQuery, page])

  // 4. Follow/Unfollow Handler Action
  const handleFollowToggle = async (userId, currentStatus) => {
    try {
      setActionLoading((prev) => ({ ...prev, [userId]: true }))

      // Use correct endpoint format with query parameter
      const endpoint = currentStatus ? `/api/unfollow?id=${userId}` : `/api/follow?id=${userId}`
      const response = await fetch(`http://localhost:8080${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      if (!response.ok) throw new Error('Action execution failed.')

      // Refresh locally in-state instantly
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === userId ? { ...user, isFollowing: !currentStatus } : user
        )
      )
    } catch (err) {
      console.error(err.message)
    } finally {
      setActionLoading((prev) => ({ ...prev, [userId]: false }))
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Discover Creators</h1>
        <p className="text-sm text-gray-500">
          Explore and follow profiles around your workspace network.
        </p>
      </div>

      {/* SEARCH BAR INPUT */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search network profiles by name or nickname..."
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-black shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* DISCOVERY GRID TILES */}
      {users.length === 0 && !loading ? (
        <div className="rounded-xl border border-gray-100 bg-white py-16 text-center shadow-sm">
          <p className="font-medium text-gray-500">
            No network profiles matched your search parameters.
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Try check spelling adjustments or look for alternate nicknames.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {users.map((user, index) => {
            const isLast = users.length === index + 1
            return (
              <div
                key={user.id}
                ref={isLast ? lastUserElementRef : null}
                className="flex items-center justify-between space-x-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center space-x-3 overflow-hidden">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 text-sm font-bold uppercase text-white">
                    {user.username[0]}
                  </div>
                  <div className="truncate">
                    <h3 className="truncate text-sm font-semibold text-gray-900">
                      {user.username}
                    </h3>
                    <p className="truncate text-xs text-gray-400">
                      {user.fullName || 'Network Peer'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={actionLoading[user.id]}
                  onClick={() => handleFollowToggle(user.id, user.isFollowing)}
                  className={`flex-shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                    user.isFollowing
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : 'bg-blue-600 text-white shadow-sm hover:bg-blue-700'
                  }`}
                >
                  {actionLoading[user.id] ? '...' : user.isFollowing ? 'Unfollow' : 'Follow'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* PAGINATION PROGRESS BAR SKELETON */}
      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="flex animate-pulse items-center justify-between rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center space-x-3">
                <div className="h-11 w-11 rounded-full bg-gray-200"></div>
                <div className="space-y-2">
                  <div className="h-3 w-20 rounded bg-gray-200"></div>
                  <div className="h-2 w-12 rounded bg-gray-200"></div>
                </div>
              </div>
              <div className="h-7 w-16 rounded-md bg-gray-200"></div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
