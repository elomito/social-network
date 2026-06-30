'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Avatar from '@/components/ui/Avatar'

const sampleUsers = [
  {
    id: '1',
    username: 'alice',
    fullName: 'Alice Johnson',
    isFollowing: false,
    bio: 'Full-stack developer & open source enthusiast',
  },
  {
    id: '2',
    username: 'bob',
    fullName: 'Bob Smith',
    isFollowing: false,
    bio: 'UX Designer passionate about accessibility',
  },
  {
    id: '3',
    username: 'charlie',
    fullName: 'Charlie Brown',
    isFollowing: true,
    bio: 'Data scientist & machine learning engineer',
  },
  {
    id: '4',
    username: 'diana',
    fullName: 'Diana Prince',
    isFollowing: false,
    bio: 'Product manager building the future',
  },
  {
    id: '5',
    username: 'evan',
    fullName: 'Evan Wright',
    isFollowing: false,
    bio: 'DevOps engineer & cloud architect',
  },
  {
    id: '6',
    username: 'fiona',
    fullName: 'Fiona Green',
    isFollowing: true,
    bio: 'Mobile developer | React Native',
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

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
      setPage(1)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

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
    const fetchUsers = async () => {
      try {
        setLoading(true)
        const response = await fetch(
          `/api/users/discover?query=${encodeURIComponent(debouncedQuery)}`,
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

  const handleFollowToggle = async (userId, currentStatus) => {
    try {
      setActionLoading((prev) => ({ ...prev, [userId]: true }))

      const endpoint = currentStatus ? `/api/unfollow?id=${userId}` : `/api/follow?id=${userId}`
      const response = await fetch(`${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      if (!response.ok) throw new Error('Action execution failed.')

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

  const displayUsers = users.length > 0 ? users : sampleUsers

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Discover People</h1>
        <p className="mt-1 text-sm text-gray-500">
          Find and connect with amazing people in your network.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
          <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name or username..."
          className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-12 pr-4 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition-all duration-200 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
      </div>

      {/* Results */}
      {displayUsers.length === 0 && !loading ? (
        <div className="rounded-2xl border border-gray-100 bg-white py-16 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">No users found</h3>
          <p className="mt-1 text-sm text-gray-500">Try adjusting your search query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {displayUsers.map((user, index) => {
            const isLast = displayUsers.length === index + 1
            return (
              <div
                key={user.id}
                ref={isLast ? lastUserElementRef : null}
                className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md"
              >
                <div className="flex flex-col items-center text-center">
                  <Avatar
                    src={null}
                    alt={user.fullName}
                    fallback={user.fullName[0]}
                    size="xl"
                    className="mb-3"
                  />
                  <h3 className="text-base font-semibold text-gray-900">{user.fullName}</h3>
                  <p className="text-sm text-gray-500">@{user.username}</p>
                  {user.bio && (
                    <p className="mt-2 line-clamp-2 text-xs text-gray-400">{user.bio}</p>
                  )}
                  <button
                    type="button"
                    disabled={actionLoading[user.id]}
                    onClick={() => handleFollowToggle(user.id, user.isFollowing)}
                    className={`mt-4 w-full rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 active:scale-95 ${
                      user.isFollowing
                        ? 'border border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-500/30 hover:shadow-md hover:shadow-blue-500/40'
                    }`}
                  >
                    {actionLoading[user.id] ? '...' : user.isFollowing ? 'Following' : 'Follow'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm animate-pulse"
            >
              <div className="flex flex-col items-center text-center">
                <div className="mb-3 h-16 w-16 rounded-full bg-gray-200" />
                <div className="h-4 w-24 rounded bg-gray-200" />
                <div className="mt-1 h-3 w-16 rounded bg-gray-200" />
                <div className="mt-4 h-10 w-full rounded-xl bg-gray-200" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
