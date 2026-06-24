'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import PostCard from '@/components/features/posts/PostCard'

export default function FeedPage() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState('')

  const observer = useRef()

  // Infinite Scroll: Tracks when the last post card enters the browser viewport
  const lastPostElementRef = useCallback(
    (node) => {
      if (loading || loadingMore) return
      if (observer.current) observer.current.disconnect()

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((prevPage) => prevPage + 1)
        }
      })

      if (node) observer.current.observe(node)
    },
    [loading, loadingMore, hasMore]
  )

  // Core API Integration matching your Go backend setup
  const fetchFeedPosts = async (pageNumber, isInitialFetch = false) => {
    try {
      if (isInitialFetch) setLoading(true)
      else setLoadingMore(true)

      setError('')

      // Pull the auth token out of local cookie storage
      const token = document.cookie
        .split('; ')
        .find((row) => row.startsWith('token='))
        ?.split('=')[1]

      const response = await fetch(
        `http://localhost:8080/api/posts/feed?page=${pageNumber}&limit=10`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to retrieve your social feed.')
      }

      const data = await response.json()
      const fetchedPosts = data.posts || []

      setPosts((prevPosts) => {
        return isInitialFetch ? fetchedPosts : [...prevPosts, ...fetchedPosts]
      })

      // If the backend sends fewer items than our limit, we have hit the end of the line
      setHasMore(fetchedPosts.length === 10)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  // Triggers whenever the page number increments via scroll intersection
  useEffect(() => {
    fetchFeedPosts(page, page === 1)
  }, [page])

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      {/* COMPOSER AT THE TOP (#68) */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
        <p className="text-sm text-gray-400">What's on your mind? (Composer UI Placeholder)</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-100 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* FEED CONTEXT STREAM */}
      <div className="space-y-4">
        {loading ? (
          /* LOADING SKELETON STATE */
          [1, 2, 3].map((n) => (
            <div key={n} className="animate-pulse space-y-4 rounded-lg bg-white p-6 shadow">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-gray-200"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/4 rounded bg-gray-200"></div>
                  <div className="h-3 w-1/6 rounded bg-gray-200"></div>
                </div>
              </div>
              <div className="h-4 w-full rounded bg-gray-200"></div>
              <div className="h-4 w-5/6 rounded bg-gray-200"></div>
            </div>
          ))
        ) : posts.length === 0 ? (
          /* EMPTY STATE */
          <div className="rounded-lg border border-gray-100 bg-white py-12 text-center shadow">
            <p className="text-lg font-medium text-gray-500">Your feed is quiet right now.</p>
            <p className="mt-1 text-sm text-gray-400">Follow people to see posts here!</p>
          </div>
        ) : (
          /* LIVE POSTS STREAM */
          posts.map((post, index) => {
            if (posts.length === index + 1) {
              return (
                <div ref={lastPostElementRef} key={post.id}>
                  <PostCard post={post} />
                </div>
              )
            } else {
              return <PostCard key={post.id} post={post} />
            }
          })
        )}

        {/* LOADING MORE FOOTER SKELETON */}
        {loadingMore && (
          <div className="animate-pulse p-4 text-center text-sm text-gray-500">
            Loading older updates...
          </div>
        )}
      </div>
    </div>
  )
}
