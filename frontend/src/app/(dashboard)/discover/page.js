'use client'
'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { apiClient, followUser, unfollowUser } from '@/lib/apiClient'

export default function DiscoverPage() {
  const [users, setUsers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [actionLoading, setActionLoading] = useState({})
  const [error, setError] = useState('')

  const observer = useRef()

  // Debounce: update debouncedQuery 300ms after the user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
      setPage(1)
    }, 300)
      setDebouncedQuery(searchQuery)
      setPage(1)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Infinite scroll: load the next page once the last card is visible
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

  useEffect(() => {
    return () => observer.current?.disconnect()
  }, [])

  useEffect(() => {
    let cancelled = false

    async function fetchUsers() {
      try {
        setLoading(true)
        setError('')

        // There is no documented /api/users/discover endpoint; falling back
        // to /api/users with search/page/limit query params, matching the
        // GET /api/users/:id pattern's base path.
        const { data } = await apiClient.get('/users', {
          params: { search: debouncedQuery, page, limit: 12 },
        })

        if (cancelled) return

        const incomingUsers = data?.users || []
        setUsers((prev) => (page === 1 ? incomingUsers : [...prev, ...incomingUsers]))
        setHasMore(incomingUsers.length === 12)
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.message || 'Could not load users.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    }

    fetchUsers()
    return () => {
      cancelled = true
    }
  }, [debouncedQuery, page])

  async function handleFollowToggle(userId, currentStatus) {
    try {
      setActionLoading((prev) => ({ ...prev, [userId]: true }))

      if (currentStatus) {
        await unfollowUser(userId)
      } else {
        await followUser(userId)
      }

      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId ? { ...user, isFollowing: !currentStatus } : user
        )
      )
      )
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not update follow status.')
    } finally {
      setActionLoading((prev) => ({ ...prev, [userId]: false }))
      setActionLoading((prev) => ({ ...prev, [userId]: false }))
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Discover People</h1>
        <p className="text-sm text-gray-500">Find and follow profiles across the network.</p>
      </div>

      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search by name or nickname..."
        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-black shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
      />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {users.length === 0 && !loading ? (
        <div className="rounded-xl border border-gray-100 bg-white py-16 text-center shadow-sm">
          <p className="font-medium text-gray-500">No profiles matched your search.</p>
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
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.username}
                      className="h-11 w-11 flex-shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 text-sm font-bold uppercase text-white">
                      {user.username?.[0]}
                    </div>
                  )}
                  <div className="truncate">
                    <h3 className="truncate text-sm font-semibold text-gray-900">
                      {user.username}
                    </h3>
                    <p className="truncate text-xs text-gray-400">
                      {user.fullName || 'Network peer'}
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
            )
          })}
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="flex animate-pulse items-center justify-between rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center space-x-3">
                <div className="h-11 w-11 rounded-full bg-gray-200" />
                <div className="space-y-2">
                  <div className="h-3 w-20 rounded bg-gray-200" />
                  <div className="h-2 w-12 rounded bg-gray-200" />
                </div>
              </div>
              <div className="h-7 w-16 rounded-md bg-gray-200" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
  )
}