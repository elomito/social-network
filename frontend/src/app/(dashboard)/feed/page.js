'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import PostCard from '@/components/features/posts/PostCard'
import PostComposer from '@/components/features/posts/PostComposer'
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
    <div className="mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-6 px-4 py-6">
      <div className="lg:col-span-2 space-y-6">
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
            <div className="rounded-lg border border-gray-100 bg-white py-12 text-center shadow-sm">
              <p className="text-lg font-medium text-gray-500">Your feed is quiet right now.</p>
              <p className="mt-1 text-sm text-gray-400">Follow people to see posts here!</p>
            </div>
          ) : (
            posts.map((post, index) => {
                if (posts.length === index + 1) {
                  return (
                    <div ref={lastPostElementRef} key={post.id}>
                      <PostCard
                        post={post}
                        onCommentAdded={(postId) => {
                          setPosts((prev) =>
                            prev.map((p) =>
                              p.id === postId
                                ? { ...p, commentsCount: (p.commentsCount || 0) + 1 }
                                : p
                            )
                          )
                        }}
                      />
                    </div>
                  )
                }
                return (
                  <PostCard
                    key={post.id}
                    post={post}
                    onCommentAdded={(postId) => {
                      setPosts((prev) =>
                        prev.map((p) =>
                          p.id === postId
                            ? { ...p, commentsCount: (p.commentsCount || 0) + 1 }
                            : p
                        )
                      )
                    }}
                  />
                )
              })
          )}

          {loadingMore && (
            <div className="flex items-center justify-center py-4">
              <div className="flex items-center gap-2 text-sm text-indigo-600">
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

      <div className="hidden lg:block space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">Requests</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-gray-200 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">Jordan Smith</p>
                  <p className="text-xxs text-gray-400">Follow Request</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button className="rounded-full bg-indigo-50 p-1 text-indigo-600 hover:bg-indigo-100">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                </button>
                <button className="rounded-full bg-gray-50 p-1 text-gray-400 hover:bg-gray-100">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Active Now</h3>
            <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
              ● 12
            </span>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="h-9 w-9 rounded-full bg-gray-200" />
                <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Elena Vance</p>
                <p className="text-xxs text-indigo-600 animate-pulse">Typing...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}