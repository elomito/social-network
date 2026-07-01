// src/app/(dashboard)/feed/page.js
'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import PostCard from '@/components/features/posts/PostCard'
import { getFeed } from '@/lib/apiClient'

export default function FeedPage() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState('')

  const observer = useRef()

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

  useEffect(() => {
    return () => observer.current?.disconnect()
  }, [])

  useEffect(() => {
    let cancelled = false

    async function fetchFeedPosts() {
      const isInitialFetch = page === 1
      try {
        if (isInitialFetch) setLoading(true)
        else setLoadingMore(true)
        setError('')

        // GET /api/posts is the documented feed endpoint (docs/api.md).
        // Pagination isn't documented, but page/limit are sent as additive
        // query params the backend can ignore safely if unsupported.
        const data = await getFeed({ page, limit: 10 })
        if (cancelled) return

        const fetchedPosts = data?.posts || data || []
        setPosts((prev) => (isInitialFetch ? fetchedPosts : [...prev, ...fetchedPosts]))
        setHasMore(fetchedPosts.length === 10)
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.message || 'Failed to load your feed.')
      } finally {
        if (!cancelled) {
          setLoading(false)
          setLoadingMore(false)
        }
      }
    }

    fetchFeedPosts()
    return () => {
      cancelled = true
    }
  }, [page])

  const handlePostCreated = (newPost) => {
    setPosts((prev) => [newPost, ...prev])
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
        <p className="text-sm text-gray-400">What&apos;s on your mind? (Composer UI coming soon)</p>
      </div>

      {/* COMPOSER */}
      <PostComposer onPostCreated={handlePostCreated} />

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {loading ? (
          [1, 2, 3].map((n) => (
            <div key={n} className="animate-pulse space-y-4 rounded-lg bg-white p-6 shadow">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/4 rounded bg-gray-200" />
                  <div className="h-3 w-1/6 rounded bg-gray-200" />
                </div>
              </div>
              <div className="h-4 w-full rounded bg-gray-200" />
              <div className="h-4 w-5/6 rounded bg-gray-200" />
            </div>
          ))
        ) : posts.length === 0 ? (
          <div className="rounded-lg border border-gray-100 bg-white py-12 text-center shadow">
            <p className="text-lg font-medium text-gray-500">Your feed is quiet right now.</p>
            <p className="mt-1 text-sm text-gray-400">Follow people to see posts here!</p>
          </div>
        ) : (
          posts.map((post, index) => {
            if (posts.length === index + 1) {
              return (
                <div ref={lastPostElementRef} key={post.id}>
                  <PostCard post={post} />
                </div>
              )
            }
            return <PostCard key={post.id} post={post} />
          })
        )}

        {loadingMore && (
          <div className="flex items-center justify-center py-4">
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Loading more posts...
            </div>
          </div>
        )}
      </div>
    </div>
  )
}